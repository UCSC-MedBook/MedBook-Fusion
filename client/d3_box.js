(function() {

 // the initial seed
seed = 6;
  
// in order to work 'Math.seed' must NOT be undefined,
// so in any case, you HAVE to provide a Math.seed
seededRandom = function(max, min) {
        max = max || 1;
        min = min || 0;
seed = (seed * 9301 + 49297) % 233280;
var rnd = seed / 233280;

return min + rnd * (max - min);
}

// Inspired by http://informationandvisualization.de/blog/box-plot
d3.box = function() {
  var width = 1,
      height = 1,
      duration = 0,
      domain = null,
      value = Number,
      whiskers = boxWhiskers,
      quartiles = boxQuartiles,
      tickFormat = null;

  // For each small multiple…
  function box(g) {
    g.each(function(dataSet, i) {

      var full = dataSet[1].sort( function (a, b) { 
             return a.Value < b.Value ? -1 : a.Value > b.Value ? 1 : a.Value >= b.Value ? 0 : NaN; });
      var d = full.map(function(a) { return a.Value;});

      for (var i = 0; i < full.length; i++) {
         var f = full[i];
         f.r = 5
         f.cx = width/2;
         f.cy = f.Value;
      }

      var g = d3.select(this),
          n = d.length,
          min = d[0]
          max = d[n - 1];

      // Compute quartiles. Must return exactly 3 elements.
      var quartileData = d.quartiles = quartiles(d);

      // Compute whiskers. Must return exactly 2 elements, or null.
      var whiskerIndices = whiskers && whiskers.call(this, d, i),
          whiskerData = whiskerIndices && whiskerIndices.map(function(i) { return d[i]; });

      // Compute the new x-scale.
      /*
      var x1 = d3.scale.linear()
          // .domain(domain && domain.call(this, d, i) || [min, max])
          .domain([-3, 3])
          .range([height, 0]);

      // Retrieve the old x-scale, if this is an update.
      var x0 = this.__chart__ || d3.scale.linear()
          // .domain([0, Infinity])
          .domain([-3, 3])
          .range(x1.range());
      */
      var x1 = yRange;
      var x0 = yRange;

      // Stash the new scale.
      this.__chart__ = x1;

      // Note: the box, median, and box tick elements are fixed in number,
      // so we only have to handle enter and update. In contrast, the samples
      // and other elements are variable, so we need to exit them! Variable
      // elements also fade in and out.

      // Update center line: the vertical line spanning the whiskers.
      var center = g.selectAll("line.center")
          .data(whiskerData ? [whiskerData] : []);

      center.enter().insert("line", "rect")
          .attr("class", "center")
          .attr("x1", width / 2)
          .attr("y1", function(d) { return x0(d[0]); })
          .attr("x2", width / 2)
          .attr("y2", function(d) { return x0(d[1]); })
          .style("opacity", 1)
        .transition()
          .duration(duration)
          .style("opacity", 1)
          .attr("y1", function(d) { 
                  console.log("trans rect y1", d[0]);
                  return x1(d[0]); })
          .attr("y2", function(d) { 
                  console.log("trans rect y2", d[1]);
                  return x1(d[1]); });


      center.transition()
          .duration(duration)
          .style("opacity", 1)
          .attr("y1", function(d) { return x1(d[0]); })
          .attr("y2", function(d) { return x1(d[1]); });

      center.exit().transition()
          .duration(duration)
          .style("opacity", 1e-6)
          .attr("y1", function(d) { return x1(d[0]); })
          .attr("y2", function(d) { return x1(d[1]); })
          .remove();

      // Update innerquartile box.
      var box = g.selectAll("rect.box")
          .data([quartileData]);

      box.enter().append("rect")
          .attr("class", "box")
          .attr("x", 10)
          .attr("y", function(d) { 
                  console.log("box d2",d[2]); 
                  return x0(d[2]); })
          .attr("width", width -20)
          .attr("height", function(d) { 
                  console.log("box d0",d[0]); 
                  return x0(d[0]) - x0(d[2]); })
          // .style("fill", "transparent")
          .style("pointer-events", "none")
        .transition()
          .duration(duration)
          .attr("y", function(d) { return x1(d[2]); })
          .attr("height", function(d) { return x1(d[0]) - x1(d[2]); });


      box.transition()
          .duration(duration)
          .attr("y", function(d) { return x1(d[2]); })
          .attr("height", function(d) { return x1(d[0]) - x1(d[2]); });

      // Update median line.
      var medianLine = g.selectAll("line.median")
          .data([quartileData[1]]);

      medianLine.enter().append("line")
          .attr("class", "median")
          .attr("x1", 0 +10)
          .attr("y1", x0)
          .attr("x2", width -20)
          .attr("y2", x0)
        .transition()
          .duration(duration)
          .attr("y1", x1)
          .attr("y2", x1);

      medianLine.transition()
          .duration(duration)
          .attr("y1", x1)
          .attr("y2", x1);

      // Update whiskers.
      var whisker = g.selectAll("line.whisker")
          .data(whiskerData || []);

      whisker.enter().insert("line", "circle, text")
          .attr("class", "whisker")
          .attr("x1", 10)
          .attr("y1", x0)
          .attr("x2", width -20)
          .attr("y2", x0)
          .style("opacity", 1e-6)
        .transition()
          .duration(duration)
          .attr("y1", x1)
          .attr("y2", x1)
          .style("opacity", 1);

      whisker.transition()
          .duration(duration)
          .attr("y1", x1)
          .attr("y2", x1)
          .style("opacity", 1);

      whisker.exit().transition()
          .duration(duration)
          .attr("y1", x1)
          .attr("y2", x1)
          .style("opacity", 1e-6)
          .remove();

      // Update samples.
      var sample = g.selectAll("circle.sample")
          .data(full)

      sample.enter().insert("circle", "text")
          .attr("class", function(d) { 
                      return d.ValueClass; })
          .attr("cx", function(d) { return d.cx; })
          .attr("cy", function(d) { return d.cy; })
          .attr("r", function(d) { return d.r; })
          .style("opacity", 0.2)
          .style("fill", function(d) { return d.ValueColor });

      var div = d3.select("body").append("div")   
          .attr("class", "tooltip")               
          .style("opacity", 0);

      sample
        .on("mouseover", function(d) {
            div.transition()        
                .duration(200)      
                .style("display", "block")
                .style("opacity", .9);      

            var m = d.Patient + "<br/>" + 
                ( d.Phenotype == null ? "" : (d.Phenotype.replace("_", "&nbsp;") + "<br/>" ))
                 + d.Value.toFixed(3);
            div.html(m)
                .style("left", (d3.event.pageX) + "px")     
                .style("top", (d3.event.pageY - 28) + "px");    
            })                  
        .on("mouseout", function(d) {       
            div.transition()        
                .duration(500)      
                .style("opacity", 0);   
        });


      sample.forEach(function(formula,i) {
          formula.forEach(function(sample,j) {
              sample.cx.baseVal.value += (seededRandom()-0.5)*width; // Robert wants noise!
          });
      });


      sample.transition()
          .duration(duration)
          .attr("cy", function(d) { return x1(d.Value); })
          .style("opacity", 1);

      sample.exit().transition()
          .duration(duration)
          .attr("cy", function(d) { return x1(d.Value); })
          .style("opacity", 1e-6)
          .remove();

      // Compute the tick format.
      var format = tickFormat || x1.tickFormat(8);

      // Update box ticks.
      /*
      var boxTick = g.selectAll("text.box")
          .data(quartileData);

      boxTick.enter().append("text")
          .attr("class", "box")
          // .attr("dy", ".3em")
          .attr("dx", function(d, i) { return i & 1 ? 6 : -6 })
          .attr("x", function(d, i) { return i & 1 ? width : 0 })
          .attr("y", x0)
          .attr("text-anchor", function(d, i) { return i & 1 ? "start" : "end"; })
          .text(format)
        .transition()
          .duration(duration)
          .attr("y", x1);

      boxTick.transition()
          .duration(duration)
          .text(format)
          .attr("y", x1);

      // Update whisker ticks. These are handled separately from the box
      // ticks because they may or may not exist, and we want don't want
      // to join box ticks pre-transition with whisker ticks post-.
      var whiskerTick = g.selectAll("text.whisker")
          .data(whiskerData || []);

      whiskerTick.enter().append("text")
          .attr("class", "whisker")
          .attr("dy", ".3em")
          .attr("dx", 6)
          .attr("x", width)
          .attr("y", x0)
          .text(format)
          .style("opacity", 1e-6)
        .transition()
          .duration(duration)
          .attr("y", x1)
          .style("opacity", 1);

      whiskerTick.transition()
          .duration(duration)
          .text(format)
          .attr("y", x1)
          .style("opacity", 1);

      whiskerTick.exit().transition()
          .duration(duration)
          .attr("y", x1)
          .style("opacity", 1e-6)
          .remove();
      */
    });
    d3.timer.flush();
  }

  box.width = function(x) {
    if (!arguments.length) return width;
    width = x;
    return box;
  };

  box.height = function(x) {
    if (!arguments.length) return height;
    height = x;
    return box;
  };

  box.tickFormat = function(x) {
    if (!arguments.length) return tickFormat;
    tickFormat = x;
    return box;
  };

  box.duration = function(x) {
    if (!arguments.length) return duration;
    duration = x;
    return box;
  };

  box.domain = function(x) {
    if (!arguments.length) return domain;
    domain = x == null ? x : d3.functor(x);
    return box;
  };

  box.value = function(x) {
    if (!arguments.length) return value;
    value = x;
    return box;
  };

  box.whiskers = function(x) {
    if (!arguments.length) return whiskers;
    whiskers = x;
    return box;
  };

  box.quartiles = function(x) {
    if (!arguments.length) return quartiles;
    quartiles = x;
    return box;
  };

  return box;
};

function boxWhiskers(d) {
  return [0, d.length - 1];
}

function boxQuartiles(d) {
  return [
    d3.quantile(d, .25),
    d3.quantile(d, .5),
    d3.quantile(d, .75)
  ];
}

})();
