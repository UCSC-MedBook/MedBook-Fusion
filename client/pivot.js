
function valueIn(field, value) {
    return function(mp) {
        var t =  mp[field];
        if (t)
            return t.indexOf(value) >= 0 ? value : "";
        return "";
    }
}
valueIn("treatment_for_mcrpc_prior_to_biopsy", "Abiraterone");



Template.PivotTable.rendered = function() {
    Tracker.autorun(function() {

        var derivers = $.pivotUtilities.derivers;
        var renderers = $.extend($.pivotUtilities.renderers, $.pivotUtilities.gchart_renderers);

        // CRFmetadataCollection.findOne("Clinical_Info");

        var mps = Clinical_Info.find().fetch().map(function(f) {
            delete f["_id"];
            delete f["Sample_ID"];
            delete f["Patient_ID"];
            return f;
        });


        $("#output").pivotUI(mps, {
            renderers: renderers,
            derivedAttributes: {
            /*
                "Age Bin": derivers.bin("Age", 10),
                "Gender Imbalance": function(mp) {
                    return mp["Gender"] == "Male" ? 1 : -1;
                }
            */
                Reason_for_Stopping_Treatment: function(mp) {
                    return mp.Reason_for_Stopping_Treatment ? mp.Reason_for_Stopping_Treatment  : "unknown";
                },
                "Abiraterone": valueIn("treatment_for_mcrpc_prior_to_biopsy", "Abiraterone"),
                "Enzalutamide": valueIn("treatment_for_mcrpc_prior_to_biopsy", "Enzalutamide"),
                "treatment": function(mp) {
                    var t =  mp["treatment_for_mcrpc_prior_to_biopsy"];
                    if (t) {
                        var abi = t.indexOf("Abiraterone") >= 0 ;
                        var enz = t.indexOf("Enzalutamide") >= 0 ;
                        if (abi && !enz) return "Abi";
                        if (!abi && enz) return "Enz";
                        if (abi && enz) return "Abi-Enz";
                        if (!abi && !enz) return "Chemo";
                    }
                    return "unknown";
                },
            },
            hidden_attributes: ["Sample_ID", "Patient_ID"],
            cols: ["treatment"], rows: ["biopsy_site"],
            rendererName: "Bar Chart",
            onRefresh: function(config) {
                        var config_copy = JSON.parse(JSON.stringify(config));
                        //delete some values which are functions
                        delete config_copy["aggregators"];
                        delete config_copy["renderers"];
                        delete config_copy["derivedAttributes"];
                        //delete some bulky default values
                        delete config_copy["rendererOptions"];
                        delete config_copy["localeStrings"];
                        window.location.hash=params=encodeURI(JSON.stringify(config_copy, undefined, 0));
                    },
        });
    });
}


Meteor.startup(function () {

chart = {
  target: 'chart1',
  type: 'BarChart',
  columns: [
    ['string', 'Topping'],
    ['number', 'Slices']
  ],
  rows: [
    ['Mushrooms', 3],
    ['Onions', 1],
    ['Olives', 1],
    ['Zucchini', 1],
    ['Pepperoni', 2]
  ],
  options: {
    'title':'How Much Pizza I Ate Last Night',
    'width':400,
    'height':300
  }
};

drawChart(chart);
});
