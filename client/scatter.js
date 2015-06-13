function ScatterChartData(pivotData) {
    var h = pivotData.colAttrs;
    var v = pivotData.rowAttrs;

    var data = [];
    var order = [];

    var x = h[0];
    var y = v[0];

    var rows = [
           {c:[{v: 12}, {v: 40}, {v:'Allen'}]},
           {c:[{v: 16}, {v: 45}, {v:'Tom'}]},
           {c:[{v: 17}, {v: 60}, {v:'Sim'}]}
          ];
    var cols = [{id: 'A', label: 'Age', type: 'number'},
           {id: 'B', label: 'Response', type: 'number'},
           {id: 'C', label: 'Name', type:'string', p:{role:'tooltip'}} ];

    return [{ cols: cols, rows:  rows }, "foo", "bar"];

    /*
    h.map(function (i) { order.push(i) });
    v.map(function (i) { order.push(i) });

    var rows = [];
    rows.push(order);

    pivotData.input.map(function(elem) {
        var row = [];
        var good = true;
        order.map(function(a) {
            var ea = elem[a];
            debugger;
            if (ea == "N/A")
                good = false;
            else
                row.push( parseFloat(ea));
        });
        if (good)
            rows.push(row);
    });


    h = h.join(",");
    v = v.join(",");
    return [rows, h, v];
    */
}


window.makeGoogleScatter = function(chartType, extraOptions) {
      return function(pivotData, opts) {

        if (chartType != "ScatterChart")
            return $("<div>Internal Error: unknown chart type:" + chartType + "</div>");

        var rhv =  ScatterChartData(pivotData);
        var data = rhv[0];
        var h    = rhv[1];
        var v    = rhv[2];

        var dataTable = new google.visualization.DataTable(data, true);

        result = $("<div class='ChartWrapper' >").css({
          width: "100%",
          height: "100%"
        });

        var options = {
          title: h + ' vs. ' + v + ' comparison',
          hAxis: {title: h},
          vAxis: {title: v},
          legend: 'none'
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
