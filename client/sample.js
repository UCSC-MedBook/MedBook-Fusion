
var SubscriptionsWaitingCount = 0;
     
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

    var derivers = $.pivotUtilities.derivers;
    var renderers = $.extend($.pivotUtilities.renderers, $.pivotUtilities.gchart_renderers);

    window.PivotCommonParams = {
        renderers: renderers,
        derivedAttributes: { "Age Bin": derivers.bin("age", 10), },
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

Zclass = function(x) {
    if (x >= 2)
        return "2z";
    if (x >= 1)
        return "1z";
    if (x  < 1 && x > -1) return "near mean";
    if (x  < -1 && x > -2) return "-1z";
    if (x  < -2)  return "-2z";
}


GeneLikeDataDomainsPrototype = [
    {
        label: "Expression RSEM",
        labelItem: "ExprRSEM",
        checkBoxName: "ExprCheckbox",
        dataName: "Expression",
        collection: "Expression",
        subscriptionName: "GeneExpression",
        field: "rsem_quan_log2",
        state: false,
    },
    {
        label: "Isoform RSEM",
        labelItem: "IsoformRSEM",
        checkBoxName: "IsoformCheckbox",
        dataName: "ExpressionIsoform",
        collection: "ExpressionIsoform",
        subscriptionName: "GeneExpressionIsoform",
        field: "rsem_quan_log2",
        state: false,
    },
    {
        label: "Mutations",
        labelItem: "Mut",
        checkBoxName: "MutCheckbox",
        dataName: "Mutations",
        collection: "Mutations",
        subscriptionName: "GeneMutations",
        field: "Variant_Type",
        state: false,
    },
    {
        label: "Kinase Pathway Signature (Viper Method)",
        labelItem: "KinasePatSig",
        checkBoxName: "ViperSignatureCheckbox",
        dataName: "ViperSignature",
        collection: "SignatureScores",
        subscriptionName: "GeneSignatureScores",
        field: "kinase_viper",
        state: false,
    },
];


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



// This will be run inside of a Tracker autorun
function aggregatedResults() {
    var additionalQueries = Session.get("additionalQueries");

    if (additionalQueries && additionalQueries.length > 0) {
        // aggregate fields 
        var aggregatedQueries = {};
        var aggregatedJoinOn = {}
        additionalQueries.map(function(query) {
            var query = JSON.parse(unescape(query));

            var collName = query.c;
            var fieldName = query.f;
            aggregatedJoinOn[collName] = query.j;

            if (collName in aggregatedQueries)
                aggregatedQueries[collName] = _.union(aggregatedQueries[collName], fieldName);
            else
                aggregatedQueries[collName] = [fieldName];

            if (collName in window) 
                CRFmetadataCollectionMap[collName] = window[collName];
            else if (!(collName in CRFmetadataCollectionMap || collName in window)) 
                CRFmetadataCollectionMap[collName] = new Meteor.Collection(collName);
        }) // additional queries

        subscribe_aggregatedQueries_1(aggregatedQueries, aggregatedJoinOn);
            
    } //  if (additionalQueries && additionalQueries.length > 0)
} // function aggregatedResults()

function subscribe_aggregatedQueries_2(aggregatedQueries, aggregatedJoinOn) {
    Meteor.subscribe("aggregatedQueries", aggregatedQueries);

    var chartData_map_Sample_ID = {};
    var chartData_map_Patient_ID = {};
    var timeout = null;

    Object.keys(aggregatedQueries).map(function(collName) {
        Tracker.autorun(function() {
            var cursor = getCollection(collName).find();
            cursor.observe( {
                added: function(data) {
                    var fieldNames = aggregatedQueries[collName];
                    fieldNames.map(function(fieldName) {
                        if (fieldName in data) {
                            var datum = data[fieldName];
                            var displayFieldName = collName + ":" + fieldName;

                            if (!(data.Patient_ID in chartData_map_Patient_ID))
                                chartData_map_Patient_ID[data.Patient_ID] = {};
                            chartData_map_Patient_ID[data.Patient_ID][collName + ":" + fieldName] = datum;

                            if (!(data.Sample_ID in chartData_map_Sample_ID))
                                chartData_map_Sample_ID[data.Sample_ID] = {};
                            chartData_map_Sample_ID[data.Sample_ID][collName + ":" + fieldName] = datum;
                        }
                    }); // fieldNames map

                    if (timeout) window.clearTimeout(timeout);
                    timeout = setTimeout(function(){
                            Session.set("aggregatedResults", {
                                    aggregatedJoinOn: aggregatedJoinOn,
                                    chartData_map_Sample_ID: chartData_map_Sample_ID,
                                    chartData_map_Patient_ID: chartData_map_Patient_ID,
                                } );
                        }, 200); // timeout
                } // added
            }); // observe
         }); //tracker autorun
    }); // aggregatedQueries keys

}

function subscribe_aggregatedQueries_1(aggregatedQueries, aggregatedJoinOn) {
    SubscriptionsWaitingCount++;
    Meteor.subscribe("aggregatedQueries", aggregatedQueries, function onReady() {
        SubscriptionsWaitingCount--;
        var chartData_map_Sample_ID = {};
        var chartData_map_Patient_ID = {};
        var timeout = null;
        Object.keys(aggregatedQueries).map(function(collName) {
                var cursor = getCollection(collName).find();
                console.log("agg", collName, cursor.count());
                cursor.forEach( function(data) {
                    var fieldNames = aggregatedQueries[collName];
                    fieldNames.map(function(fieldName) {
                        if (fieldName in data) {
                            var datum = data[fieldName];
                            var displayFieldName = collName + ":" + fieldName;

                            if (!(data.Patient_ID in chartData_map_Patient_ID))
                                chartData_map_Patient_ID[data.Patient_ID] = {};
                            chartData_map_Patient_ID[data.Patient_ID][collName + ":" + fieldName] = datum;

                            if (!(data.Sample_ID in chartData_map_Sample_ID))
                                chartData_map_Sample_ID[data.Sample_ID] = {};
                            chartData_map_Sample_ID[data.Sample_ID][collName + ":" + fieldName] = datum;
                        }
                    }); // fieldNames map
                    }); //forEach
            }); // aggregatedQueries keys map
            Session.set("aggregatedResults", {
                aggregatedJoinOn: aggregatedJoinOn,
                chartData_map_Sample_ID: chartData_map_Sample_ID,
                chartData_map_Patient_ID: chartData_map_Patient_ID,
            });
        }) // Meteor.subscribe
    }

// This returned function is run inside of a tracker autorun
function geneLikeResults(domain) {
    return function() {
        var isBoxChecked = Session.get(domain.checkBoxName);
        if (isBoxChecked) {
            var studies = Session.get("studies");
            var genelist = Session.get("genelist");
            var samplelist = Session.get("samplelist");

            if (studies && studies.length > 0 && genelist && genelist.length > 0) {

                SubscriptionsWaitingCount++;

                Meteor.subscribe(domain.subscriptionName, studies, genelist, 
                    function onReady() {
                            SubscriptionsWaitingCount--;
                            var q = domain.collection == "Mutations" ?
                                {Hugo_Symbol: { $in: genelist}}
                                : {gene: { $in: genelist}};
                            var docs = window[domain.collection].find(q).fetch();
                            Session.set(domain.dataName, docs);
                        } // onReady()
                    );

            }  // if studies
            return
        }
        Session.set(domain.dataName, []);
    } // return function
} // function geneLikeResults()



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
       var chartDataPre = Session.get("ChartDataPre");
       if (chartDataPre) {
           var keys = chartDataPre.map( function(cd)  { return Object.keys(cd); })
                       .reduce( function(res, item) { res = _.union(res, item); return res});
           return keys.sort();
       }
       return [];
   },
});




