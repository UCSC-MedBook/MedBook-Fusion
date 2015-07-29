
HTTP.methods({
 hello: function(data){
    var response = "hello world\n";
    this.setStatusCode(200)
    return response;
 }
});

DIPSC_coll._ensureIndex({gen:1});


dipsc_usecase = function() {
    DIPSC_coll.find({gen: "correlation", phenotype:"high_psa"})
}

dipsc_correlate = function(shufflePlan, phe1, phe2) {
    return DIPSC_coll.find({gen: "correlation", phenotype:"high_psa"})
}


dipsc_incremental = function(chart_id) {
   var dipsc_id = DIPSC_coll.insert({chart_id: chart_id, gen: "incremental"});
   var chart = getPhe(chart_id);
   var shufflePlan = shufflePlanFor(samplelist);

   getCorrelation(shufflePlan, chart);
}

function getPhe(chart_id) {
   // PHENOTYPE CLINCIAL
   var chart = Charts.findOne({_id: chart_id}, {fields: {"chartData":1, selectedFieldNames:1}});

   // PHENOTYPE MUTATIONS
   var topMuts = topMutatedGenes();
   chart.selectedFieldNames.unshift("Sample_ID");


   chart.samplelist = _.pluck(chart.chartData, "Sample_ID");


   topMuts.map(function whenDone(mut) {
       var field = mut.gene + "_MUT";
       chart.selectedFieldNames.push(field);
       var geneMap = {};
       mut.coll.map(function(sample) {
           geneMap[sample] = true;
       });
       chart.chartData.map(function(patient)  {
           patient[field] = patient.Sample_ID in geneMap ? 1 : 0;
       });
   }); /// topMuts
   return chart;
}

dipsc_snarf = function(dipsc_id) {
   var b = new Date();
   // console.log("snarfing");
   var dir = process.env.MEDBOOK_WORKSPACE + "DIPSC/";
   dir +=  dipsc_id + "/";

   var corrFileName = dir + "correlations.tab";
   var pValuesFileName = dir + "pValues.tab";
   var varFileName = dir + "variances.tab";

  // JOURNAL output after commmand
   DIPSC_coll.upsert({_id: dipsc_id}, 
       {output: {
           "status": 0,
           correlations: parseTSV(corrFileName),
           pValues: parseTSV(pValuesFileName),
           variances: parseTSV(varFileName)}});
   // console.log("done reading ");
    var e = new Date();
    var t = e - b;
   // console.log("done snarfing ", t);
};

decrement = function(query) {
    return DIPSC_coll.findAndModify({
        query:  query,
        update: {$inc: {count: -1}},
        fields: {_id:1, count: 1},
    });
}


