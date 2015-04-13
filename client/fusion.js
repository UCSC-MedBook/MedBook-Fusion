
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
id_text = function(array) {
    return array.map(function(e) { return { id: e, text: e} });
}

Meteor.startup(function() {
    Meteor.subscribe("GeneSets");

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
            var pvtRenderer =  $('.pvtRenderer').val()
            var pvtAggregator =  $('.pvtAggregator').val()
            console.log("pvtRenderer", pvtRenderer, "pvtAggregator", pvtAggregator);

            var config = chart ? chart.pivotTableConfig : PivotTableInit;
            var keyUnion = {};  
            chartData.map(function(c) { $.extend(keyUnion, c); });
            Object.keys(keyUnion).map(function(k) { keyUnion[k] = "unknown"; });
            chartData = chartData.map(Transform_Clinical_Info, keyUnion);
            var final =  $.extend({}, PivotCommonParams, templateContext, config);
            $(thisTemplate.find(".output")).pivotUI(chartData, final);
        }
        window.forceRedrawChart = drawChart;

        var studies = Session.get("studies");

        if (studies && studies.length > 0 && chart && chart.genelist) {
            var studies = Session.get("studies");
            var expr = null, exprIsoform = null;

            if (chart.genelist) {
                Meteor.subscribe("GeneExpression", studies, chart.genelist);
                Meteor.subscribe("GeneExpressionIsoform", studies, chart.genelist);

                expr = Expression.find({gene: { $in: chart.genelist}});
                exprIsoform = ExpressionIsoform.find({gene: { $in: chart.genelist}});
            }

            var initializiing = true ; // pattern as per http://stackoverflow.com/questions/21355802/meteor-observe-changes-added-callback-on-server-fires-on-all-item
            var obs = {

                added: function(gene) {
                    var gs = gene.samples;
                    var validSampleList = Object.keys(gs).filter(function(k) { 
                            if (k.match(/^DTB-.*$/) || k.match(/^TCGA-.*/)) { 
                                var val = gs[k].rsem_quan_log2;
                                return val != null && !isNaN(val);
                            }
                            return false;
                    });
                    var f = Session.get("samplelist");
                    if (f)  {
                        f = f.split(/[ ,;]/).filter(function(e) { return e.length > 0 });
                        validSampleList = _.intersection(validSampleList, f);
                    }

                    var data = validSampleList.map( function(k) { return parseFloat(gs[k].rsem_quan_log2) });
                    var m = ss.mean(data);
                    var sd = ss.standard_deviation(data);

                    var cls = {}
                    validSampleList.map(function(k){
                        cls[k] = parseFloat(gs[k].rsem_quan_log2)
                        /*
                        var z = ss.z_score(parseFloat(gs[k].rsem_quan_log2), m, sd);
                        cls[k] =  z; // Zclass(z);
                        */
                    });

                    chartData.map(function(sample) {
                        if (sample.Sample_ID in cls) {
                            var s = gene.gene;

                            if ('transcript' in gene) {
                                s += ' ' + gene['transcript'];
                            } else
                                s += ' Expr';
                            
                            sample[s] = cls[sample.Sample_ID];
                        }
                    if (window.TCD) window.clearTimeout(window.TCD);
                    window.TCD = setTimeout(drawChart, 200);
                    });
                 }};
             if (expr)
                 expr.observe(obs);
             if (exprIsoform)
                 exprIsoform.observe(obs);
             initializing = false;
        } else 
            drawChart();
     });
}

Template.PivotTable.rendered =( function() {
    PivotTableRender(this);
})


Template.Controls.helpers({
   genesets : function() {
      return GeneSets.find({}, {sort: {"name":1}});
   },
   studies : function() {
      return Studies.find({}, {sort: {"name":1}});
   }
})

Template.Controls.events({
   'change #studies' : function(evt, tmpl) {
       var s = $("#studies").select2("val");
       Session.set("studies", s);
       updateChartDocument();
   },
   'change #samplelist' : function(evt, tmpl) {
       var s = $("#samplelist").val();
       Session.set("samplelist", s);
       updateChartDocument();
   },

   'change #genesets' : function(evt, tmpl) {
       var val = $(evt.target).val();
       var gs = GeneSets.findOne({name: val});
       if (gs) {
           var $genelist = $("#genelist");
           var before = $genelist.select2("val");
           var after = before.concat(gs.members);
           $genelist.select2("data", after.map(function(e) { return { id: e, text: e} }));
           updateChartDocument();
       }
   },

   'click #clear' : function(evt, tmpl) {
       var $genelist = $("#genelist");
       $genelist.select2("data", [] );
       updateChartDocument();
       forceRedrawChart();

   }
})

function updateChartDocument() {
    var genelist = $("#genelist").select2("val");
    var studies = Session.get("studies");
    var samplelist = Session.get("samplelist");

    if (studies && studies.length > 0 && genelist && genelist.length > 0) {
        Meteor.subscribe("GeneExpression", studies, genelist);
        Meteor.subscribe("GeneExpressionIsoform", studies, genelist);
    }
    var prev = Charts.findOne({ userId : Meteor.userId() });
    Charts.update({ _id : prev._id }, {$set: {studies: studies,  samplelist: samplelist, genelist: genelist}});
 }


Template.Controls.rendered =(function() {
     $("#studies").select2( {
       placeholder: "Select one ore more studies",
       allowClear: true
     } );

     var prev = Charts.findOne({ userId : Meteor.userId() });

     var $samplelist = $("#samplelist");
     $samplelist.val(prev.samplelist);
     Session.set("samplelist", prev.samplelist);

     var $studies = $("#studies");
     $studies.select2("data",  id_text(prev.studies));
     Session.set("studies", prev.studies);

     var $genelist = $("#genelist");
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
            results: function (data, page, query) { return { results: data.items }; },
            cache: true
          },
          escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
          minimumInputLength: 2,
      });
     if (prev && prev.genelist)
         $genelist.select2("val", prev.genelist );
     $genelist.on("change", updateChartDocument)
     $samplelist.on("change", updateChartDocument)
     $studies.on("change", updateChartDocument)
});

