Template.Display.rendered = function() {
     $(".output").pivotUI(this.data.chartData, this.data.pivotTableConfig);
     $(".output").resizable({
        resize : function( event, ui ) {
             var h = ui.size.height;
             var w =  ui.size.width;
             var $this = $(event.target);
             var $cw = $this.find(".ChartWrapper");
             var $svg = $this.find(".ChartWrapper svg");

             $cw.width(w);
             $svg.width(w);
             $cw.height(h);
             $svg.height(h);
             var vb = "0 0 " + w + " " + h;
             console.log( '$("svg").get(0).setAttributeNS(null, "viewBox", "', vb, '")');
             $svg.get(0).setAttributeNS(null, "viewBox", vb);

             

             // ui.size.height = Math.round( ui.size.height / 30 ) * 30;
             // svg.setAttributeNS(null, "viewBox", "0 0 400 400");
        }
     }).onkeydown = (function (ev) {
              var key;
              var isShift;
              if (window.event) {
                key = window.event.keyCode;
                isShift = !!window.event.shiftKey; // typecast to boolean
              } else {
                key = ev.which;
                isShift = !!ev.shiftKey;
              }
              if ( isShift ) {
                console.log("isShift");
                switch (key) {
                  case 16: // ignore shift key
                    break;
                  default:
                    // do stuff here?
                    break;
                }
              }
            });



} // 

