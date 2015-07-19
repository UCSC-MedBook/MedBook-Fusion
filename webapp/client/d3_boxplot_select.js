/* thanks to http://bl.ocks.org/lgersman/5311083
 * bug D3 does not handle nested svg gracefully.
 * http://stackoverflow.com/questions/17494930/d3-onmouseover-event-does-not-work-with-nested-svg-elements
 */
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

    tip = d3.tip()
      .attr('class', 'd3-tip')
      .html(function(d) { return "d3 top"; });

    function transformSelectionIntoGroup() {
        // remove selection frame
        // d3.selectAll( "rect.selection").remove();
        //
        var group = d3.select(svg).selectAll('.selection')
            .on("mousedown", null)
            .on("mouseup", null)
            .on("mouseout", null)
            .classed({ "selection": false, "group": true});

        function resizeHandle(side) {
            function handle_y() {
                if (window.NOW) debugger;
                if (side == 'n') return parseInt(group.attr("y"));
                if (side == 's') return parseInt(group.attr("y")) + parseInt(group.attr("height"));
            }

            var resizeHandle = d3.select(gNode).append("rect").style(
                    { x: group.style("x"), y: handle_y(),
                      width: backdrop_width, height: 10, 
                    fill: "orange", "fill-opacity": 0.5}) ;

            resizeHandle.on("mouseover", function() {
                    d3.event.stopPropagation();
                    d3.select("body").style("cursor", side + "-resize");
                });

            resizeHandle.on("mouseout", function() {
                    d3.event.stopPropagation();
                    d3.select("body").style("cursor", "pointer");
                });

            resizeHandle.on("mousedown", function() {
                    d3.event.stopPropagation();
                    var resizeScrim = d3.select(gNode).append("rect").style(
                        { x: backdrop_x, y: backdrop_y, width: backdrop_width, height: backdrop_height,
                        fill: "transparent", "fill-opacity": 0}) ;

                    resizeScrim.on("mouseup", function() { d3.event.stopPropagation(); resizeScrim.remove() });
                    resizeScrim.on("mouseout", function() { d3.event.stopPropagation(); resizeScrim.remove() });
                    resizeScrim.on("mousemove", function() {
                            d3.event.stopPropagation();
                            var y = d3.mouse(gNode)[1];

                            var y0 = handle_y();

                            if (side == 'n') {
                                group.attr('y', y);
                                var height = Math.max(10, parseInt(group.attr('height')) - (y - y0));
                                group.attr('height', height);
                            } else if (side == 's') {
                                var height = Math.max(10, parseInt(group.attr('height')) - (y0 - y));
                                group.attr('height', height);
                            }

                            window.NOW = true;
                            resizeHandle.style('y', handle_y() +"px");
                        });
                });

            return resizeHandle;
        }


        resizeHandle('n');
        resizeHandle('s');

        group.on("mouseover", function hover() {
            tip.show();
        });

        group.on("mouseout", function hover() {
            tip.hide();
        });

    }

    function mouseout() {
        d3.event.stopPropagation();
        var selection = d3.select(".selection");
        if (selection.empty())
            return;
        if(  d3.event.relatedTarget && d3.event.relatedTarget.tagName=='HTML') 
            transformSelectionIntoGroup();
    }

    function mouseup() {
        d3.event.stopPropagation();
        var selection = d3.select(".selection");
        if (selection.empty())
            return;
        transformSelectionIntoGroup();
    };
    function mousemove() {
        d3.event.stopPropagation();
        var selection = d3.select(".selection");
        if (selection.empty())
            return;

        var p = d3.mouse(gNode);
        var py = p[1],
            y1 = parseInt( selection.attr( "y"), 10),
            y2 = y1 + parseInt( selection.attr( "height"), 10);


        if (py < window.startY) {
            y1 = py;
            y2 = window.startY;
        } else {
            y1 = window.startY;
            y2 = py;
        }



        var rectangle = {
            x       : backdrop_x, // parseInt( selection.attr( "x"), 10),
            y       : y1,
            width   : backdrop_width, // parseInt( selection.attr( "width"), 10),
            height  : y2 - y1,
        };

       


        selection.attr(rectangle);
        // deselect all temporary selected state objects
        d3.selectAll('.selected').classed( "selected", false);
        /*
        d3.selectAll(gNode).selectAll('circle').each( function( state_data, i) {
            if( 
                !d3.select( this).classed( "selected") && 
                    // inner circle inside selection frame
                state_data.x-radius>=rectangle.x && state_data.x+radius<=rectangle.x+rectangle.width && 
                state_data.y-radius>=rectangle.y && state_data.y+radius<=rectangle.y+rectangle.height
            ) {

                .classed( "selection", true)
                .classed( "selected", true);
            }
        });
        */
    }

    backdrop.on( "mousedown", function() {

        d3.event.stopPropagation();

        window.SuppressRollover = true;
        clearToolTip();
        if( !d3.event.ctrlKey) {
            d3.selectAll( 'g.selected').classed( "selected", false);
        }
        var p = d3.mouse(gNode);

        var rect = d3.select(gNode).append("rect")
          .attr({
            class   : "selection",
            x       : backdrop_x,
            y       : p[1],
            width   : backdrop_width,
            height  : 0
        })
        .on( "mousemove", mousemove)
        .on( "mouseup", mouseup)
        .on( "mouseout", mouseout);

        rect.startX = p[0];
        window.startY = p[1];

    rect.call(tip);

    })
    .on( "mousemove", mousemove)
    .on( "mouseup", mouseup)
    .on( "mouseout", mouseout);
 }) // each
}
