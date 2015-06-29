
     
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


/* 
   Data Processing Pipeline using Session Variables 

    Phase 1
    studies - studies list from <input id="studies">
    genelist - gene list from <input id="genelist">
    samplelist - samplelist list from <input id="samplelist">
    additionalQueries - additional queries list from <input id="samplelist">

    Phase 2:
    aggregatedResults - results of find from aggreagatedQueries
    expressionResults - results of find from expression collection using genelist
    expressionIsoFormResults - results of find from expression_isofrom using using genelist

    Phase 3:
    ChartData - Join of aggregatedResults, expressionResults, expressionIsoFormResults 

    Phase 4: 
    transform the data

    Phase 5: drawing the chart
    RedrawChart()

*/

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
   Count : function(collName) {
      var coll = getCollection(collName)
      return coll.find().count();
   },

   geneLikeDataDomains : function() {
      var prevGeneLikeDataDomains = Session.get("geneLikeDataDomain");
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
     var studies = Session.get("studies");
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

getCollection = function(collName) {
    if (collName in window) 
        CRFmetadataCollectionMap[collName] = window[collName];
    else if (!(collName in CRFmetadataCollectionMap || collName in window)) 
        CRFmetadataCollectionMap[collName] = new Meteor.Collection(collName);
    return CRFmetadataCollectionMap[collName];
}




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
       Session.set("Transforms", transforms);
   },
   'change .geneLikeDataDomains' : function(evt, tmpl) {
       var $checkbox = $(evt.target)
       var field = $checkbox.data('field');
       var collection = $checkbox.data('collection');
       GeneLikeDataDomainsPrototype.map(function(domain) {
           if ( domain.field == field && domain.collection == collection ) {
              domain.state = $checkbox.prop("checked");
              Session.set(domain.checkBoxName, domain.state);
              // update
          }
       });
      Session.set("geneLikeDataDomain", GeneLikeDataDomainsPrototype);
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
                    var genelist = Session.get("genelist"); // Pipeline Phase 1
                    var k = genelist.indexOf(d.Hugo_Symbol);
                    if (k >= 0) {
                        $(elem).addClass("includeThisGene");
                    }
                },

                selectRow: function(elem, d) {
                    var gene = d.Hugo_Symbol;
                    if (gene == null)
                        return
                    var genelist = Session.get("genelist"); // Pipeline Phase 1
                    $(elem).addClass("includeThisGene");
                    var k = genelist.indexOf(gene);
                    if (k < 0) {
                        // add it
                        genelist.push(gene)
                        Session.set("genelist", genelist); // Pipeline Phase 1
                        var $genelist = $("#genelist");
                        $genelist.select2("data", genelist.map(function(e) { return { id: e, text: e} }));
                    }
                },

                clearRow: function(elem, d) {
                    var gene = d.Hugo_Symbol;
                    if (gene == null)
                        return
                    var genelist = Session.get("genelist"); // Pipeline Phase 1
                    $(elem).removeClass("includeThisGene");
                    var k = genelist.indexOf(gene);
                    if (k >= 0) {
                        // remove it
                        genelist.splice(k,1);
                        Session.set("genelist", genelist); // Pipeline Phase 1
                        var $genelist = $("#genelist");
                        $genelist.select2("data", genelist.map(function(e) { return { id: e, text: e} }));
                    }
                },


                clickRow: function(elem, d) {
                    var gene = d.Hugo_Symbol;
                    if (gene == null)
                        return
                    var genelist = Session.get("genelist"); // Pipeline Phase 1
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
                    Session.set("genelist", genelist); // Pipeline Phase 1

                    var $genelist = $("#genelist");
                    $genelist.select2("data", genelist.map(function(e) { return { id: e, text: e} }));
                }
            });
        })
   },


   'click .inspect': function(evt, tmpl) {
        var $link = $(evt.target);
        var v = $link.data("var");
        var data = Session.get(v);
        Overlay("Inspector", { data: data });
   },
   'change #studies' : function(evt, tmpl) {
       var s = $("#studies").select2("val");
       Session.set("studies", s);
   },
   'change #additionalQueries' : function(evt, tmpl) {
       var additionalQueries = $("#additionalQueries").select2("val");
       Session.set("additionalQueries", additionalQueries); // Pipeline Phase 1
   },
   'change #samplelist' : function(evt, tmpl) {
       var s = $("#samplelist").val();
       s = s.split(/[ ,;]/).filter(function(e) { return e.length > 0 });
       Session.set("samplelist", s); // Pipeline Phase 1
   },

   'change #genelist' : function(evt, tmpl) {
       var $genelist = $("#genelist");
       var before = $genelist.select2("val");
       Session.set("genelist", before); // Pipeline Phase 1
   },

   // genesets are just a quick way to add genes to the genelist, simlar to above event
   'change #genesets' : function(evt, tmpl) {
       var val = $(evt.target).val();
       var gs = GeneSets.findOne({name: val});
       if (gs) {
           var $genelist = $("#genelist");
           var before = $genelist.select2("val");
           var after = before.concat(gs.members);
           Session.set("genelist", after); // Pipeline Phase 1
           $genelist.select2("data", after.map(function(e) { return { id: e, text: e} }));
       }
   },

   'click #clear' : function(evt, tmpl) {
       var $genelist = $("#genelist");
       $genelist.select2("data", [] );
       Session.set("genelist", []);
   }
})

