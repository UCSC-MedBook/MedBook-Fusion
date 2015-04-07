
function valueIn(field, value) {
    return function(mp) {
        var t =  mp[field];
        if (t)
            return t.indexOf(value) >= 0 ? value : "";
        return "";
    }
}
var PivotTableInit = {
    cols: ["treatment_prior_to_biopsy"], rows: ["biopsy_site"],

    rendererName: "Bar Chart",
};

Meteor.startup(function() {
    var derivers = $.pivotUtilities.derivers;
    var renderers = $.extend($.pivotUtilities.renderers, $.pivotUtilities.gchart_renderers);

    window.PivotCommonParams = {
        renderers: renderers,
        derivedAttributes: {
            "Age Bin": derivers.bin("age", 10),


            // "Abiraterone": valueIn("treatment_for_mcrpc_prior_to_biopsy", "Abiraterone"),
            // "Enzalutamide": valueIn("treatment_for_mcrpc_prior_to_biopsy", "Enzalutamide"),
        },
        hiddenAttributes: [ "_id", "Patient_ID", "Sample_ID"] 
    };


    /*
    if (Charts.find({ userId: Meteor.userId() }).count() == 0 ) {
        var chart = { pivotTableConfig: PivotTableInit }; 
        Charts.insert(chart);
    };

    Tracker.autorun(function() {
        Session.set("ChartData", Clinical_Info.find().fetch().map(Transform_Clinical_Info));
    });
    */

});

// The "this" object has to be the default dictonary of all possible keys.
function Transform_Clinical_Info(f) {
    delete f["_id"];
    // delete f["Sample_ID"];
    // delete f["Patient_ID"];
    delete f["On_Study_Date"];
    delete f["Off_Study_Date"];

    var on = f["On_Study_Date"];
    var off = f["OffStudy_Date"];
    if (off == null)
        off = Date.now();

    if (off && on)
        f["Days_on_Study"] = (off - on) / 86400000;

    delete f["On_Study_Date"];
    delete f["Off_Study_Date"];


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

    Object.keys(f).map(function(k) {
        if (f[k] == null)
           f[k] = "N/A";
    });

    return f;
};

Zclass = function(x) {
    if (x >= 2)
        return "2z";
    if (x >= 1)
        return "1z";
    if (x  < 1 && x > -1) return "near mean";
    if (x  < -1 && x > -2) return "-1z";
    if (x  < -2)  return "-2z";
}



function PivotTableRender(thisTemplate) {
    Tracker.autorun(function(){
         templateContext = { 
            onRefresh: function(config) {
                var prev = Charts.findOne({ userId : Meteor.userId() });
                var save = { cols: config.cols, rows: config.rows,
                    aggregatorName: config.aggregatorName,
                    rendererName: config.rendererName,
                };
                if (prev)
                    Charts.update({ _id : prev._id }, {$set: {pivotTableConfig: save}});
                else
                    Charts.insert({ userId : Meteor.userId(), pivotTableConfig: save});
            }
        }
        var chartData = Clinical_Info.find().fetch();

        var chart = Charts.findOne({userId: Meteor.userId()});


// Join the gene expression data into the chartData 
        function drawChart() {
            var config = chart ? chart.pivotTableConfig : PivotTableInit;
            var keyUnion = {};  
            chartData.map(function(c) { $.extend(keyUnion, c); });
            Object.keys(keyUnion).map(function(k) { keyUnion[k] = "unknown"; });
            chartData = chartData.map(Transform_Clinical_Info, keyUnion);
            var final =  $.extend({}, PivotCommonParams, templateContext, config);
            $(thisTemplate.find(".output")).pivotUI(chartData, final);
        }
        if (chart && chart.genelist) {
            Meteor.subscribe("GeneExpression", "prad_wcdt", chart.genelist);

            var expr = Expression.find({gene: { $in: chart.genelist}});
            expr.observe({added: function(gene) {
                var gs = gene.samples;

                var validSampleList = Object.keys(gs).filter(function(k) { 
                        if (k.match(/^DTB-.*$/)) { 
                            var val = gs[k].rsem_quan_log2;
                            return val != null && !isNaN(val);
                        }
                        return false;
                });
                debugger;

                var data = validSampleList.map( function(k) { return parseFloat(gs[k].rsem_quan_log2) });
                var m = ss.mean(data);
                var sd = ss.standard_deviation(data);

                var cls = {}
                validSampleList.map(function(k){
                    var z = ss.z_score(parseFloat(gs[k].rsem_quan_log2), m, sd);
                    cls[k] =  z; // Zclass(z);
                });

                chartData.map(function(sample) {
                    if (sample.Sample_ID in cls) {
                        sample[gene.gene + " Expr"] = cls[sample.Sample_ID];
                    }
                });
                drawChart();
             }});
        } else 
            drawChart();
     });
}

Template.PivotTable.rendered = function() {
    PivotTableRender(this);
}

Template.PivotTable.helpers = {
    force : function() {
        PivotTableRender(this);
        return true;
   }
}




Template.Controls.rendered = function() {
     // genes = Expression.find({}, { sort: {gene:1 }, fields: {"gene":1 }})
     var $genelist = $("#genelist");
     var prev = Charts.findOne({ userId : Meteor.userId() });

     $genelist.select2({
          initSelection : function (element, callback) {
            if (prev && prev.genelist)
                callback( prev.genelist.map(function(g) { return { id: g, text: g }}) );
          },
          multiple: true,
          ajax: {
            url: "/fusion/genes",
            dataType: 'json',
            delay: 250,
            data: function (term) {
              var qp = {
                q: term
              };
              return qp;
            },
            results: function (data, page, query) {
              // parse the results into the format expected by Select2.
              // since we are using custom formatting functions we do not need to
              // alter the remote JSON data
              return {
                  results: data.items
              };
            },
            cache: true
          },
          escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
          minimumInputLength: 2,
      });
     if (prev && prev.genelist)
         $genelist.select2("val", prev.genelist );
     $genelist.on("change", function() {
        var genelist =  $(this).select2("val");
        Meteor.subscribe("GeneExpression", "prad_wcdt", genelist);
        Charts.update({ _id : prev._id }, {$set: {genelist: genelist}});
     });
};

