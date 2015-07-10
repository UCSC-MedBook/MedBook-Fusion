
     
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
    Meteor.subscribe("Biopsy_Research");

    var derivers = $.pivotUtilities.derivers;
    var renderers = $.extend($.pivotUtilities.renderers, $.pivotUtilities.gchart_renderers);

    window.PivotCommonParams = {
        renderers: renderers,
        derivedAttributes: { "Age Bin": derivers.bin("age", 10), },
        hiddenAttributes: [ "_id", "Patient_ID", "Sample_ID"] 
    };

});


Template.Controls.helpers({
   geneLikeDataDomains : function() {
      var prevGeneLikeDataDomains = CurrentChart("geneLikeDataDomain");
      if (prevGeneLikeDataDomains)
          GeneLikeDataDomainsPrototype.map(function(newDomain) {
              prevGeneLikeDataDomains.map(function(prevDomain) {
                  if (prevDomain.collection == newDomain.collection  && prevDomain.field == newDomain.field ) {
                      newDomain.state = prevDomain.state;
                  }
              });
          });
      return GeneLikeDataDomainsPrototype;
   },

   studiesSelected: function() {
    
     var studies = CurrentChart("studies");
     if (studies && studies.length > 0)
        return Studies.find({id: {$in: studies }}, {sort: {"name":1}});
     else
        return [];
   },

   studiesSelectedSettings: function () {
      return {
        rowsPerPage: 10,
        showFilter: false,
        fields: [ "id", "description",
        /*
           The description field is in HTML. But this recipe for displaying HTML in reactive table
           causes an error in the console log.  Need a better recipe.

            { key: 'id' }, 
            {
              key: 'description',
              fn: function (value) { 
                  // return new Spacebars.SafeString(value);
                  return value;
              }
            }
            */
       ],
    };
   },

   genesets : function() {
      return GeneSets.find({}, {sort: {"name":1}});
   },
   studies : function() {
      return Studies.find({}, {sort: {"name":1}});
   },
   additionalQueries : function() {
       var html = '';
       CRFmetadataCollection.find({}).forEach(function(vv) {
           var collName = vv.name;
           html += '<optGroup label="'+ collName +'">';

           var ft = vv.fieldTypes;
           var hasSample_ID = false;
           vv.fieldOrder.map(function(fieldName, i) {
               if (fieldName == "Sample_ID")
                   hasSample_ID = true;
           });
           vv.fieldOrder.map(function(fieldName, i) {

               var meta = { c: collName, f: fieldName, 
                   j: hasSample_ID ? "Sample_ID" : "Patient_ID" 
               };
               var value = escape(JSON.stringify(meta));
                 

               html += '    <option value="'+ value + '">'+collName + ":" +fieldName+'</option>';
           });

           html += '</optGroup>\n';
       });
       return html;
   }
})

Template.checkBox.helpers({
    'checked' : function() {
        return this.state ? "checked" : "";
    }
});


Template.Controls.events({
   'change .transform' : function(evt, tmpl) {
       var transforms = [];
       $('.transform').map(function(i, e) {
           if (e.value) 
               transforms.push( {
                   op: $(e).data("op"),
                   field: $(e).data("field"),
                   precedence: $(e).data("precedence"),
                   value: $(e).val()
               });
        });
       transforms = transforms.sort(function(a,b) { return a.precedence - b.precedence; })
       UpdateCurrentChart("Transforms", transforms);
   },
   'change .geneLikeDataDomains' : function(evt, tmpl) {
       var $checkbox = $(evt.target)
       var field = $checkbox.data('field');
       var collection = $checkbox.data('collection');
       GeneLikeDataDomainsPrototype.map(function(domain) {
           if ( domain.field == field && domain.collection == collection ) {
              domain.state = $checkbox.prop("checked");
              // update
          }
       });
      UpdateCurrentChart("geneLikeDataDomain", GeneLikeDataDomainsPrototype);
   },

   'click .topMutatedGenes': function(evt, tmpl) {
        var $link = $(evt.target);
        Meteor.call("topMutatedGenes", function(err,data) {
            Overlay("Picker", { 
                data: data, 

                title: "Top Mutated Genes (click to select)",


                reactiveTableFields: function() {
                   return [
                    { key: 'Hugo_Symbol', label: 'Gene' },
                    { key: 'count', label: 'Number of Mutations', sort: 'descending' },
                   ]
                },

                renderRow: function(elem, d) {
                    if (d.Hugo_Symbol == null)
                        return;
                    var genelist = CurrentChart("genelist"); // Pipeline Phase 1
                    var k = genelist.indexOf(d.Hugo_Symbol);
                    if (k >= 0) {
                        $(elem).addClass("includeThisGene");
                    }
                },

                selectRow: function(elem, d) {
                    var gene = d.Hugo_Symbol;
                    if (gene == null)
                        return
                    var genelist = CurrentChart("genelist"); // Pipeline Phase 1
                    $(elem).addClass("includeThisGene");
                    var k = genelist.indexOf(gene);
                    if (k < 0) {
                        // add it
                        genelist.push(gene)
                        UpdateCurrentChart("genelist", genelist); // Pipeline Phase 1
                        var $genelist = $("#genelist");
                        $genelist.select2("data", genelist.map(function(e) { return { id: e, text: e} }));
                    }
                },

                clearRow: function(elem, d) {
                    var gene = d.Hugo_Symbol;
                    if (gene == null)
                        return
                    var genelist = CurrentChart("genelist"); // Pipeline Phase 1
                    $(elem).removeClass("includeThisGene");
                    var k = genelist.indexOf(gene);
                    if (k >= 0) {
                        // remove it
                        genelist.splice(k,1);
                        UpdateCurrentChart("genelist", genelist); // Pipeline Phase 1
                        var $genelist = $("#genelist");
                        $genelist.select2("data", genelist.map(function(e) { return { id: e, text: e} }));
                    }
                },


                clickRow: function(elem, d) {
                    var gene = d.Hugo_Symbol;
                    if (gene == null)
                        return
                    var genelist = CurrentChart("genelist"); // Pipeline Phase 1
                    var k = genelist.indexOf(gene);
                    if (k >= 0) {
                        // remove it
                        $(elem).removeClass("includeThisGene");
                        genelist.splice(k,1);
                    } else {
                        // add it
                        $(elem).addClass("includeThisGene");
                        genelist.push(gene)
                    }
                    UpdateCurrentChart("genelist", genelist); // Pipeline Phase 1

                    var $genelist = $("#genelist");
                    $genelist.select2("data", genelist.map(function(e) { return { id: e, text: e} }));
                }
            });
        })
   },


   'click .inspect': function(evt, tmpl) {
        var $link = $(evt.target);
        var v = $link.data("var");
        var data = CurrentChart(v);
        Overlay("Inspector", { data: data });
   },
   'change #studies' : function(evt, tmpl) {
       var s = $("#studies").select2("val");
       UpdateCurrentChart("studies", s);
   },
   'change #additionalQueries' : function(evt, tmpl) {
       var additionalQueries = $("#additionalQueries").select2("val");
       UpdateCurrentChart("additionalQueries", additionalQueries); // Pipeline Phase 1
   },
   'change #samplelist' : function(evt, tmpl) {
       var s = $("#samplelist").val();
       s = s.split(/[ ,;]/).filter(function(e) { return e.length > 0 });
       UpdateCurrentChart("samplelist", s); // Pipeline Phase 1
   },

   'change #genelist' : function(evt, tmpl) {
       var $genelist = $("#genelist");
       var before = $genelist.select2("val");
       UpdateCurrentChart("genelist", before); // Pipeline Phase 1
   },

   // genesets are just a quick way to add genes to the genelist, simlar to above event
   'change #genesets' : function(evt, tmpl) {
       var val = $(evt.target).val();
       var gs = GeneSets.findOne({name: val});
       if (gs) {
           var $genelist = $("#genelist");
           var before = $genelist.select2("val");
           var after = before.concat(gs.members);
           UpdateCurrentChart("genelist", after); // Pipeline Phase 1
           $genelist.select2("data", after.map(function(e) { return { id: e, text: e} }));
       }
   },

   'click #clear' : function(evt, tmpl) {
       var $genelist = $("#genelist");
       $genelist.select2("data", [] );
       UpdateCurrentChart("genelist", []);
   }
})

