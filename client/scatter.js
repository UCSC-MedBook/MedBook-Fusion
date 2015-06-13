function ScatterChartData(pivotData, exclusions) {
    var h = pivotData.colAttrs;
    var v = pivotData.rowAttrs;

    var borrow  = BoxPlotChartData(pivotData, exclusions);

    var data = pivotData.input;
    var order = [];

    var x = h[0];
    var y = v[0];

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
            row.c.push( {v: 'point { size: 18; shape-type: star; fill-color: #a52714'} );
            rows.push(row);
        } catch (why) {
        }

    });


    var cols = [{id: 'A', label: x, type: 'number'},
           {id: 'B', label: 'y', type: 'number'},
           {id: 'C', label: 'Name',  type:'string',  p:{role:'tooltip'}},
           {id: 'D', label: 'Style', type:'string',  p:{role:'style'}}
    ];

    return [{ cols: cols, rows:  rows }, x, y];
}


window.makeGoogleScatter = function(chartType, extraOptions) {
      return function(pivotData, opts, exclusions) {

        if (chartType != "ScatterChart")
            return $("<div>Internal Error: unknown chart type:" + chartType + "</div>");

        var rhv =  ScatterChartData(pivotData, exclusions);

        var data = rhv[0];
        var h    = rhv[1];
        var v    = rhv[2];

        var dataTable = new google.visualization.DataTable(data, true);

        result = $("<div class='ChartWrapper' >").css({
          width: "800px",
          height: "600px"
        });

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
        return result;

      }

}
