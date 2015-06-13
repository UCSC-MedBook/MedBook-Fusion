

function ScatterChartData(pivotData, exclusions) {
    var colors = ["#f898e8", "#f87859", "#ffad33", "#00b6ff", "#ee6900", "#00a167", "#005d4d", "#d0ecb2", "#de6d8a", "#862e7b", "#861a41", "#00fadb", "#006fdb", "#006a97", "#ffbdb5", "#835de7", "#374e14", "#acb20e", "#00def7", "#00cb2d", "#901500", "#ccccff"];
    var h = pivotData.colAttrs;
    var v = pivotData.rowAttrs;

    var xk = Object.keys(exclusions);
    var data = pivotData.input.filter(function(elem) {
        for (var i = 0; i < xk.length; i++) {
            var k = xk[i];
            var v = exclusions[k];
            if (v.indexOf(String(elem[k])) >= 0)
                return false;
        }
        return true;
    });

    var x = h.shift();
    var y = v.shift();

    function unique(attribute) { 
        var values = new Map();
        data.map(function(elem) { values[elem[attribute]] = 1; }); 
        return Object.keys(values).map(function(value)  { return [ attribute, value] });
    }

    var predicates = cartesianProductOf(h.concat(v).map(unique));

    var legend = $('<div class="legend" style="float:right;">');
    predicates.map(function(p, i) {
        var line = $("<div>").appendTo(legend);
        $("<div style='display:inline-block;'>").css({
          background: colors[i],
          width: "20px",
          height: "20px",
          "border-radius": "50%",
        }).appendTo(line);

        $("<span>"  
            + p.map(function(pp) { return pp[0] + "=" + pp[1] }).join(",&nbsp")
            + "</span>").appendTo(line);
    });

    var rows = [];
    data.map(function(elem) {
        try {
            var row = {c:[]};
            row.c.push({v: parseFloat(elem[x])});
            row.c.push({v: parseFloat(elem[y])});
            var s = elem.Sample_ID || elem.Patient_ID;
            function f(e) { 
                var ee = elem[e];
                var ff = parseFloat(ee);
                ee = isNaN(ff) ? ee : ff.toPrecision(4);
                s += "\n" + e + "=" + ee;
            };
            h.map(f);
            v.map(f);
            row.c.push({v: s});

            var  color = null;
            for (var i = 0; i < predicates.length; i++) 
                if (_.every(predicates[i], function(predicate) {
                    return elem[predicate[0]] == predicate[1];
                })) {
                    color = colors[i];
                    break;
                }

            row.c.push( {v: 'point { size: 12; shape-type: circle; fill-color: ' + color });
            rows.push(row);
        } catch (why) {
        }

    });


    var cols = [{id: 'A', label: x, type: 'number'},
           {id: 'B', label: 'y', type: 'number'},
           {id: 'C', label: 'Name',  type:'string',  p:{role:'tooltip'}},
           {id: 'D', label: 'Style', type:'string',  p:{role:'style'}}
    ];

    return [{ cols: cols, rows:  rows }, x, y, legend];
}


window.makeGoogleScatter = function(chartType, extraOptions) {
      return function(pivotData, opts, exclusions) {

        if (chartType != "ScatterChart")
            return $("<div>Internal Error: unknown chart type:" + chartType + "</div>");

        var rhvl =  ScatterChartData(pivotData, exclusions);

        var data = rhvl[0];
        var h    = rhvl[1];
        var v    = rhvl[2];
        var l    = rhvl[3];

        var dataTable = new google.visualization.DataTable(data, true);

        result = $("<div class='ChartWrapper' >some text</div>").css({
          width: "800px",
          height: "600px"
        });
        // l.appendTo(result);

        var options = {
          title: h + ' vs. ' + v + ' comparison',
          hAxis: {title: h},
          vAxis: {title: v},
          legend: 'none',
          'width':800,
          'height':600
        };

        wrapper = new google.visualization.ChartWrapper({
          dataTable: dataTable,
          chartType: chartType,
          options: options
        });
        result[0].wrapper = wrapper;

        wrapper.draw(result[0]);
        l.appendTo(result);
        return result;

      }

}
