Meteor.startup(function() {
    window.makeGoogleChart2 = function(chartType, extraOptions) {
        var foo = makeGoogleChart(chartType, extraOptions);
        return function(pivotData, opts) {
          // debugger;
          return foo(pivotData, opts);
          }
    },

    window.makeGoogleChart = function(chartType, extraOptions) {
      return function(pivotData, opts) {
        window.PD = pivotData;
        window.OP = opts;
        var agg, colKey, colKeys, dataArray, dataTable, defaults, groupByTitle, h, hAxisTitle, headers, k, numCharsInHAxis, options, result, row, rowKey, rowKeys, title, v, vAxisTitle, wrapper, _i, _j, _len, _len1;
        defaults = {
          localeStrings: {
            vs: "vs",
            by: "by"
          },
          selectionMode: 'multiple',
          tooltip: { trigger: 'selection' },
          aggregationTarget: 'auto',

        };
        opts = $.extend({}, defaults, opts);
        rowKeys = pivotData.getRowKeys();
        if (rowKeys.length === 0) {
          rowKeys.push([]);
        }
        colKeys = pivotData.getColKeys();
        if (colKeys.length === 0) {
          colKeys.push([]);
        }
        headers = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = rowKeys.length; _i < _len; _i++) {
            h = rowKeys[_i];
            _results.push(h.join("-"));
          }
          return _results;
        })();
        headers.unshift("");
        numCharsInHAxis = 0;
        dataArray = [headers];
        var groupArray = [headers];
        for (_i = 0, _len = colKeys.length; _i < _len; _i++) {
          colKey = colKeys[_i];
          row = [colKey.join("-")];
          grouprow = [colKey.join("-")];
          numCharsInHAxis += row[0].length;
          for (_j = 0, _len1 = rowKeys.length; _j < _len1; _j++) {
            rowKey = rowKeys[_j];
            agg = pivotData.getAggregator(rowKey, colKey);
            grouprow.push(agg.GROUPS);

            if (agg.value() != null) {
              row.push(agg.value());
            } else {
              row.push(null);
            }
          }
          groupArray.push(grouprow);
          dataArray.push(row);
        }
        title = vAxisTitle = pivotData.aggregatorName + (pivotData.valAttrs.length ? "(" + (pivotData.valAttrs.join(", ")) + ")" : "");
        hAxisTitle = pivotData.colAttrs.join("-");
        if (hAxisTitle !== "") {
          title += " " + opts.localeStrings.vs + " " + hAxisTitle;
        }
        groupByTitle = pivotData.rowAttrs.join("-");
        if (groupByTitle !== "") {
          title += " " + opts.localeStrings.by + " " + groupByTitle;
        }
        options = {
          width: $(window).width() / 1.4,
          height: $(window).height() / 1.4,
          title: title,
          hAxis: {
            title: hAxisTitle,
            slantedText: numCharsInHAxis > 50
          },
          vAxis: {
            title: vAxisTitle
          }
        };
        if (dataArray[0].length === 2 && dataArray[0][1] === "") {
          options.legend = {
            position: "none"
          };
        }
        for (k in extraOptions) {
          v = extraOptions[k];
          options[k] = v;
        }
        dataTable = google.visualization.arrayToDataTable(dataArray);
        result = $("<div class='ChartWrapper' >").css({
          width: "100%",
          height: "100%"
        });
        wrapper = new google.visualization.ChartWrapper({
          dataTable: dataTable,
          chartType: chartType,
          options: options
        });
        result[0].wrapper = wrapper;


        // Called
        function usefulHandler() {
            var sel = wrapper.getChart().getSelection();
            
            var c = sel[0].column;
            var r = sel[0].row;
            var col_label = groupArray[0][c];
            var row_label = groupArray[r + 1][0];
            var data = groupArray[r + 1][c];
            console.log("GROUP", col_label, row_label, data);
        }

        function onReady() {
          google.visualization.events.addListener(wrapper.getChart(), 'select', usefulHandler);
        }

        google.visualization.events.addListener(wrapper, 'ready', onReady);


        wrapper.draw(result[0]);

        function editChart() {
          var editor;
          editor = new google.visualization.ChartEditor();
          google.visualization.events.addListener(editor, 'ready', function() {
             $('.google-visualization-charteditor-dialog').width(1000).css({left:200})
          });
          google.visualization.events.addListener(editor, 'ok', function() {
            return editor.getChartWrapper().draw(result[0]);
          });


          return editor.openDialog(wrapper);
        };
        var editChartBtn = $('<button type="button" style="margin:10px;" class="btn btn-default">Edit Chart</button>').appendTo(result);
        editChartBtn.click(editChart);
        var contrastBtn = $('<button type="button" style="margin:10px;" class="btn btn-default">Make a contrast between two groups</button>').appendTo(result);
        var postBtn = $('<button type="button" onclick="$.getScript(\'/postScript\')" style="margin:10px;" class="btn btn-default">Post</button>').appendTo(result);
        var form = $("<form hidden>").appendTo(result);
        contrastBtn.click(function() { form.toggle(); });
        var groupTable = $("<table class='table table-responsive'>").attr("cellpadding", 5).appendTo(form);
        var header = $("<thead><tr><th>Group</th><th>Samples</th></tr></thead>").appendTo(groupTable);
        var body = $("<tbody>").appendTo(groupTable);
        groupArray.map(function(row)  {
           if (row) {
               row.map(function(item) {
                   if (typeof(item) == "object") 
                       Object.keys(item).map(function(groupName) {
                               var tr = $("<tr>").appendTo(body);
                               var td = $("<td><i><span class='groupName'> " + groupName + "</span></i></td>").appendTo(tr);
                               var select = $("<select class='form-control input-sm'>").appendTo(td);
                               ["no group", "group 1", "group 2"].map(function(f) {
                                   $("<option value='"+f+"'>"+f+"</option>").appendTo(select);
                               });
                               $("<td>" + item[groupName].sort().map(function(f) { return f.Sample_ID }).join(" ") + "</td>").appendTo(tr);
                           });
               });
           }
        });
        function makeContrast() {
            var studyID = "wcdt_prad";
            var groupName1 = [];
            var groupName2 = [];

            var sampleList1 = [];
            var sampleList2 = [];
            body.find("tr").each(function(i, row) {
                var group = $(row).find("select").val();
                row = $(row).children();
                var groupName = $(row[0]).find(".groupName").text();
                var samples = $(row[1]).text().split(" ");
                if (group == "group 1") {
                    groupName1.push(groupName);
                    sampleList1 = sampleList1.concat(samples);
                } else if (group == "group 2") {
                    groupName2.push(groupName);
                    sampleList2 = sampleList1.concat(samples);
                }
            });
            var g1 = groupName1.join(", ");
            var g2 = groupName2.join(", ");
            var contrast_name = g1 + " vs " + g2;
            sampleList1 = sampleList1.sort();
            sampleList2 = sampleList2.sort();
            if (sampleList1.length == 0 || sampleList2.length == 0)
                return alert("please select samples for both group 1 and group 2");

            var collab;
            if (Meteor.user()) {		
                    var collabs = Meteor.user().profile.collaborations;
                    var collab = collabs[0]
            } else {
                    collab = []
            }
            console.log('contrast: '+contrast_name);
            console.dir('samples for group '+g1+' :'+sampleList1);
            Contrast.insert({'name':contrast_name,'studyID':studyID,'collaborations': collab,
                    'group1':g1,'group2':g2,'list1':sampleList1,'list2':sampleList2,  userId: Meteor.userId()}, 
                    function(error, result) { 
                    if (error == null)
                        alert("Contrast " + contrast_name + " made");
            });
        };

        var button = $('<center><button type="button" class="btn btn-primary btn-lg"">Make Contrast</button></center>').appendTo(form);
        button.click(makeContrast);

        return result;
      };
    };
    $.pivotUtilities.gchart_renderers = {
// "Box Plot": makeGoogleChart("CandlestickChart"),
      "Scatter Chart": makeGoogleChart2("ScatterChart"),
      "Pie Chart": makeGoogleChart2("PieChart"),
      "Donut Chart": makeGoogleChart2("PieChart", {
        pieHole: 0.3,
      }),
      "Line Chart": makeGoogleChart("LineChart"),
      "Bar Chart": makeGoogleChart("ColumnChart"),
      "Stacked Bar Chart": makeGoogleChart("ColumnChart", {
        isStacked: true
      }),
      "Area Chart": makeGoogleChart("AreaChart", {
        isStacked: true
      })
    };
})

