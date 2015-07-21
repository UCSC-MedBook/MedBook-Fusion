Template.DIPSC.helpers({
   ready : function() {
       return "here we are";
   }
});

var SCREENWIDTH  = 1400;

var SCREENHEIGHT = 1000;
var FONTSIZE =  24;
var margin = 50;
var thermWidth = 20;

var titleY = margin;
var PHEHEIGHT = 1.2*FONTSIZE;
var thermX = SCREENWIDTH/2; // thermometer X offset
var textX =  thermX - (2*thermWidth);
var thermY = titleY + (2*FONTSIZE); // thermometer Y offset
var thermHeight = SCREENHEIGHT - (3*margin); // annotations to the right of the thermoment
var thermHalf = thermHeight/2;


var SelectedItem = 1;

Template.DIPSC.onRendered(function() {

    var heatmap = Raphael("heatmap", SCREENWIDTH, SCREENHEIGHT);
    heatmap.canvas.style.backgroundColor = '#FFF';

    window.cc = Template.currentData();
    function Load() {
        heatmap.clear();

        YG = {};

        var results   = window.cc.output.correlations;
        var pValues   = window.cc.output.pValues;
        var variances = window.cc.output.variances;
        var M = {}; // maps name to index
        var N = []; // maps index to name
        NUMROWS = results.length;

        results[0].map(function(key, i) {
            M[key] = i;
            N[i] = key;
        });


        var ResultsDisplayList = _.clone(results[0])

        ResultsDisplayList.shift();  // we don't need "id";


        ResultsDisplayList.sort(function(a,b) { 
            var r  = results[SelectedItem];
            try {
                var aa = parseFloat(r[M[a]])
                var bb = parseFloat(r[M[b]])
                if (isNaN(aa)) aa = 0.0;
                if (isNaN(bb)) bb = 0.0;
                var cc = (bb - aa);
                return (cc)
            } catch (err) {
                debugger;
                return 0;
            }
        });

        var lineSet = null;
        var TitleText = null;
        var maxWidth = 0;

        id = results["id"];
        currY = FONTSIZE +100;
        FIRSTBUTTON = null;

        var very = heatmap.text(thermX + 2*thermWidth,thermY,"+1 very correlated")
        very.attr({"font-size": 0.75*FONTSIZE, "text-anchor": "start"});

        var zero = heatmap.text(thermX + 2*thermWidth,thermY + thermHalf,"0 uncorrelated")
        zero.attr({"font-size": 0.75*FONTSIZE, "text-anchor": "start"});

        var anti = heatmap.text(thermX + 2*thermWidth,thermY + thermHeight,"-1 anti-correlated")
        anti.attr({"font-size": 0.75*FONTSIZE, "text-anchor": "start"});

        if (!TitleText)  {
            TitleText = heatmap.text(thermX,titleY,"Something")
            TitleText.attr({"font-size": 1.5*FONTSIZE, "text-anchor": "center"});
        }
        var therm = heatmap.rect(thermX, thermY, thermWidth, thermHeight);
        therm.attr({ "fill":  "90-#00f-#fff:45-#f00", "fill-opacity": 0.5 });

        function LayoutTheResults(fresh) {
            TitleText.attr({text : N[SelectedItem].replace("_PHENOTYPE","")});
            currY = thermY;
            present = new Object
            if (lineSet)
               lineSet.remove()
            lineSet = heatmap.set()
            ResultsDisplayList.map(function(p,i) {
                var value = parseFloat(results[SelectedItem][M[p]]);
                if (i > 10 && i < (ResultsDisplayList.length -10) && !/=/.test(p) ) {
                   if (p in YG) {
                      YG[p].remove()
                      delete YG[p]
                    }
                    return;
                } 

                if (p in YG) {
                    var phe = YG[p]
                    if (currY != phe[0].attr("y") || 1 != phe[0].attr("x")) {
                       phe.attr({y:currY})
                       // phe.animate( {x: textX, y:currY}, DELAY, ">")
                       // var t =  p + " "+ results[SelectedItem][p];
                       // phe.attr({text:t})
                    }
                } else {
                    var phe = makeOneResult(p,i)
                    YG[p] = phe
                }
                phe.button.pearsonR = value
                phe.button.pValue = pValues[SelectedItem][M[p]];
                phe.button.vari = variances[SelectedItem][M[p]];
                present[p] = i;

                // draw line
                var y = Math.round(thermY + thermHalf - (value * thermHalf)) ;
                var r = heatmap.rect(thermX, y, thermWidth, 2);
                lineSet.push(r);
                if (phe.r)
                    phe.r.remove();
                phe.r = r;
                var bb = phe.getBBox();
                var ty = bb.y + (bb.height/2)

                pat = "M"+ textX  + " " + ty + "L"+ thermX + " " + y;
                var path = heatmap.path(pat)
                if (phe.path)
                   phe.path.remove()
                phe.path =  path;
                lineSet.push(path)
                currY += PHEHEIGHT;
            });
            for (var j in YG) 
                if (!(j in present)) {
                    YG[j].remove(); delete YG[j];
                }
        }

            makeOneResult = function(p,i) {
                var st = heatmap.set()
                var t = heatmap.text(textX, currY, p.replace("_PHENOTYPE",""))
                st.push(t)
                t.attr({"font-size": FONTSIZE, "text-anchor": "end"});
                var bb = t.getBBox()
                var button = heatmap.rect(bb.x -1, bb.y, bb.width+4, bb.height);
                button.txt = t


                button.attr({fill:"black","fill-opacity":0.0,  "stroke-opacity":0.0})
                st.push(button)
                button.click(function(event){ 
                          SelectedItem = M[this.entry];
                          if (highlight)
                              highlight.remove()
                          Load()
                      })

                st.button = button
                button.entry = p
                button.phe_i = i
                button.hover(
                    // When the mouse comes over the object //
                    // Stock the created "glow" object in myCircle.g
                    function() {
                        var bb = this.txt.getBBox()
                        highlight = heatmap.rect(bb.x, bb.y, PhenotypeTextWidth, bb.height)
                        highlight.attr({'color':'red'})
                        this.attr({title: 'Click to sort by '+ this.entry +"\nPearson R=" + 
                        parseFloat(this.pearsonR).toPrecision(3) + 
                        "\np-value=" + parseFloat(this.pValue).toPrecision(3) + 
                        "\nvar=" + parseFloat(this.vari).toPrecision(3)
                        });
                    },
                    // When the mouse goes away //
                    // g was already created. Destroy it!
                    function() {
                        if (highlight) {
                            highlight.remove();
                            hightlight = null;
                        }
                    });

                var w = bb.width;
                if (maxWidth < w)
                    PhenotypeTextWidth = maxWidth = w;
                return st
            }


            currY = PHEHEIGHT/2;
            LayoutTheResults(true);
            imageY = currY;
            imageHeight = NUMROWS;
    };

    Load();

});