function initializeSpecialJQueryElements() {
     $('.studiesSelectedTable th').hide()

     $("#additionalQueries").select2( {
       placeholder: "Select one or more fields",
       allowClear: true
     } );

     $("#studies").select2( {
       placeholder: "Select one or more studies",
       allowClear: true
     } );
}



function restoreChartDocument(prev) {
     var $samplelist = $("#samplelist");

     var pt = prev.transforms;

     if (pt) {
         Session.set("Transforms", pt);
         console.log("pt",pt);
         setTimeout(function() {
             console.log("pt",pt);
             $(".transform").map(function(i, elem) {
                 var $elem = $(elem);
                 pt.map(function (transform) {
                    if ( $elem.data("field") == transform.field 
                        && $elem.data("op") == transform.op )
                        $elem.val(transform.value);
                 });
             });
         }, 1000);
     }

     if (prev.samplelist) {
         prev.samplelist = [];
         $samplelist.val(prev.samplelist.join(" "));
         Session.set("samplelist", prev.samplelist);
     }

     if (prev.geneLikeDataDomain) {
         Session.set("geneLikeDataDomain", prev.geneLikeDataDomain);

         GeneLikeDataDomainsPrototype.map(function(newDomain) {
              prev.geneLikeDataDomain.map(function(prevDomain) {
                  if (prevDomain.collection == newDomain.collection  && prevDomain.field == newDomain.field ) {
                      newDomain.state = prevDomain.state;
                      Session.set(newDomain.checkBoxName, newDomain.state);
                      $('input[name="' + newDomain.checkBoxName + '"]').prop("checked", newDomain.state);

                  }
              });
          });
     } else
         Session.set("geneLikeDataDomain", []);


     var $studies = $("#studies");
     if (prev.studies) {
         $studies.select2("data",  id_text(prev.studies));
         Session.set("studies", prev.studies);
     }

     var $additionalQueries = $("#additionalQueries");
     if (prev.additionalQueries) {
         $additionalQueries.select2("data",  prev.additionalQueries.map(function(q) {
             var qq = JSON.parse(unescape(q));
             return { id: q, text: qq.c + ":" + qq.f }
         }));
         Session.set("additionalQueries", prev.additionalQueries); // Pipeline Phase 1
     }

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

     if (prev && prev.genelist) {
         $genelist.select2("val", prev.genelist );
     }
     Session.set("genelist", prev.genelist);

};

Template.Transforms.helpers({
   dataFieldNames: function() {
       var dataFieldNames = Session.get("dataFieldNames");
       if (dataFieldNames) {
           return dataFieldNames.sort();
       }
       return [];
   },
});

st = new Date();

console.log("onstartup");


Template.Controls.rendered = function() {
    console.log("rendered", ((new Date()) - st));
     window.ChartDocument =  this.data; // SHOULD NOT BE A SESSION VARIABLE ! Users expect one document per window.

     // Phase 1 initialze the state ofthe GUI and initialize (or restore the previous) ChartDocument
     initializeSpecialJQueryElements();
     restoreChartDocument(ChartDocument);

     // Phase 3 Get all the changed values, save the ChartDocument and join the results
     Tracker.autorun(function updateChartDocument() {

            // Any (all) of the following change, save them and update ChartData
            ChartDocument.genelist = Session.get("genelist");
            ChartDocument.studies = Session.get("studies");
            ChartDocument.samplelist = Session.get("samplelist");
            ChartDocument.additionalQueries  = Session.get("additionalQueries");
            ChartDocument.aggregatedResults  = Session.get("aggregatedResults");
            ChartDocument.geneLikeDataDomain = Session.get("geneLikeDataDomain");
            ChartDocument.transforms = Session.get("Transforms");

            templateContext = { 
                onRefresh: function(config) {
                        if (ChartDocument.post) { // Don't modify an existing post.  Check this on server too.
                            delete ChartDocument["post"]; 
                        }

                        ChartDocument.pivotTableConfig =  { 
                            cols: config.cols,
                            rows: config.rows,
                            aggregatorName: config.aggregatorName,
                            rendererName: config.rendererName,
                        };

                        delete ChartDocument["_id"];

                        var _id = Charts.findOne({ userId: Meteor.userId(), post: { $exists: false}})._id;
                        if (_id)
                            Charts.update({ _id : _id }, {$set: ChartDocument});
                        else
                            _id = Charts.insert(ChartDocument);
                        ChartDocument._id = _id;
                }
            }
            var savedConfig = ChartDocument.pivotTableConfig ? ChartDocument.pivotTableConfig : PivotTableInit;
            var final =  $.extend({}, PivotCommonParams, templateContext, savedConfig);

            // Charts.update({ _id : ChartDocument._id }, {$set: {chartData: chartData}});
            console.log("before to call", ((new Date()) - st));
            Meteor.call("renderChartData", ChartDocument, function(err, ret) {
                Session.set("dataFieldNames", ret.dataFieldNames);
                console.log("return from call", ((new Date()) - st));

                if (err == null && ret != null && ret.chartData != null)
                    $(".output").pivotUI(ret.chartData, final);
                else
                    console.log("renderChartData", err)
            });
            console.log("after call", ((new Date()) - st));
        }); // autoRun
} // 
