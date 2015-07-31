/* thanks to http://bl.ocks.org/lgersman/5311083
 * bug D3 does not handle nested svg gracefully.
 * http://stackoverflow.com/questions/17494930/d3-onmouseover-event-does-not-work-with-nested-svg-elements
 */

makeSelectable = function(svgTop, nestedSVG) {
  svgTop
    .on( "mousedown", function() {

        window.SuppressRollover = true;
        clearToolTip();


        if( !d3.event.ctrlKey) {
            d3.selectAll( 'g.selected').classed( "selected", false);
        }

        var p = d3.mouse( this);

        nestedSVG.append( "rect")
        .attr({
            rx      : 6,
            ry      : 6,
            class   : "selection",
            x       : p[0],
            y       : p[1],
            width   : 0,
            height  : 0
        })
    })
    .on( "mousemove", function() {
        var s = nestedSVG.select( "rect.selection");

        if( !s.empty()) {
            var p = d3.mouse( this),
                d = {
                    x       : parseInt( s.attr( "x"), 10),
                    y       : parseInt( s.attr( "y"), 10),
                    width   : parseInt( s.attr( "width"), 10),
                    height  : parseInt( s.attr( "height"), 10)
                },
                move = {
                    x : p[0] - d.x,
                    y : p[1] - d.y
                }
            ;

            if( move.x < 1 || (move.x*2<d.width)) {
                d.x = p[0];
                d.width -= move.x;
            } else {
                d.width = move.x;       
            }

            if( move.y < 1 || (move.y*2<d.height)) {
                d.y = p[1];
                d.height -= move.y;
            } else {
                d.height = move.y;       
            }
           
            s.attr( d);

                // deselect all temporary selected state objects
            d3.selectAll( 'g.state.selection.selected').classed( "selected", false);

            d3.selectAll( 'g.state >circle.inner').each( function( state_data, i) {
                if( 
                    !d3.select( this).classed( "selected") && 
                        // inner circle inside selection frame
                    state_data.x-radius>=d.x && state_data.x+radius<=d.x+d.width && 
                    state_data.y-radius>=d.y && state_data.y+radius<=d.y+d.height
                ) {

                    d3.select( this.parentNode)
                    .classed( "selection", true)
                    .classed( "selected", true);
                }
            });
        }
    })
    .on( "mouseup", function() {

           // remove selection frame
        nestedSVG.selectAll( "rect.selection").remove();

            // remove temporary selection marker class
        d3.selectAll( 'g.state.selection').classed( "selection", false);
    })
    .on( "mouseout", function() {

        if( d3.event.relatedTarget.tagName=='HTML') {
                // remove selection frame
            nestedSVG.selectAll( "rect.selection").remove();

                // remove temporary selection marker class
            d3.selectAll( 'g.state.selection').classed( "selection", false);
        }
    });
}