Template.Controls.rendered = function() {
     var ChartDocument = Charts.findOne({ userId : Meteor.userId() }); // Charts find cannot be inside of a Tracker, else we get a circularity when we update it.
     if (ChartDocument == null) {
         Charts.insert({}); 
         ChartDocument = Charts.findOne({ userId : Meteor.userId() });
     }
     Session.set("ChartDocument", ChartDocument);

     // Phase 1 initialze the state ofthe GUI and initialize (or restore the previous) ChartDocument
     initializeSpecialJQueryElements();
     restoreChartDocument(ChartDocument);

     // Phase 2 subscribe to all the Gene (and Gene-like) subscriptions such as Signature scores
     Tracker.autorun( aggregatedResults );
     GeneLikeDataDomainsPrototype.map(function(dataDomain) {
        Tracker.autorun(geneLikeResults(dataDomain))
     })

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

            var cd = _.clone(ChartDocument);
            delete cd["_id"];
            delete cd["pivotTableConfig"];
            Charts.update({ _id : ChartDocument._id }, {$set: cd});

            var q = ChartDocument.samplelist == null || ChartDocument.samplelist.length == 0 ? {} : {Sample_ID: {$in: ChartDocument.samplelist}};
            var chartData = Clinical_Info.find(q).fetch();

            var chartDataMap = {};
            chartData.map(function (cd) { 
                delete cd["_id"];
                chartDataMap[cd.Sample_ID] = cd;
            });

            chartData.sort( function (a,b) { return a.Sample_ID.localeCompare(b.Sample_ID)});

            ChartDocument.samplelist = chartData.map(function(ci) { return ci.Sample_ID })
                
            // Marshall for Join all the Gene line information into the samples into the ChartDataMap table
            GeneLikeDataDomainsPrototype.map(function(domain) {
                var gld = Session.get(domain.dataName);
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
            });

            function Join(datum, joinKey, dataMap) {
                if (joinKey in datum && datum[joinKey] in dataMap)
                    $.extend(datum, dataMap[ datum[joinKey] ]);
            }

            var keyUnion = {};  
            chartData.map(function(datum) { 
                if (ChartDocument.aggregatedResults) {
                    Join(datum, "Sample_ID", ChartDocument.aggregatedResults.chartData_map_Sample_ID);
                    Join(datum, "Patient_ID", ChartDocument.aggregatedResults.chartData_map_Patient_ID);
                }
                $.extend(keyUnion, datum);
            });

            Object.keys(keyUnion).map(function(k) { keyUnion[k] = "unknown"; });
            chartData = chartData.map(Transform_Clinical_Info, keyUnion);
            Session.set("ChartDataPre", chartData);

    });

     // phase 4 
     Tracker.autorun(function transformChartDocument() {
         var chartDataPre = Session.get("ChartDataPre");
         var transforms = Session.get("Transforms");

         if (transforms)
             chartDataPre.map(function transformer(datum) {
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
         Session.set("ChartData", chartDataPre);
     });


     // Phase 5 
     // Must wait until the subscriptions are in before first repaint, 
     // otherwise the refresh state will get an imperfect view of the available data
     var intervalId = setInterval(function repaint() {
         if (SubscriptionsWaitingCount == 0)
             clearInterval(intervalId);
         else 
             return;
         Tracker.autorun( function RedrawChart() {
            var chartData = Session.get("ChartData");
            templateContext = { 
                onRefresh: function(config) {
                    if (SubscriptionsWaitingCount == 0) {
                        var save = { cols: config.cols, rows: config.rows,
                            aggregatorName: config.aggregatorName,
                            rendererName: config.rendererName,
                        };
                        ChartDocument.pivotTableConfig =  save;
                        Charts.update({ _id : ChartDocument._id }, {$set: {pivotTableConfig: save}});
                    }
                }
            }
            var savedConfig = ChartDocument.pivotTableConfig ? ChartDocument.pivotTableConfig : PivotTableInit;
            var final =  $.extend({}, PivotCommonParams, templateContext, savedConfig);
            Charts.update({ _id : ChartDocument._id }, {$set: {chartData: chartData}});
            $(".output").pivotUI(chartData, final);
        }); // autoRun
    }, 50);
} // 
M5
