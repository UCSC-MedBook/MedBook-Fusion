/* thanks to http://bl.ocks.org/lgersman/5311083
 * bug D3 does not handle nested svg gracefully.
 * http://stackoverflow.com/questions/17494930/d3-onmouseover-event-does-not-work-with-nested-svg-elements
 */
makeSelectableBoxPlot = function(backdrops) {

  backdrops .each( function( ) {
    var backdrop = d3.select(this);
    var width = backdrop.attr("width");
    var x = backdrop.attr("x");

    var gNode = this.parentElement;
    while (gNode.tagName != "g")
        gNode = gNode.parentElement;

    var svg = this.parentElement;
    while (svg.tagName != "svg")
        svg = svg.parentElement;

    function mouseup() {
        var selection = d3.select(".selection");
        if (selection.empty())
            return;

           // remove selection frame
        d3.selectAll( "rect.selection").remove();

            // remove temporary selection marker class
        d3.selectAll('.selection').classed( "selection", false);
    };
    function mousemove() {
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
            x       : x, // parseInt( selection.attr( "x"), 10),
            y       : y1,
            width   : width, // parseInt( selection.attr( "width"), 10),
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

        window.SuppressRollover = true;
        clearToolTip();
        if( !d3.event.ctrlKey) {
            d3.selectAll( 'g.selected').classed( "selected", false);
        }
        var p = d3.mouse(gNode);

        var rect = d3.select(gNode).append("rect")
          .attr({
            class   : "selection",
            x       : x,
            y       : p[1],
            width   : width,
            height  : 0
        })
        .on( "mousemove", mousemove)
        .on( "mouseup", mouseup);

        rect.startX = p[0];
        window.startY = p[1];
    })
    .on( "mousemove", mousemove)
    .on( "mouseup", mouseup)
    .on( "mouseout", function() {
        var selection = d3.select(".selection");
        if (selection.empty())
            return;

        if(  d3.event.relatedTarget && d3.event.relatedTarget.tagName=='HTML') {
                // remove selection frame
            d3.selectAll( "rect.selection").remove();

            // remove temporary selection marker class
            d3.selectAll( '.selection').classed( "selection", false);
        }
    });
 }) // each
}