dipsc_classic = function(chart_id) { 
   var dipsc_id = DIPSC_coll.insert({chart_id: chart_id, gen: "classic"});
   var dir = process.env.MEDBOOK_WORKSPACE + "DIPSC/";
   try {
       var m = fs.mkdirSync(dir);
   } catch (err) {};

   dir +=  dipsc_id + "/";
   var m = fs.mkdirSync(dir);
   var pheFileName = dir + "phenotype.tab";
   var exprFileName = dir + "expression.tab";
   var corrFileName = dir + "correlations.tab";
   var pValuesFileName = dir + "pValues.tab";
   var varFileName = dir + "variances.tab";

   var chart = getPhe(chart_id);
   var phenotype = ConvertToTSV(chart.chartData, chart.selectedFieldNames);
   phenotype = phenotype.replace(/N\/A/g, "");
   fs.writeFile(pheFileName, phenotype);

   // EXPRESSION
   var expressionData = [];
   Expression.find({ "Study_ID" : "prad_wcdt" }, 
       {fields: {"gene":1, "samples":1, "variance":1},
        limit: 100,
        sort: { "variance.rsem_quan_log2" : -1} })
   .forEach(function (e) { 

       var row = e.samples;
       var newRow = {};
       Object.keys(row)
           .filter(function(Sample_ID) { return Sample_ID.match(/DTB-.*/) != null; })
           .map(function(Sample_ID) { newRow[Sample_ID] = row[Sample_ID].rsem_quan_log2 })
       newRow.gene = e.gene;
       if (e.variance) {
           expressionData.push(newRow);
       }
   });

   var keys = Object.keys(expressionData[0]).sort();
   var g = keys.indexOf("gene"); // move gene name to front
   keys.splice(g, 1);
   keys.unshift("gene"); 

   var expressionText = ConvertToTSV(expressionData, keys);
   fs.writeFile(exprFileName, expressionText);

   // JOURNAL input before command
   var  argArray = [process.env.MEDBOOK_SCRIPTS + "MedBookClientServer2.py", 
        "DIPSC", 500, pheFileName, exprFileName, corrFileName, pValuesFileName, varFileName ];

   var cmd =  argArray.join(" ");
   DIPSC_coll.update({_id: dipsc_id}, {$set: {cmd: cmd, input: {expressionData: expressionData, phenotype: phenotype}}});

   // LAUNCH THE PROCESS
   var shlurp = spawn("/bin/env", argArray);

   var start = new Date();
   // console.log( "DIPSC running ", cmd );
   shlurp.on('error', function(error) { console.log(cmd + 'command failed '+error) });
   shlurp.on('close', function(retcode) {

   // THE PROCESS IS DONE
   Fiber(function() {
           console.log('DIPSC', cmd, "done executing", retcode, new Date() - start);

          // JOURNAL output after commmand
          if (retcode == 0) {
               DIPSC_coll.update({_id: dipsc_id}, 
                   {$set:
                      {ready : true,
                       output: {
                           "status": retcode,
                           correlations: parseTSV(corrFileName),
                           pValues: parseTSV(pValuesFileName),
                           variances: parseTSV(varFileName)}}});

           } else
               DIPSC_coll.update({_id: dipsc_id}, 
                   {$set:
                       {output: { "status": retcode }}});


           // Charts.update({_id: chart_id}, {$push: {dipsc_ids: dipsc_id}}); 
       }).run();  
    } );
} 
nextOp = function(id) {
    var query = { op: {$exists:1}, ready:false};
    if (id) {
        query.operands = id;
    }
     var cursor = DIPSC_coll.find(query);
     // console.log("nextOp", query, cursor.count());
     cursor.forEach(function (corr) {
        var operands = DIPSC_coll.find({_id: {$in: corr.operands}, ready:true  }).fetch();
        if (operands.length  == corr.operands.length) {



            if (corr.op == "correlate") {
                console.log("correlate op", corr._id);
                var correlation = correlateDscore(operands[0], operands[1]);
                DIPSC_coll.update({ _id: corr._id}, {$set: { ready: true, correlation: correlation,
                    positiveNs: [ operands[0].output.positiveN, operands[0].output.positiveN],
                    negativeNs: [ operands[0].output.negativeN, operands[0].output.negativeN],
                }});
                // console.log("correlate after update", new Date() - corr.date, corr.op );

            } else if (corr.op == "aggregation") {
                var correlations = [];
                var p_values = [];
                var positiveNs = [];
                var negativeNs = [];
                operands.map(function(correlation) {
                    correlations.push(correlation.correlation.correlation);
                    p_values.push(correlation.correlation.p_value);
                    positiveNs = positiveNs.concat(correlation.positiveNs);
                    negativeNs = negativeNs.concat(correlation.negativeNs);
                });

                DIPSC_coll.update({ _id: corr._id}, {$set: { ready: true, 
                    correlation: ss.mean(correlations),
                    variance:  ss.variance(correlations),
                    p_value:   ss.mean(p_values),
                    positiveN: ss.mean(positiveNs),
                    negativeN: ss.mean(negativeNs),
                }});
                console.log("TOTAL TIME", new Date() - START);
            }
        }
    }) // foreach operand;
}

function DIPSC_update(userId, doc, fieldNames, modifier, options) {
    if (_.contains(fieldNames, "ready")) {
        // console.log("update", doc.gen, fieldNames, Object.keys(doc));
        nextOp(doc._id);
    } // ready
}; 

