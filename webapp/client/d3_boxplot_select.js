/* thanks to http://bl.ocks.org/lgersman/5311083
 * bug D3 does not handle nested svg gracefully.
 * http://stackoverflow.com/questions/17494930/d3-onmouseover-event-does-not-work-with-nested-svg-elements
 */
bridgeTip = function() {
    debugger;
}

makeSelectableBoxPlot = function(backdrops) {

  backdrops .each( function( ) {
    var backdrop = d3.select(this);
    var backdrop_width = backdrop.attr("width");
    var backdrop_x = backdrop.attr("x");
    var backdrop_y = backdrop.attr("y");
    var backdrop_height = backdrop.attr("height");

    var gNode = this.parentElement;
    while (gNode.tagName != "g")
        gNode = gNode.parentElement;

    var svg = this.parentElement;
    while (svg.tagName != "svg")
        svg = svg.parentElement;

    function resizeHandle(group, side, which) {
        var self = this;

        this.set_north = function(y) {
            var y0 = handle_y();
            group.attr('y', y);
            var height = Math.max(10, parseFloat(group.attr('height')) - (y - y0));
            group.attr('height', height);
            this.resizeHandleRect.style('y', handle_y() +"px");

            if (this.north && y < parseFloat(this.north.resizeHandleRect.style("y")))
                this.north.set_south(y);
        }
        this.set_south = function(y) {
            var y0 = handle_y();
            var height = Math.max(10, parseFloat(group.attr('height')) - (y0 - y));
            group.attr('height', height);
            this.resizeHandleRect.style('y', handle_y() +"px");

            if (this.south && y >  parseFloat(this.south.resizeHandleRect.style("y")))
                this.south.set_north(y);
        }

        function handle_y() {
            if (side == 'n') return parseFloat(group.attr("y"));
            if (side == 's') return parseFloat(group.attr("y")) + parseFloat(group.attr("height"));
        }

        this.resizeHandleRect = d3.select(gNode).append("rect").style(
                { x: group.style("x"), y: handle_y(), width: backdrop_width, height: 10, 
                fill: "orange", "fill-opacity": 0.5}) ;

        this.tip = d3.tip().attr('class', 'd3-tip')
        this.tip.direction('e');
        this.resizeHandleRect.call(this.tip)


        this.resizeHandleRect.on("mouseout", function() {
                d3.select("body").style("cursor", "pointer");
        });
        this.resizeHandleRect.on("mouseover", function() {
                d3.select("body").style("cursor", side + "-resize");
                if (!group.inMotion)
                    return;
                d3.event.stopPropagation();
            });

        this.resizeHandleRect.on("mouseup", function() {
                if (group.inMotion)
                    group.inMotion = false;
                d3.event.stopPropagation();
                d3.select("body").style("cursor", "pointer");
            });

        this.resizeHandleRect.on("mousedown", function() {
                d3.event.stopPropagation();
                group.inMotion = true;

                // Here is the big trick. We put an invisible scrim over the entire area, so that all events are directed here.
                var resizeScrim = d3.select(gNode).append("rect").style(
                    { x: backdrop_x, y: backdrop_y, width: backdrop_width, height: backdrop_height,
                    fill: "transparent", "fill-opacity": 0}) ;

                resizeScrim.on("mouseup", function() { 
                    group.inMotion = false;
                    d3.event.stopPropagation(); 
                    resizeScrim.remove() 
                });
                resizeScrim.on("mouseout", function() { 
                    group.inMotion = false;
                    d3.event.stopPropagation();
                    resizeScrim.remove();
                });
                resizeScrim.on("mousemove", function() {
                        d3.event.stopPropagation();
                        var y = d3.mouse(gNode)[1];
                        var yR = window.yRange.invert(y);
                        debugger;
                        var c = self.tip.attr("class");
                        self.tip.html( " value = " + yR.toPrecision(3));
                        self.tip.show();
                        setTimeout(function() { self.tip.hide() }, 2000);

                        if (side == 'n')
                            self.set_north(y);
                        else if (side == 's')
                            self.set_south(y);

                    });
            });
    } // resizeHandle

    var hiGroup = d3.select(gNode).append("rect")
      .attr({
        class   : "selection",
        x       : backdrop_x,
        y       : 0,
        width   : backdrop_width,
        height  : backdrop_height/2
    }).style("fill", "red");

    var lowGroup = d3.select(gNode).append("rect")
      .attr({
        class   : "selection",
        x       : backdrop_x,
        y       : backdrop_height/2,
        width   : backdrop_width,
        height  : backdrop_height/2
    }).style("fill", "blue");


    var hiNorth = new resizeHandle(hiGroup, 'n', 'hi');
    var hiSouth = new resizeHandle(hiGroup, 's', 'hi');
    var lowNorth = new resizeHandle(lowGroup, 'n', 'low');
    var lowSouth = new resizeHandle(lowGroup, 's', 'low');

    hiSouth.south = lowNorth;
    lowNorth.north = hiSouth;

    return;



     var updateSelectedNodes = function (rect, tip) {
        var rect_x = parseFloat(rect.attr("x"));
        var rect_y = parseFloat(rect.attr("y"));
        var rect_width = parseFloat(rect.attr("width"));
        var rect_height = parseFloat(rect.attr("height"));

        var data = [];

        d3.select(gNode).selectAll('circle').each( function( sample, i) {
            var circle = d3.select(this);
            var circle_x = parseFloat(circle.attr("cx"));
            var circle_y = parseFloat(circle.attr("cy"));
            if ( rect_x <= circle_x && circle_x <= rect_x + rect_width && rect_y <= circle_y && circle_y <= rect_y + rect_height)
            {
            data.push(sample);
            }
        });
        rect.data = data;
        // Overlay("Inspector", { data: data, title: "Selected Samples", });
        tip.html(
            '<button id="bridgeTipButton" onclick="bridgeTip(this)" type="button" style="margin:10px;" class="btn btn-default">' + data.length + ' selected </button>'
        );
        window.currentContrastTable.addToTable("Group1", data);
     }

    })
}
