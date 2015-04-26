Meteor.startup(function() {
    window.makeGoogleChart2 = function(chartType, extraOptions) {
        var foo = makeGoogleChart(chartType, extraOptions);
        return function(pivotData, opts) {
          // debugger;
          return foo(pivotData, opts);
          }
    };

    window.LEGEND_PROPORTION = 0.5;

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

        var groupheaders = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = rowKeys.length; _i < _len; _i++) {
            h = rowKeys[_i].map(function(k, n) { 
                var rowAttr = pivotData.rowAttrs.length > 0 ? pivotData.rowAttrs[n] : "";
                return rowAttr + ":" + k;
            });
            _results.push(h.join(","));
          }
          return _results;
        })();

        headers.unshift("");
        numCharsInHAxis = 0;
        dataArray = [headers];
        var groupArray = [groupheaders];
        for (_i = 0, _len = colKeys.length; _i < _len; _i++) {
          colKey = colKeys[_i];
          row = [colKey.join("-")];

          grouprow = [colKey.map(function(k, i) {
                  var colAttr = pivotData.colAttrs.length > 0 ? pivotData.colAttrs[_i] : "";
                  return  colAttr + ":" + k
          }).join(",")];
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
        document.title = title;
        var windowWidth = $(window).width() * 0.8;
        var chartWidth  = windowWidth * window.LEGEND_PROPORTION;
        var legendWidth = windowWidth * (1.0 - window.LEGEND_PROPORTION);

        options = {
          width: chartWidth + legendWidth,
          height: $(window).height() / 1.4,
          chartArea: {
            left: 120,
            width: chartWidth },
          legend: {width: legendWidth },

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
            if (sel[0] == null)
                return;
            
            var c = sel[0].column;
            var r = sel[0].row;
            var col_label = groupArray[0][c];
            var row_label = groupArray[r + 1][0];
            var data = groupArray[r + 1][c];
            console.log("GROUP", col_label, row_label, data);
            window.POKECONTRAST(data)
        }

        function onReady() {
          google.visualization.events.addListener(wrapper.getChart(), 'select', usefulHandler);
        }

        google.visualization.events.addListener(wrapper, 'ready', onReady);


        wrapper.draw(result[0]);

        /*
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
        */
        addMedBookButtons(result, groupArray);
        return result;
      };
    };
    $.pivotUtilities.gchart_renderers = {
      "Box Plot": makeD3BoxPlotChart("BoxPlot"),
      "Scatter Chart": makeGoogleScatter("ScatterChart"),
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

