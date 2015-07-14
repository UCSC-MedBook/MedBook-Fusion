DIPSC_runs = new Meteor Collection("DIPSC");

dipsc = function(chart_id) { 
   console.log("dipsc", chart_id);
   var quickR_id = DIPSC_runs.insert({chart_id: chart_id});
   var dir = process.env.MEDBOOK_WORKSPACE + "DIPSC/";
   try {
       var m = fs.mkdirSync(dir);
   } catch (err) {};

   dir +=  quickR_id + "/";
   var m = fs.mkdirSync(dir);
   var pheFileName = dir + "phenotype.tab";
   var exprFileName = dir + "expression.tab";
   var corrFileName = dir + "correlations.tab";
   var pValuesFileName = dir + "pValues.tab";
   var varFileName = dir + "variances.tab";

   // PHENOTYPE CLINCIAL
   var chart = Charts.findOne({_id: chart_id}, {fields: {chartData:1, selectedFieldNames:1}});
   // PHENOTYPE MUTATIONS
   var topMuts = topMutatedGenes();
   var selectedFieldNames = chart.selectedFieldNames;
   selectedFieldNames.unshift("Sample_ID");
   topMuts.map(function whenDone(mut) {
       var field = mut.gene + "_MUT";
       selectedFieldNames.push(field);
       var geneMap = {};
       mut.coll.map(function(sample) {
           geneMap[sample] = true;
       });
       chart.chartData.map(function(patient)  {
           patient[field] = patient.Sample_ID in geneMap ? 1 : 0;
       });
   }); /// topMuts
   var phenotype = ConvertToTSV(chart.chartData, selectedFieldNames);
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
   DIPSC_runs.update({_id: quickR_id}, {cmd: cmd, input: {expressionData: expressionData, phenotype: phenotype}});

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
           DIPSC_runs.update({_id: quickR_id}, 
               {output: {
                   "status": retcode,
                   correlations: parseTSV(corrFileName),
                   pValues: parseTSV(pValuesFileName),
                   variances: parseTSV(varFileName)}});
       }).run();  
    } );
} 

Meteor.methods({
   dipsc : dipsc,
});

