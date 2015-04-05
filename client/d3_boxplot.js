
function BoxPlotChartData(pivotData) {
    var h = pivotData.getColKeys();
    var v = pivotData.rowAttrs;
    plotDataSets = [];
    predicateObjects = [];
    h.map(function (predicatesArray) { 
        plotDataSet = [];
        plotDataSets.push([
            predicatesArray.join(","),
            plotDataSet]);

        predicateObject = {};
        predicatesArray.map(function(predicate) {
            var p = predicate.split(":");
            predicateObject[p[0]] = p[1];
        });
        predicateObjects.push(predicateObject)
    });

    value_color =  "blue";
    value_class =  "positive";

    pivotData.input.map(function(elem) {
        predicateObjects.map(function(predicate, i) {
            var good = true;
            Object.keys(predicate).map(function(key) {
                if (predicate[key] == elem[key])
                    good = false;
            });
            if (good) {
                var value = elem[v[0]];
                if (value == "N/A")
                    return;

                
                var f = parseFloat(value);

                var g = { Formula: plotDataSets[i][1].length, 
                        Patient: elem.Sample_ID, 
                        ValueClass: value_class, 
                        ValueColor: value_color, 
                        Phenotype: "" ,
                        Value: f,
                      };
                plotDataSets[i][1].push(g);
            }
        });
    });
    h = h.join(",");
    v = v.join(",");
    return [plotDataSets, h, v];
}
window.makeD3Chart= function(chartType, extraOptions) {
  return function(pivotData, opts) {
        var chv = BoxPlotChartData(pivotData);

        var plotDataSets = chv[0];
        var h = chv[1];
        var v = chv[2];

        if (window.$div == null) {
            window.$div = $("<div class='d3boxplot'></div>");
            var div = window.$div[0];
            displayBoxPlots(plotDataSets, h, v, div);
        }
        return window.$div
    }
};
var margin = {top: 50, right: 50, bottom: 20, left: 50},
    width = 320 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;



function randomize(d) {
  if (!d.randomizer) d.randomizer = randomizer(d);
  return d.map(d.randomizer);
}

function randomizer(d) {
  var k = d3.max(d) * .02;
  return function(d) {
    return Math.max(min, Math.min(max, d + k * (Math.random() - .5)));
  };
}

// Returns a function to compute the interquartile range.
function iqr(k) {
  return function(d, i) {
    var q1 = d.quartiles[0],
        q3 = d.quartiles[2],
        iqr = (q3 - q1) * k,
        i = -1,
        j = d.length;
    while (d[++i] < q1 - iqr);
    while (d[--j] > q3 + iqr);
    return [i, j];
  };
}


function displayBoxPlots(plotDataSets, h, v, svgContainer) {

    var min = Infinity,
        max = -Infinity;


    plotDataSets.map(function (plotDataSet)  {
        plotDataSet[1].map(function (elem, i) {
            if (elem.Value > max) max = elem.Value;
            if (elem.Value < min) min = elem.Value;
        });
    }); 
    var chart = d3.box()
        .whiskers(iqr(1.5))
        .width(width)
        .height(height);


    chart.domain([min, max]);

  svg = d3.select("body").append("svg")
      .data(plotDataSets)
    .enter().append("svg")
      .attr("class", "box")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.bottom + margin.top + 20)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    /*
  svg.insert("text", "box")
            .attr( 'x', width/2)
            .attr( 'y', -20)
            .attr( 'text-anchor', 'middle' )
            .attr( 'font-size', "16px" )
            .attr( 'font-weight', "bold" )
            .text( function(d) { return d.text });
    */

  svg.call(chart);

};

