
function cartesianProductOf(array) {
    return _.reduce(array, function(a, b) {
        return _.flatten(_.map(a, function(x) {
            return _.map(b, function(y) {
                return x.concat([y]);
            });
        }), true);
    }, [ [] ]);
};

function BoxPlotChartData(pivotData, exclusions) {
    var h = pivotData.getRowKeys();
    var value_color_scale = d3.scale.category10();
    var rowCategoricalVariables = [];
    

    h.map(function(k, i) {
        var value_class = k.join(",");
        rowCategoricalVariables.push({ text: value_class, color: value_color_scale(i),
            deciders: 
                k.map(function(kk) { 
                        var n = kk.lastIndexOf(":");

                        var label = kk.substr(0,n);
                        var value = kk.substr(n+1);
                        return function(elem) { return elem[label] == value; }
                    })
        })
    });
    rowCategoricalVariables.sort();

    var v = pivotData.colAttrs;
    var boxPlot = pivotData.input.boxplot;

    var numberVariables = [], columnCategoricalVariables = [];
    v.map(function(label, nthColumn) {
        if (boxPlot.colNumbers[nthColumn])
            numberVariables.push( { label: label, decide: function(elem) { return !isNaN(elem[label]); } });
        else  {
            columnCategoricalVariables.push(
                boxPlot.allColValues[nthColumn]
                .filter(function(value) { return !(label in exclusions && exclusions[label].indexOf(value) >= 0); })
                .map(
                  function (value) { 
                      return ({ label: label+":"+value, decide: function(elem) { return elem[label] == value; } });
                })
            );
        }
    });;
    columnCategoricalVariables.splice(0 ,0, numberVariables)
    var plots = cartesianProductOf(columnCategoricalVariables);
    var plotDataSets = plots.map(function(plotPredicates) {
        var labels = _.pluck(plotPredicates, 'label').join("\n").replace(/:/g, "\n");
        var points = [];
        var plot = [labels, points];

        pivotData.input.map(function(elem, e) {
            var good = true;
            for (var p = 0; good && p < plotPredicates.length; p++)
                if (!plotPredicates[p].decide(elem))
                    good = false;

            var value_class = null;
            var value_color = null;

            for (var p = 0; good && p < rowCategoricalVariables.length; p++) {
                var deciders = rowCategoricalVariables[p].deciders;
                var oneIsGood = false;
                for (var q = 0; good && q < deciders.length; q++) {
                    if (deciders[q](elem)) {
                        oneIsGood = true;
                    }
                }
                if (oneIsGood) {
                    value_class = rowCategoricalVariables[p].text;
                    value_color = rowCategoricalVariables[p].color;
                }
            }

            if (good) {
                var value = elem[plotPredicates[0].label];
                var f = parseFloat(value);
                var g = { 
                    Patient: elem.Sample_ID, 
                    ValueClass: value_class, 
                    ValueColor: value_color,
                    Phenotype: value_class ,
                    Value: f,
                };
                points.push(g);
            }
        });
        return plot;
    });
    h = h.join(",");
    v = v.join(",");
    return [plotDataSets, h, v, rowCategoricalVariables];
}

var ChartHeightMax = 2048;
var ChartWidthMax = 2048;
var PlotHeight = 500;

var plotWidth, width,height;
var margin = {top: 50, right: 00, bottom: 40, left: 10, leftMost: 10};


