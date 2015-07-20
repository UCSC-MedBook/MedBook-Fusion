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

    function transformSelectionIntoGroup() {
        // remove selection frame
        // d3.selectAll( "rect.selection").remove();
        //
        var group = d3.select(svg).select('.selection')
            .on("mousedown", null)
            .on("mouseup", null)
            .on("mouseout", null)
            .classed({ "selection": false, "group": true});



        var tip = d3.tip()
          .attr('class', 'd3-tip')
          .html(function(d) { return "d3 top"; });
        group.call(tip);

        updateSelectedNodes(group, tip)

        function resizeHandle(side) {
            function handle_y() {
                if (side == 'n') return parseInt(group.attr("y"));
                if (side == 's') return parseInt(group.attr("y")) + parseInt(group.attr("height"));
            }

            var resizeHandle = d3.select(gNode).append("rect").style(
                    { x: group.style("x"), y: handle_y(),
                      width: backdrop_width, height: 10, 
                    fill: "orange", "fill-opacity": 0.5}) ;

            resizeHandle.on("mouseout", function() {
                    d3.select("body").style("cursor", "pointer");
            });
            resizeHandle.on("mouseover", function() {
                    d3.select("body").style("cursor", side + "-resize");
                    if (!group.inMotion)
                        return;
                    d3.event.stopPropagation();
                });

            resizeHandle.on("mouseup", function() {
                    if (group.inMotion)
                        group.inMotion = false;
                    d3.event.stopPropagation();
                    d3.select("body").style("cursor", "pointer");
                });

            resizeHandle.on("mousedown", function() {
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

                            var y0 = handle_y();

                            if (side == 'n') {
                                group.attr('y', y);
                                var height = Math.max(10, parseInt(group.attr('height')) - (y - y0));
                                group.attr('height', height);
                            } else if (side == 's') {
                                var height = Math.max(10, parseInt(group.attr('height')) - (y0 - y));
                                group.attr('height', height);
                            }

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
            setTimeout(function() {
                tip.hide();
            }, 5000);
        });

    }

    function backdrop_mouseout() {
        d3.event.stopPropagation();
        var selection = d3.select(".selection");
        if (selection.empty())
            return;
        if(  d3.event.relatedTarget && d3.event.relatedTarget.tagName=='HTML') 
            transformSelectionIntoGroup();
    }

    function backdrop_mouseup() {
        d3.event.stopPropagation();
        window.SuppressRollover = false;

        var selection = d3.select(".selection");
        if (selection.empty())
            return;
        transformSelectionIntoGroup();
    };
    function backdrop_mousemove() {
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
    }

    backdrop.on( "mousedown", function() {

        d3.event.stopPropagation();

        window.SuppressRollover = true;
        clearToolTip(); // this is the  boxplot sample info tooltip

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
        .on( "mousemove", backdrop_mousemove)
        .on( "mouseup", backdrop_mouseup)
        .on( "mouseout", backdrop_mouseout);

        rect.startX = p[0];
        window.startY = p[1];


    })
    .on( "mousemove", backdrop_mousemove)
    .on( "mouseup", backdrop_mouseup)
    .on( "mouseout", backdrop_mouseout);
 }) // each
}