DIPSC_coll.after.update(DIPSC_update, {$set: {fetchPrevious: false}});

Meteor.methods({
   // dipsc : dipsc,
   snarf : dipsc_snarf
});

function shuffle(a, n)  {
    var random = Random(Random.engines.mt19937().seed(123));
    return _.times(n, function() {
        return random.shuffle(_.clone(a));
    });
}

SHUFFLE_N = 100;

function shufflePlanFor(samplelist) {
    var shufflePlan = DIPSC_coll.findOne({gen: "shufflePlan", samplelist: samplelist}, {_id:1});
    if (shufflePlan == null) {
        var shuffles = [];
        var shuffles = shuffle(samplelist, SHUFFLE_N);
        DIPSC_coll.insert({gen: "shufflePlan", ready: true, samplelist: samplelist, shuffles: shuffles});
    } else {
        shufflePlan = DIPSC_coll.findOne({gen: "shufflePlan", samplelist: samplelist}, {_id:1});
    }
    return shufflePlan;
}


Meteor.startup(function() {
});


SAM_classic = function(chart_id, phenotype, phenotypeMap, sampleList, geneList,expressionData ) { 

   sampleList = _.intersection(sampleList, Object.keys(expressionData[0]));

   var dipsc_id = DIPSC_coll.insert({
       gen: "sam_classic",
       ready: false,
       input: {chart_id: chart_id, phenotype:phenotype, sampleList:sampleList, geneList: geneList, phenotypeMap: phenotypeMap}});

   var dir = process.env.MEDBOOK_WORKSPACE + "SAM/";
   try {
       var m = fs.mkdirSync(dir);
   } catch (err) {};

   dir +=  dipsc_id + "/";
   var m = fs.mkdirSync(dir);
   var samInputFileName = dir + "sam.input";
   var samOutputFileName = dir + "sam.output";
   var samErrorFileName = dir + "sam.error";

   var fd = fs.openSync(samInputFileName, "w");
   var positiveN = 0;
   var negativeN = 0;
   sampleList.map(function(sample) {
       if (phenotypeMap[sample]) {
           fs.writeSync(fd, "\t1");
           positiveN++;
       } else {
           fs.writeSync(fd, "\t0");
           negativeN++;
       }
   });
   // console.log("positiveN", positiveN, "negativeN", negativeN);


   fs.writeSync(fd, "\n");
   expressionData.map(function(expr) {
       fs.writeSync(fd, expr.gene);
       sampleList.map(function(sample) {
           fs.writeSync(fd, "\t"+expr[sample]);
       });
       fs.writeSync(fd, "\n");
   });
   fs.close(fd);


   var  argArray = [process.env.MEDBOOK_SCRIPTS + "fileSAM.R", samInputFileName ];
   var cmd =  argArray.join(" ");
   // console.log("cmd", cmd);

   // LAUNCH THE PROCESS
   var shlurp = spawn("/bin/env", argArray, {
      stdio: [
          0, // use parents stdin for child
          fs.openSync(samOutputFileName, "w"),
          fs.openSync(samErrorFileName, "w")
   ]});


   var start = new Date();
   shlurp.on('error', function(error) { console.log(cmd + 'command failed '+error) });
   shlurp.on('close', function(retcode) {

   // THE PROCESS IS DONE
   Fiber(function() {

           var samOutput = parseSAM(samOutputFileName);
           samOutput.sort(function(a,b) { return a.gene.localeCompare(b.gene) });
           var d_score = _.pluck(samOutput, "d_score");

          // JOURNAL output after commmand
          if (retcode == 0)
             DIPSC_coll.update({_id: dipsc_id}, 
               {$set: 
                  {ready : true,
                   output: {
                       "status": retcode,
                       samOutput : samOutput,
                       d_score: d_score,
                       positiveN: positiveN,
                       negativeN: negativeN
                       }}});
           else
               DIPSC_coll.update({_id: dipsc_id}, 
                   {$set:
                       {output: { "status": retcode }}});

           // console.log('SAM_classic done', cmd, phenotype, "done executing", retcode, new Date() - start);
       }).run();  
    } );

   return dipsc_id;

} // SAM_classic