window.makeD3BoxPlotChart= function(chartType, extraOptions) {
  return function(pivotData, opts, exclusions) {
        var chvk = BoxPlotChartData(pivotData, exclusions);
        var n = 9;

        plotWidth = Math.max(150, ChartWidthMax/ n);
        width = plotWidth - margin.left - margin.right,
        height = PlotHeight - margin.top - margin.bottom;



        var plotDataSets = chvk[0];
        var v = chvk[1];
        var h = chvk[2];
        var rowCategoricalVariables = chvk[3];
        
        if (window.$div != null) {
            window.$div.remove();
            window.$div = null;
        }

        if (window.$div == null) {
            window.$div = $("<div class='d3boxplot'></div>");
            var div = window.$div[0];
            $div.ready(function() {
                displayBoxPlots(plotDataSets, h, v, div, plotWidth, rowCategoricalVariables);
            });
        }
        var postBtn = $('<button type="button" onclick="postButton()" style="margin:10px;" class="btn btn-default">Post</button>').  
            appendTo(window.$div);
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


function displayBoxPlots(plotDataSets, h, v, svgContainer, plotWidth, rowCategoricalVariables) {

    var min = Infinity,
        max = -Infinity,
        lineHeight = 18;

    var maxNumLines = 0;
    plotDataSets.map(function(p) {
        maxNumLines = Math.max(maxNumLines, p[0].split(/\n/).length);
    });

    var baseline = margin.top + (maxNumLines * lineHeight);

    plotDataSets.map(function (plotDataSet)  {
        plotDataSet[1].map(function (elem, i) {
            if (elem.Value > max) max = elem.Value;
            if (elem.Value < min) min = elem.Value;
        });
    }); 

    window.yRange = d3.scale.linear().range([0, height]).domain([max, min]);

    var chart = d3.box()
        .whiskers(iqr(1.5))
        .width(width)
        .height(height);

    chart.domain([min, max]);

      var X = margin.leftMost;

      var svgTop = d3.select(svgContainer).append("svg").attr("width", ChartWidthMax).attr("height", ChartHeightMax).attr("class", "svgTop")
      var svgBoxPlot = svgTop.append("svg").attr("class", "svgBoxPlot");

      var yAxis = d3.svg.axis().scale(yRange).ticks(5).orient("left").tickSize(5,0,5);
      svgTop.append("g").attr('class', 'axis').attr("transform", "translate(30, " + baseline + " )").call(yAxis);

      svg = svgBoxPlot
          .selectAll("svg")
          .data(plotDataSets)
          .enter()
          .append("g")
             .attr("transform", function() { 
                  var r =  "translate(" +  X + ", " + 0 + ")"
                  X += plotWidth;
                  return r;
              })
         .append("svg")
          .attr("class", "box svgPlot")
          .attr("width", 40 + width + margin.left + margin.right)
          .attr("height", 50 + height + margin.bottom + margin.top)
        .append("g")
          .attr("transform", function() { 
                  var r =  "translate(" + (20+ margin.left)  + "," +  baseline + ")"
                  return r;
                  });

    function wrap(text, width, svg) {
      text.each(function() {
        var text = d3.select(this),
            lines = text.text().replace(/_/g, " ").split(/[\n]/),
            lineNumber = 1,
            y = text.attr("y");

        var y = (lineNumber++ * -lineHeight)
        var line = lines.pop();
        var tspan = text.text(line).attr("y", y );

        while ((line = lines.pop()) != null) {
          y = (lineNumber++ * -lineHeight)
          tspan = text.append("tspan").attr("x", width/2).attr("y", y).text(line)
                .attr( 'text-anchor', 'middle' )
                .attr( 'font-size', "16px" )
                .attr( 'font-weight', "bold" )
        }
      });
    }

      var yy = svg.insert("text", "box")
                .attr( 'x', width/2)
                .attr( 'y', -20)
                .attr( 'text-anchor', 'middle' )
                .attr( 'font-size', "16px" )
                .attr( 'font-weight', "bold" )
                .text( function(d) { return d[0] })
                .call(wrap, plotWidth)
       

      svg.call(chart);

      var gLegend = svgTop
                      .append("g").attr("transform", 
                              function() { return "translate(" +  (X+50)  + ", 50)"; })
                          .append("svg");


      var wrap = gLegend.selectAll('g.gLegendItem').data(rowCategoricalVariables)
      var legend = wrap.enter().append('g').attr('class', 'gLegendItem').append('g')
      legend.attr("width", 100);
      legend.attr("height", 20);
      legend
          .append("g").attr("x", 20)
          .append('circle').style("fill", function(a, i) {return a.color })
          .style('stroke', "#000")
          .style('stroke-width', 1) .attr('class','gLegendItem-symbol') .attr('r', 5);

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
      series.select('circle').style("fill", function(d) { return d.color });

      svgTop.attr("width", X + 500); // approximate size of legend
      svgTop.attr("height", PlotHeight +margin.top + margin.bottom);

      setTimeout(function() {
          var legendText =  d3.selectAll("text.legendText");
          if (legendText && legendText.length > 0)
            legendText = legendText[0];
          if (legendText && legendText.length > 0) {
              var maxX = Math.max.apply(null, legendText.map(function(f) {return f.getComputedTextLength()}))
              if (!isNaN(maxX) && isFinite(maxX)) {
                  console.log("maxX", maxX);
                  svgTop.attr("width", X + 100 + maxX); 
              }
              var maxY = Math.max(1024, PlotHeight, 100 + (legendText.length * 20));
              if (!isNaN(maxY) && isFinite(maxY)) {
                  console.log("maxY", maxY);
                  svgTop.attr("height", maxY); 
                  gLegend.attr("height", maxY); 
              }
          }
      },200)

};

