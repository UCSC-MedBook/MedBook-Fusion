
window.makeD3Scatter = function(chartType, extraOptions) {
  return function(pivotData, opts, exclusions) {

    if (chartType != "ScatterChart")
        return $("<div>Internal Error: unknown chart type:" + chartType + "</div>");

    var wrapper = $("<div id='wrapper' >").css({ width: "800px", height: "600px" });
    var viz = $("<div id='viz' >").css({ "margin-top": "20px", width: "800px", height: "600px" }).appendTo(wrapper);
    $("<div id='stat' class='stat'title='two-tail P-value'>" ).css({ width: "100%", height: "50" }).appendTo(wrapper);

    var colors = ["#f898e8", "#f87859", "#ffad33", "#00b6ff", "#ee6900", "#00a167", "#005d4d", "#d0ecb2", "#de6d8a", "#862e7b", "#861a41", "#00fadb", "#006fdb", "#006a97", "#ffbdb5", "#835de7", "#374e14", "#acb20e", "#00def7", "#00cb2d", "#901500", "#ccccff"];
    var h = _.clone(pivotData.colAttrs);
    var v = _.clone(pivotData.rowAttrs);

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

    var x = h.shift();
    var y = v.shift();

    function unique(attribute) { 
        var values = new Map();
        data.map(function(elem) { values[elem[attribute]] = 1; }); 
        return Object.keys(values).map(function(value)  { return [ attribute, value] });
    }

    var predicates = cartesianProductOf(h.concat(v).map(unique));

    var legend = $('<div class="legend" style="float:right;margin-right:20px;">').appendTo(wrapper);
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
    var maxX = -Infinity;
    var maxY = -Infinity;
    var minX = Infinity;
    var minY = Infinity;
    data.map(function(elem) {
        try {
            var xx = parseFloat(elem[x]);
            var yy = parseFloat(elem[y]);
            if (isNaN(xx)) return;
            if (isNaN(yy)) return;

            var row = [];
            row.push(xx)
            row.push(yy)

            if (maxX < xx) maxX = xx;
            if (maxY < yy) maxY = yy;
            if (minX > xx) minX = xx;
            if (minY > yy) minY = yy;

            var s = elem.Sample_ID || elem.Patient_ID;
            function f(e) { 
                var ee = elem[e];
                var ff = parseFloat(ee);
                ee = isNaN(ff) ? ee : ff.toPrecision(4);
                s += "\n" + e + "=" + ee;
            };
            h.map(f);
            v.map(f);
            row.push({v: s});

            var  color = null;
            for (var i = 0; i < predicates.length; i++) 
                if (_.every(predicates[i], function(predicate) {
                    return elem[predicate[0]] == predicate[1];
                })) {
                    color = colors[i];
                    break;
                }

            row.push( { size: 5, shape: "circle", "fill-opacity": 0, "stroke-width": 2, "fill":  color });
            rows.push(row);
        } catch (why) {
        }

    });


    setTimeout(function() {
        addViz(rows, x, y, legend, Math.floor(minX), Math.floor(minY), Math.ceil(maxX), Math.ceil(maxY));
        addMedBookButtons(wrapper, null);
    }, 200);
    return wrapper;
  }
} // makeD3Scatter()


function addViz(z, h, v, l, minX,minY,maxX,maxY) {
    if (minX > 0 && minX < 5 && maxX > 5) minX = 0;
    if (minY > 0 && minY < 5 && maxY > 5) minY = 0;

// D3
    var margin = {top: 10, right: 20, bottom: 40, left: 70},
    width = parseInt(d3.select('#viz').style('width'), 10) - margin.left - margin.right,
    height = parseInt(d3.select('#viz').style('height'), 10) - margin.top - margin.bottom,
    x_scale = d3.scale.linear() .range([0, width]) .domain([minX,maxX]),
    y_scale = d3.scale.linear() .range([height, 0]).domain([minY,maxY]);

    var xAxis = d3.svg.axis().scale(x_scale).ticks(5).orient("bottom");
    var yAxis = d3.svg.axis().scale(y_scale).ticks(5).orient("left");

    var svg = d3.select("#viz").append("svg").attr("id", "vizsvg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");   

    svg.append("g").attr("class", "axis").call(yAxis);
    svg.append("g").attr("class", "axis").attr("transform", "translate(0," + height + ")") .call(xAxis);

    svg.append("text")
    .attr("class", "x-label")
    .attr("text-anchor", "middle")
    .attr("x", (width/2))
    .attr("y", height - 6 + margin.bottom)
    .text(h);

    svg.append("text")
    .attr("class", "y-label")
    .attr("text-anchor", "middle")
    .attr("y", - 50)
    .attr("x", - (height/2) -5)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text(v);
        

    function dots(z) {
         var dots = svg.selectAll(".dot")
          .data(z)

          dots.enter().append("circle")
               .attr("class", "dot")
               .attr("r", 7)
            .attr("cx", function(d) { return x_scale(d[0]); })
            .attr("cy", function(d) { return y_scale(d[1]); })
            .attr("fill", function(d) { return d[3].fill; });

          dots.exit().remove();
    }
    dots(z);

    var reg = regression('linear', z);
    var a = reg.equation[0];
    var b = reg.equation[1];
    var x1 = minX;
    var x2 = maxX;
    var y1 = (a * minX) + b;
    var y2 = (a * maxX) + b;

    lm_line = svg.append("line")
       .attr("class", "lm-line")
       .attr("x1", x_scale(x1))
       .attr("x2", x_scale(x2))
       .attr("y1", y_scale(y1))
       .attr("y2", y_scale(y2));

    d3.select("#stat").text(reg.stat);
}

