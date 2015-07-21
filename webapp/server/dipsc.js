
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
   console.log("snarfing");
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
   console.log("done reading ");
    var e = new Date();
    var t = e - b;
   console.log("done snarfing ", t);
};

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
   DIPSC_coll.update({_id: dipsc_id}, {cmd: cmd, input: {expressionData: expressionData, phenotype: phenotype}});

   // LAUNCH THE PROCESS
   var shlurp = spawn("/bin/env", argArray);

   var start = new Date();
   console.log( "DIPSC running ", cmd );
   shlurp.on('error', function(error) { console.log(cmd + 'command failed '+error) });
   shlurp.on('close', function(retcode) {

   // THE PROCESS IS DONE
   Fiber(function() {
           console.log('DIPSC', cmd, "done executing", retcode, new Date() - start);

          // JOURNAL output after commmand
           DIPSC_coll.update({_id: dipsc_id}, 
               {output: {
                   "status": retcode,
                   correlations: parseTSV(corrFileName),
                   pValues: parseTSV(pValuesFileName),
                   variances: parseTSV(varFileName)}});
           Charts.update({_id: chart_id}, {$push: {dipsc_ids: dipsc_id}}); 
       }).run();  
    } );
} 

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

SHUFFLE_N = 10;

function shufflePlanFor(samplelist) {
    var shufflePlan = DIPSC_coll.findOne({gen: "shufflePlan", samplelist: samplelist}, {_id:1});
    if (shufflePlan == null) {
        var shuffles = [];
        var shuffles = shuffle(samplelist, SHUFFLE_N);
        DIPSC_coll.insert({gen: "shufflePlan", samplelist: samplelist, shuffles: shuffles});
    } else {
        shufflePlan = DIPSC_coll.findOne({gen: "shufflePlan", samplelist: samplelist}, {_id:1});
    }
    return shufflePlan;
}


Meteor.startup(function() {
});

