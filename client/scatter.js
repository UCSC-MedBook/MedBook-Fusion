function ScatterChartData(pivotData) {
    var h = pivotData.colAttrs;
    var v = pivotData.rowAttrs;

    var data = [];
    var order = [];
    h.map(function (i) { order.push(i) });
    v.map(function (i) { order.push(i) });

    var rows = [];
    rows.push(order);

    pivotData.input.map(function(elem) {
        var row = [];
        var good = true;
        order.map(function(a) {
            var ea = elem[a];
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
}


window.makeGoogleScatter = function(chartType, extraOptions) {
      return function(pivotData, opts) {

        if (chartType != "ScatterChart")
            return $("<div>Internal Error: unknown chart type:" + chartType + "</div>");

        var rhv =  ScatterChartData(pivotData);
        var rows = rhv[0];
        var h    = rhv[1];
        var v    = rhv[2];

        var dataTable = google.visualization.arrayToDataTable(rows, true);

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
