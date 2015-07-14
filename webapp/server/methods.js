
spawn = Npm.require('child_process').spawn;
fs = Npm.require('fs');
Fiber = Npm.require('fibers');

parseTSV = function(filename) {
    console.log("parseTSV", filename);
    try {
        var content = String(fs.readFileSync(filename));
        if (content && content.length >0) {
            var lines = content.split("\n");
            if (lines > 0) {
                var rows = lines
                    .map(function (line) { 
                            var res = line && line.split("\t");
                            return res;
                            })
                    .filter(function (row) { return row != null});
                return rows;
            }
        }
    } catch (err) {
        console.log("parseTSV err", filename, err);
    }
    return [];
}

SafetyFirst = {
  GeneSets: GeneSets,
}

topMutatedGenes = function() {
   var results = Mutations.aggregate(  [
           // { $match: {$not: {sample: {$regex: "LNCAP.*" }}}},
           { $match: 
               { $or: [ 
                    {"MA_FImpact":"medium"},
                    {"MA_FImpact":"high"},
                ]}},
           { $project: { sample:1, Hugo_Symbol: 1}},
           { $group: { _id: "$Hugo_Symbol", coll: { $addToSet: "$sample" } }},
           { $project: { gene: "$_id", coll: "$coll", count: {$size: "$coll" }}},
           { $match: {count: { $gt: 4}}},
           { $sort: {count:-1}},

       ] );
   return results;
};

summarizeVariances = function(collName) {
    var start = new Date();
    var collection = global[collName];
    var exp_curs = collection.find({variance : { $exists: 0}}, {limit: 10});
    var n = 0;
    exp_curs.forEach(function(geneDoc) {
            // if ((n++ % 1000) == 0)
               console.log("summarizeVariances", geneDoc.gene, n);
            var samples = geneDoc.samples;
            var data = Object.keys(samples)
            if (geneDoc.Study_ID == "prad_wcdt")
                data = data.filter(function(sampleName) {
                                    return sampleName.match(/^DTB/);
                                });
            data = data .map(function(sampleName) {
                                return samples[sampleName].rsem_quan_log2;
                            });
            if (data.length > 2) {

                var variance = ss.variance(data);
                var mean = ss.mean(data);

                collection.update({_id: geneDoc._id}, {$set: {
                    mean: { rsem_quan_log2: mean},
                    variance: { rsem_quan_log2: variance}
                }});
            }
           
    });
};


Meteor.methods({

   topMutatedGenes: topMutatedGenes,

    "ttestQuickR" : function(id, whendone) {
        argArray = [process.env.MEDBOOK_SCRIPTS + "ttest.R", id ];
        var shlurp = spawn("/usr/bin/Rscript", argArray);
        var cmd = "/usr/bin/Rscript " +  argArray.join(" ");

        var start = new Date();
        console.log( "ttestQuickR running ", cmd );
        shlurp.on('error', function(error) { console.log(cmd + 'command failed '+error) });
        shlurp.on('close', function(retcode) {
            Fiber(function() {
                console.log('ttestQuick', cmd, "done with code", retcode, new Date() - start);
                if (whendone)
                    whendone("ttestQuickR returned " + retcode);
            }).run();  
        });
        return "ttestQuickR direct return";
    },

   summarizeVariances: summarizeVariances,

   muts: function() {
        var expfile = path.join(workDir, 'expdata.tab')

        console.log('sample list length from study', studyID , Object.keys(sampleList).length )
        console.log('input files', expfile, phenofile)

        var exp_curs = Expression.find({'gene':{$in:gene}}, sampleList);

        //var exp_curs = Expression.find({}, sampleList);
        var fd = fs.openSync(expfile,'w');
        fs.writeSync(fd,'gene\t')
        _.map(sampleList, function(value, key) {
                if (value == 1) {
                        fs.writeSync(fd,key)
                        fs.writeSync(fd,'\t')
                }
        })
        fs.writeSync(fd,'\n')
        console.log('exp count' , exp_curs.count())

    
       var muts = Mutations.aggregate(    [
               { $project: { Hugo_Symbol: 1, sample: 1, MA_FImpact:1}},
               { $match: {MA_FImpact: {$in: ["high","medium", "low"]}}},
               { $group: 
                   { 
                        _id: "$Hugo_Symbol",
                        count: {$sum: 1 },
                    samples : { $addToSet:  "$sample" }
                    } 
                },
                { $sort: { count: -1 }},
            ]);

       var patientMap = {};
       var patientList = [];
       var allKeys = {};
       muts
           .filter(function(d) { return d.samples.length >= 7 }) // could be aggregate finalize method
           .map(function (d) { 
               d.samples.map(function(sampleId) {
                   var patientId = sampleId.substring(0, 7);

                   if (patientId.match(/^DTB/) == null)  // toss out the bad stuff
                      return;

                   var geneId = d._id;
                   if (!(patientId in patientMap)) {
                       var patientRow = {Patient_ID : patientId};
                       patientMap[patientId] = patientRow;
                       patientList.push(patientRow);
                   }
                   var key = geneId + " Mut";
                   allKeys[key] = true;
                   patientMap[patientId][key] = 1;
               });
           });
       // negative case
       Object.keys(allKeys).map(function(geneId) {
            patientList.map(function(patient) {
               var key = geneId + " Mut";
               allKeys[key] = true;
               if (!(geneId in patient))
                    patient[key] = 0;
           });
       });

       console.log("pl -2",patientList.length)

       Contrast.find().forEach(function(con) {
           var name = con.group1 + " vs " +  con.group2;
           if (name[0] == ' ')
              return

           allKeys[name] = true;
           
           console.log("contrast name", name);
           con.list1.map(function(sampleId) {
               var patientId = sampleId.substring(0, 7);
               if (patientId in patientMap)
                   patientMap[patientId][name] = 1;
           });
           con.list2.map(function(sampleId) {
               var patientId = sampleId.substring(0, 7);
               if (patientId in patientMap)
                   patientMap[patientId][name] = 0;
           });
       });
       s = "phenotype";
       var keyList = Object.keys(allKeys).sort();
       keyList.map(function(key) {
           s += "\t" + key;
       });
       s += "\n";
       patientList.map(function(patient) {
           s += patient.Patient_ID;
           keyList.map(function(key) {
               if (key in patient)
                   s += "\t" + patient[key];
                else
                   s += "\t";
           });
           s += "\n";
       });
       fs.writeFile("/tmp/data", s);
       console.log("patients=", patientList.length, "phenotypes=", keyList.length);
   },
});




HTTP.methods({

    genes: function(data){
        var items = [];
        var seen = {}
        Expression.find( {gene: {$regex: "^"+ this.query.q + ".*" }}, { sort: {gene:1 }, fields: {"gene":1 }}).
            forEach(function(f) {
                if (!(f.gene in seen)) {
                    items.push({id: f.gene, text: f.gene});
                    seen[f.gene] = 1;
                }
            });
        items = _.unique(items);
        this.setContentType("application/javascript");
        return JSON.stringify({
            items:items
        });
    },

    quick: function(data){
        var items = [];
        var term = this.query.q;
        var collection = this.query.c;
        var fieldName = this.query.f;
        var fields = {};
        fields[fieldName] = 1;

        GeneSets.find( {name: {$regex: "^"+ term + ".*" }}, { sort: fields, fields: fields}).
            forEach(function(f) {
                items.push({id: f._id, text: f[fieldName]});
            });
        this.setContentType("application/javascript");

        return JSON.stringify({
            items:items
        });
    },
});