function initializeSpecialJQueryElements(document) {
     $('.studiesSelectedTable th').hide()

     $("#additionalQueries").select2( {
       placeholder: "type in diease or study name",
       allowClear: true
     } );

     $("#studies").select2( {
       placeholder: "Select one or more studies",
       allowClear: true
     } );

     var $genelist = $("#genelist");
     $genelist.select2({
          initSelection : function (element, callback) {
            var prev = document;
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
                q: term.toUpperCase()
              };
              return qp;
            },
            results: function (data, page, query) { return { results: data.items }; },
            cache: true
          },
          escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
          minimumInputLength: 2,
     });

}


Template.Transforms.helpers({
   dataFieldNames: function() {
       var dataFieldNames = CurrentChart("dataFieldNames");
       if (dataFieldNames) {
           return dataFieldNames.sort();
       }
       return [];
   },
});

st = new Date();

console.log("onstartup");

CurrentChart = function(name) {
    var x = Template.currentData();
    if (name)
        return x[name];
    else
        return x;
}

UpdateCurrentChart = function(name, value) {
    var x = Template.currentData();
    x[name] = value;
    var u =  {};
    u[name] = value;
    Charts.update({_id: x._id}, {$set: u});
}


renderChart = function() {
    var _id = CurrentChart("_id");
    var watch = Charts.find({_id: _id});
    var currentChart = watch.fetch()[0];

    RefreshChart = function(id, fields) {
        console.log("RefreshChart", id, fields);
        // short circuit unnecessary updates
        if (fields == null) return
        if (fields != true) {
            var f = Object.keys(fields);
            if (f.length == 1 && f[0] == "updatedAt")
                return;
            if (f.length == 2 && _.isEqual(f.sort(), [ "pivotTableConfig", "updatedAt"])
                && _.isEqual(currentChart.pivotTableConfig,  fields.pivotTableConfig))
                return

            $.extend(currentChart, fields); // VERY IMPORTNT

            if (f.length == 2 && _.isEqual(f.sort(), [ "selectedFieldNames", "updatedAt"]))
                return
        }
        Session.set("CurrentChart", currentChart);
        initializeSpecialJQueryElements(currentChart)

        templateContext = { 
            onRefresh: function(config) {
                currentChart.pivotTableConfig = { 
                    cols: config.cols,
                    rows: config.rows,
                    aggregatorName: config.aggregatorName,
                    rendererName: config.rendererName,
                };
                Charts.update(currentChart._id, { $set: {pivotTableConfig: currentChart.pivotTableConfig}});
            }
        }

        var pivotConf =  $.extend({}, PivotCommonParams, templateContext,  currentChart.pivotTableConfig || PivotTableInit);
        $(".output").pivotUI(currentChart.chartData, pivotConf, true);

    } // refreshChart

    /*
    if (ChartDocument.studies == null || ChartDocument.studies.length == 0)
        ChartDocument.studies = ["prad_wcdt"]; // HACK HACK
    */

    RefreshChart(_id, true);

    watch.observeChanges({
        changed: RefreshChart
    }); // watch.observeChanges
} // renderChart;



Template.Controls.rendered = renderChart;
