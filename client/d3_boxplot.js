
function BoxPlotChartData(pivotData) {

    /*
    var h = pivotData.getColKeys();
    var v = pivotData.rowAttrs;
    */
    var h = pivotData.getRowKeys();
    var v = pivotData.colAttrs;
    plotDataSets = [];
    predicateObjects = [];
    plotDataSet = [];
    plotDataSets.push([ "foo" /*predicatesArray.join(",") */, plotDataSet]);
    h.map(function (predicatesArray) { 

        predicateObject = {};
        predicatesArray.map(function(predicate) {
            var p = predicate.split(":");
            predicateObject[p[0]] = p[1];
        });
        predicateObjects.push(predicateObject)
    });
    var value_color_scale = d3.scale.category10();

    var colorKey = []
    h.map(function(k, i) {
        var value_class = h[i].join(",");
        colorKey.push({ text: value_class, color: value_color_scale(i) });
    });
    colorKey.sort();

    pivotData.input.map(function(elem, j) {
        predicateObjects.map(function(predicate, i) {
            var good = true;
            Object.keys(predicate).map(function(key) { if (predicate[key] == elem[key]) good = false; });
            if (good) {
                var value = elem[v[0]];
                if (value == "N/A") return;
                var f = parseFloat(value);
                var value_color = value_color_scale(i);
                var value_class = h[i].join(",");
                var g = { Formula: plotDataSets[0][1].length, 
                        Patient: elem.Sample_ID, 
                        ValueClass: value_class, 
                        ValueColor: value_color,
                        Phenotype: value_class ,
                        Value: f,
                      };
                plotDataSets[0][1].push(g);
            }
        });
    });
    h = h.join(",");
    v = v.join(",");
    return [plotDataSets, h, v, colorKey];
}

var totalWidth, width,height;
var margin = {top: 50, right: 00, bottom: 40, left: 10, leftMost: 10};

window.makeD3Chart= function(chartType, extraOptions) {
  return function(pivotData, opts) {
        var chvk = BoxPlotChartData(pivotData);
        var n = 9;

        totalWidth = Math.max(150, 1024/ n);
        width = totalWidth - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;



        var plotDataSets = chvk[0];
        var v = chvk[1];
        var h = chvk[2];
        var colorKey = chvk[3];
        
        if (window.$div != null) {
            window.$div.remove();
            window.$div = null;
        }

        if (window.$div == null) {
            window.$div = $("<div class='d3boxplot'></div>");
            var div = window.$div[0];
            $div.ready(function() {
                displayBoxPlots(plotDataSets, h, v, div, totalWidth, colorKey);
            });
        }
        return window.$div
    }
};


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


function displayBoxPlots(plotDataSets, h, v, svgContainer, totalWidth, colorKey) {

    var min = Infinity,
        max = -Infinity;


    plotDataSets.map(function (plotDataSet)  {
        plotDataSet[1].map(function (elem, i) {
            if (elem.Value > max) max = elem.Value;
            if (elem.Value < min) min = elem.Value;
        });
    }); 

    var domain = [3, -3]
    window.yRange = d3.scale.linear().range([0, height]).domain(domain);

    var chart = d3.box()
        .whiskers(iqr(1.5))
        .width(width)
        .height(height);


    // chart.domain([min, max]);
    chart.domain([-3, 3]);


  var X = margin.leftMost;

  var svgTop = d3.select(svgContainer).append("svg").attr("width", 1024).attr("height", 1024).attr("class", "svgTop")
  var svgBoxPlot = svgTop.append("svg").attr("class", "svgBoxPlot");

  var yAxis = d3.svg.axis().scale(yRange).ticks(5).orient("left").tickSize(5,0,5);
  svgTop.append("g").attr('class', 'axis').attr("transform", "translate(30, " + margin.top + ")").call(yAxis);

  svg = svgBoxPlot
      .selectAll("svg")
      .data(plotDataSets)
      .enter()
      .append("g")
         .attr("transform", function() { 
              var r =  "translate(" +  X + ", 0)"
              X += totalWidth;
              return r;
          })
     .append("svg")
      .attr("class", "box svgPlot")
      .attr("width", 40 + width + margin.left + margin.right)
      .attr("height", height + margin.bottom + margin.top)
    .append("g")
      .attr("transform", function() { 
              var r =  "translate(" + (20+ margin.left)  + "," + margin.top + ")"
              return r;
              });


  svg.insert("text", "box")
            .attr( 'x', width/2)
            .attr( 'y', -20)
            .attr( 'text-anchor', 'middle' )
            .attr( 'width', totalWidth )
            .attr( 'font-size', "16px" )
            .attr( 'font-weight', "bold" )
            .text( function(d) { return d[0] });

  svg.call(chart);

  var gLegend = svgTop
                  .append("g").attr("transform", 
                              function() { return "translate(" +  (X+50)  + ", 50)"; })
                      .append("svg");


  var wrap = gLegend.selectAll('g.gLegendItem').data(colorKey)
  var legend = wrap.enter().append('g').attr('class', 'gLegendItem').append('g')
  legend.attr("width", 100);
  legend.attr("height", 20);
  legend
      .append("g").attr("x", 20)
      .append('circle').style("fill", function(a, i) {return a.color })
      .style('stroke-width', 2) .attr('class','gLegendItem-symbol') .attr('r', 5);

  legend
      .append("g")
      .append('text').attr("x", 15).attr("y", 5)
      .attr("class", "legendText")
      .attr("text-anchor", "start")
      .attr("fill", "black")
      .text(function(d) { return d.text });

  var g = wrap.select('g');
  wrap.attr('transform', function(a,i) { return 'translate(' + margin.left + ',' + (margin.top +(i*20)) + ')'});
  var series = g.selectAll('.gSeries').data(function(d) { return d });
  var seriesEnter = series.enter().append('g').attr('class', 'gSeries')

  /*
  g.append('text').attr('text-anchor', 'start').attr('class','gLegendItem-text').attr('dy', '.32em')
  .attr("text", function(d) { 
      debugger;
      return d.text});
  */

  series.select('circle').style("fill", function(d) { return d.color });


};

