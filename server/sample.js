var extend = Meteor.npmRequire('node.extend');

// The "this" object has to be the default dictonary of all possible keys.
function Transform_Clinical_Info(f) {
    delete f["_id"];
    // delete f["Sample_ID"];
    // delete f["Patient_ID"];
    delete f["On_Study_Date"];
    delete f["Off_Study_Date"];

    /*
    var on = f["On_Study_Date"];
    var off = f["OffStudy_Date"];
    if (off == null)
        off = Date.now();

    if (off && on)
        f["Days_on_Study"] = (off - on) / 86400000;

    delete f["On_Study_Date"];
    delete f["Off_Study_Date"];
    */


    // Make sure that 
    Object.keys(this).map(function(k) {
        if  (f[k] == null) {
            f[k] = this[k];
        }
    });


    /*
    if  (f["Abiraterone"] == null)
        f["Abiraterone"] = "unknown";

    if  (f["Enzalutamide"] == null)
        f["Enzalutamide"] = "unknown";

    if  (f["biopsy_site"] == null)
        f["biopsy_site"] = "unknown";

    if  (f["site"] == null)
        f["site"] = "unknown";

    if  (f["Days_on_Study"] == null)
        f["Days_on_Study"] = "unknown";


    if  (f["biopsy_site"] == null)
        f["biopsy_site"] = "unknown";

    if  (f["age"] == null)
        f["age"] = "unknown";

    if (f["Reason_for_Stopping_Treatment"] == null)
        f["Reason_for_Stopping_Treatment"] = "unknown";
    */

    delete f["Death on study"];


    var r = f.Reason_for_Stopping_Treatment;
    if (r == null) r =  "n/a";
    else if (r.indexOf("unknown") >= 0) r =  "n/a";
    else if (r.indexOf("Adverse") >= 0) r =  "AE";
    else if (r.indexOf("Complet") >= 0) r =  "Complete";
    else if (r.indexOf("complet") >= 0) r =  "Complete";
    else if (r.indexOf("Death") >= 0) r =  "Death";
    else if (r.indexOf("Progress") >= 0) r =  "Progression";
    else if (r.indexOf("progress") >= 0) r =  "Progression";
    else if (r.indexOf("withdraw") >= 0) r =  "Withdraw";
    else if (r.indexOf("Discretion") >= 0) r =  "Discretion";
    f.Reason_for_Stopping_Treatment = r;
    
    var t = f["treatment_for_mcrpc_prior_to_biopsy"];
    if (t) {
        var abi = t.indexOf("Abiraterone") >= 0 ;
        var enz = t.indexOf("Enzalutamide") >= 0 ;
        if (abi && !enz) t = "Abi";
        else if (!abi && enz) t = "Enz";
        else if (abi && enz) t = "Abi-Enz";
        else if (!abi && !enz) t = "Chemo";
        else t =  "unknown";
    } else 
        t =  "unknown";

    f["treatment_prior_to_biopsy"] = t;
    delete f["treatment_for_mcrpc_prior_to_biopsy"];

    f["timepoint"] = "baseline";
    if ( f.Sample_ID.match(/^DTB-\d\d\dPro/)) // DTB Hack
        f["timepoint"] = "progression";


    Object.keys(f).map(function(k) {
        if (f[k] == null)
           f[k] = "N/A";
    });


    return f;
};


Meteor.methods( { 
    renderChartData : function(ChartDocument) {
        // var ChartDocument = Charts.findOne(_id == null ? { userId : Meteor.userId() } : { _id:_id});
        var q = ChartDocument.samplelist == null || ChartDocument.samplelist.length == 0 ? {} : {Sample_ID: {$in: samplelist}};
        q.Study_ID = {$in:ChartDocument.studies}; 
        var chartData = Clinical_Info.find(q).fetch();

        var chartDataMap = {};
        chartData.map(function (cd) { 
            delete cd["_id"];
            chartDataMap[cd.Sample_ID] = cd;
        });
        chartData.sort( function (a,b) { return a.Sample_ID.localeCompare(b.Sample_ID)});
        ChartDocument.samplelist = chartData.map(function(ci) { return ci.Sample_ID })
            
        // Join all the Gene line information into the samples into the ChartDataMap table
        GeneLikeDataDomainsPrototype.map(function(domain) {
            var gld = ChartDocument.geneLikeDataDomain;
            if (gld) {
                gld.map(function(geneData) {

                    // Mutations is organized differently than Expression
                    if (geneData.Hugo_Symbol) { 
                        var geneName = geneData.Hugo_Symbol;
                        var label = geneName + ' ' + domain.labelItem;
                        var sampleID = geneData.sample;
                        if (sampleID in chartDataMap)
                            chartDataMap[sampleID][label] = geneData.Variant_Type;

                    } else if (geneData.gene) {
                        var geneName = geneData.gene;
                        var label = ('transcript' in geneData) 
                            ? geneName + ' ' + geneData.transcript + ' ' + domain.labelItem
                            : geneName + ' ' + domain.labelItem
                        var samplelist =  _.intersection( ChartDocument.samplelist, Object.keys(geneData.samples) );
                        samplelist.map(function (sampleID) {
                            var f = parseFloat(geneData.samples[sampleID][domain.field]);
                            if (!isNaN(f)) {
                                if (sampleID in chartDataMap)
                                    chartDataMap[sampleID][label] = f;
                            }
                        });
                    }
                });
            }
        }); // GeneLikeDataDomainsPrototype.map

        function Join(datum, joinKey, dataMap) {
            if (joinKey in datum && datum[joinKey] in dataMap)
                extend(datum, dataMap[ datum[joinKey] ]);
        }

        var keyUnion = {};  
        chartData.map(function(datum) { 
            if (ChartDocument.aggregatedResults) {
                Join(datum, "Sample_ID", ChartDocument.aggregatedResults.chartData_map_Sample_ID);
                Join(datum, "Patient_ID", ChartDocument.aggregatedResults.chartData_map_Patient_ID);
            }
            extend(keyUnion, datum);
        });

        Object.keys(keyUnion).map(function(k) { keyUnion[k] = "unknown"; });
        chartData = chartData.map(Transform_Clinical_Info, keyUnion);

        var transforms = ChartDocument.transforms;
        if (transforms)
             chartData.map(function transformer(datum) {
                 transforms.map(function(transform) {
                     if (transform.field in datum) {
                        if (transform.op == "bin") {
                             var dataValue = parseFloat(datum[transform.field]);
                             var binValue = parseFloat(transform.value);
                             if (!isNaN(dataValue) && !isNaN(binValue)) {
                                var flooredValue = Math.floor(dataValue / binValue);
                                datum[transform.field] = flooredValue * binValue;
                             }
                         } else if (transform.op == "rename") {
                            datum[transform.value] = datum[transform.field];
                            delete datum[transform.field];
                         }
                     } 
                 });
            });
          // Charts.update({ _id : ChartDocument._id }, {$set: {chartData: chartData}});
          return chartData;
    } // renderChartData
});
