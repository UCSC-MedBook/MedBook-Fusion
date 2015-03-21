Meteor.startup(function() {

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
        /*
        result.bind("dblclick", function() {
          var editor;
          editor = new google.visualization.ChartEditor();
          google.visualization.events.addListener(editor, 'ok', function() {
            return editor.getChartWrapper().draw(result[0]);
          });
          return editor.openDialog(wrapper);
        });
        */
        return result;
      };
    };
    $.pivotUtilities.gchart_renderers = {
      "Pie Chart": makeGoogleChart("PieChart"),
      "Donut Chart": makeGoogleChart("PieChart", {
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

