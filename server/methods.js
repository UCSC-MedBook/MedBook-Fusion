
var spawn = Npm.require('child_process').spawn;
var fs = Npm.require('fs');
var Fiber = Npm.require('fibers');

SafetyFirst = {
  GeneSets: GeneSets,
}
Meteor.methods({
    "ttestQuickR" : function(id, whendone) {
        argArray = ["/data/MedBook/MedBook-Fusion/public/ttest.R", id ];
        console.log( "ttestQuickR", argArray );
        var shlurp = spawn("/usr/bin/Rscript", argArray);
		shlurp.on('error', function(error) { console.log('command failed '+error) });
		shlurp.on('close', function(retcode) {
				console.log('ttestQuickR ended with code ' + retcode);
				Fiber(function() {
                                    if (whendone)
					whendone("ttestQuickR returned " + retcode);
				}).run();  
		});
        return "ttestQuickR direct return";
    },
   topMutatedGenes: function() {
       var results = Mutations.aggregate(    [
               { $project: { Hugo_Symbol: 1}},
               { $group: { _id: "$Hugo_Symbol", count: { $sum: 1 } } },
               { $sort: {count:-1}}

           ] );
       results = results
           .slice(0,50)
           .filter(function(d) { return d.count > 4 }) // could be aggregate finalize method
           .map(function (d) { 
               d.Hugo_Symbol = d._id;
               return d;});

       return results;
   },

   summarizeVariances: function(collName) {
        var start = new Date();
        var collection = global[collName];
        var exp_curs = collection.find({variance : { $exists: 0}});
        var n = 0;
        exp_curs.forEach(function(geneDoc) {
                if ((n++ % 1000) == 0)
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


        results = Expression.aggregate([
            {
            $group: {
                    _id: {  gene: "$gene" },
                    variances: {
                        $addToSet: {
                            Study_ID: "$Study_ID",
                            Variance: "$variance",
                        }
                    }
                }
            },
            {
                $match: {
                    'variances.1': {$exists: true}
                }
            },

            {
            $group: {
                    _id: {  summary: "variances", date: new Date() },
                    max: { $max: "$variances"},
                    min: { $min: "$variances"},
                    count: { $sum: 1},
                    data: { $push: {
                        gene: "$_id",
                        variances: "$variances",
                    } }
                }
            },
            // {$out triggers an  out of stack space bug 
        ]);
        results = results[0];
        results.summary = results._id.summary;
        results.date = results._id.date;
        results._id = results.summary + results.date.toString()

        geneMap = {};
        results.data.map(function(elem) {
            var vv = {}
            elem.variances.map(function(v) {
                vv[v.Study_ID] = v.Variance;
            });
            var g = elem.gene.gene.replace(/\./g, "_");
            geneMap[g] = {
                "variances" : vv
            }
        });

        var muts = Mutations.aggregate(    [
               { $project: { Hugo_Symbol: 1}},
               { $group: { _id: {gene: "$Hugo_Symbol"}, count: { $sum: 1 } } },
               { $sort: {count:-1}}
           ]);
        muts.forEach(function(mut) {
            var g = mut._id.gene.replace(/\./g, "_");
            geneMap[g] =  { mutations: { "prad_wcdt": mut.count} };
        });

        var summary = {
            date: new Date(),
            properties: {"variances": Object.keys(geneMap).length },
            data: geneMap
        };



        Summaries.remove({});
        Summaries.insert(summary);

        return results;

    },

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

    
       console.log("muts 1")
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
       console.log("muts 2")
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
       console.log("muts -1")
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

VV = null;

Meteor.startup(function() {
    console.log("before summarizeVariances");
    var d = new Date();
    /*
    Meteor.call("summarizeVariances", "Expression", function(err,result) { 
        VV = result;
        if (err)
            console.log("call summarizeVariances  err =", err, "time=", (new Date() - d)/1000);
        else
            console.log("call summarizeVariances  ok time=", (new Date() - d)/1000)});
            */
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