SAM = function() {
    START = new Date();
    DIPSC_coll.remove({});

    var chart_id = "2vv6AbPtx7xfXPFu3";
    var abi_phe =  "Abiraterone";
    var enz_phe =  "Enzalutamide";

    var chart = Charts.findOne({_id: chart_id});
    var abi_phenotypeMap = {};
    var enz_phenotypeMap = {};
    var sampleList = []
    chart.chartData.map(function(o) {
        if (o[abi_phe]) {
            sampleList.push(o.Sample_ID);
            abi_phenotypeMap[o.Sample_ID] = o[abi_phe] == "Resistant";
        }
        if (o[enz_phe]) {
            sampleList.push(o.Sample_ID);
            enz_phenotypeMap[o.Sample_ID] = o[enz_phe] == "Resistant";
        }
    });

   // EXPRESSION
   var expressionData = [];
   var geneList = [];
   Expression.find({ "Study_ID" : "prad_wcdt" }, 
       {fields: {"gene":1, "samples":1, "variance":1},
        limit: 500,
        sort: { "variance.rsem_quan_log2" : -1} })
   .forEach(function (e) { 
       geneList.push(e.gene);

       var row = e.samples;
       var newRow = {};
       Object.keys(row)
           .filter(function(Sample_ID) { return Sample_ID.match(/DTB-.*/) != null; })
           .map(function(Sample_ID) { newRow[Sample_ID] = row[Sample_ID].rsem_quan_log2 })
       newRow.gene = e.gene;
       if (e.variance) {
           expressionData.push(newRow);
       }
   });
  var shuffles = shuffle(sampleList, SHUFFLE_N );

  var operands = [];
  shuffles.map(function(shuffledSampleList) {
      var half =  shuffledSampleList.length / 2;
      var first = shuffledSampleList.slice(0, half);
      var second = shuffledSampleList.slice(half);


      var a_sam_id  = SAM_classic(chart_id, abi_phe, abi_phenotypeMap, first, geneList,expressionData);
      var b_sam_id  = SAM_classic(chart_id, enz_phe, enz_phenotypeMap, second, geneList,expressionData);
      var aa_sam_id = SAM_classic(chart_id, abi_phe, abi_phenotypeMap, second, geneList,expressionData);
      var bb_sam_id = SAM_classic(chart_id, enz_phe, enz_phenotypeMap, first, geneList,expressionData);

      var ab   = DIPSC_coll.insert({op: "correlate", ready: false, date: new Date(), operands: [a_sam_id, b_sam_id],   count:2 });
      var aabb = DIPSC_coll.insert({op: "correlate", ready: false, date: new Date(), operands: [aa_sam_id, bb_sam_id], count:2 });
      console.log("correlate", ab, a_sam_id, b_sam_id);
      console.log("correlate", aabb, aa_sam_id, bb_sam_id);
      operands.push(ab);
      operands.push(aabb);
  });

  DIPSC_coll.insert({op: "aggregation", ready: false, date: new Date(), operands: operands, count: operands.length });


} // SAM

parseSAM = function(filename) {
        var content = fs.readFileSync(filename, { encoding: "utf8"});
        if (content && content.length > 0) {
            var lines = content.split("\n");
            if (lines.length > 0) {
                var rows = lines
                    .filter(function (l, i) { return l.length > 0 && i > 0 } )
                    .map(function (line) {
                            var res = line && line.split("\t");
                            var d_score = parseFloat(res[1]);
                            return  {
                                gene: res[0], 
                                d_score: parseFloat(res[1]),
                                false_calls: parseFloat(res[2]),
                                q_value: parseFloat(res[3]),
                                p_value: parseFloat(res[4]),
                                std_dev: parseFloat(res[5])};
                            })
                return rows;
            } 
        }
    return [];
}

correlateDscore = function(a, b) {
    console.log('correlateDscore("', a._id, '","', b._id, '")');

    var z = a.output.d_score.map(function(a, i) { return [a, b.output.d_score[i]] });
    res = regression('linear', z)
    return res;

}


Meteor.startup(SAM);


