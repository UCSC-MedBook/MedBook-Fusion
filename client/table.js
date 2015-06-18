

function TableData(pivotData, exclusions) {

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
    Session.set("ChartDataFinal", data);

    var attrs = pivotData.colAttrs.concat(pivotData.rowAttrs);

    return data.map(function(elem) { 
        var s =  { } ;
        s.Patient_ID = elem.Patient_ID;
        if ("Sample_ID" in elem)
            s.Sample_ID = elem.Sample_ID;
        attrs.map(function(key) {  s[key] = elem[key]; });
        return s;
    });
}


window.makeReactiveTable = function(chartType, extraOptions) {
      return function(pivotData, opts, exclusions) {

        var result = $("<div class='ChartWrapper' >").css({
          "min-width": "800px",
          "min-height": "600px"
        });

        var data =  TableData(pivotData, exclusions);
        var html = Blaze.renderWithData(Template.Inspector, { data: data }, result[0]);
        addMedBookButtons(result, null);

        return result;
      }
}
