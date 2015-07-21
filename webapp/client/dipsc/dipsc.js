
var SCREENWIDTH  = 600;
var SCREENHEIGHT = 700;
var FONTSIZE =  12;
var margin = 25;
var thermWidth = 10;

var titleY = margin;
var PHEHEIGHT = 1.2*FONTSIZE;
var thermX = SCREENWIDTH - (7*FONTSIZE); // thermometer X offset
var textX =  thermX - (3*thermWidth);
var thermY = titleY + (2*FONTSIZE); // thermometer Y offset
var thermHeight = SCREENHEIGHT - (3*margin); // annotations to the right of the thermoment
var thermHalf = thermHeight/2;

var dipstickPaper = null;


function Load(CurrentChart, SelectedItem) {
    if (dipstickPaper == null)
        return;
    dipstickPaper.clear();

    YG = {};

    var results   = CurrentChart.output.correlations;
    var pValues   = CurrentChart.output.pValues;
    var variances = CurrentChart.output.variances;
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

    var very = dipstickPaper.text(thermX + 1.5*thermWidth,thermY,"+1\ncorrelated")
    very.attr({"font-size": 0.75*FONTSIZE, "text-anchor": "start"});

    var zero = dipstickPaper.text(thermX + 1.5*thermWidth,thermY + thermHalf,"0\nuncorrelated")
    zero.attr({"font-size": 0.75*FONTSIZE, "text-anchor": "start"});

    var anti = dipstickPaper.text(thermX + 1.5*thermWidth,thermY + thermHeight,"anticorrelated\n-1")
    anti.attr({"font-size": 0.75*FONTSIZE, "text-anchor": "start"});

    if (!TitleText)  {
        TitleText = dipstickPaper.text(thermX + (2*thermWidth),titleY,"Something")
        TitleText.attr({"font-size": 1.5*FONTSIZE, "text-anchor": "end"});
    }
    var therm = dipstickPaper.rect(thermX, thermY, thermWidth, thermHeight);
    therm.attr({ "fill":  "90-#00f-#fff:45-#f00", "fill-opacity": 0.5 });

    function LayoutTheResults(fresh) {
        TitleText.attr({text : N[SelectedItem].replace("_PHENOTYPE","")});
        currY = thermY;
        present = new Object
        if (lineSet)
           lineSet.remove()
        lineSet = dipstickPaper.set()
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
            var r = dipstickPaper.rect(thermX, y, thermWidth, 2);
            lineSet.push(r);
            if (phe.r)
                phe.r.remove();
            phe.r = r;
            var bb = phe.getBBox();
            var ty = bb.y + (bb.height/2)

            pat = "M"+ (textX+(thermWidth*0.25))  + " " + ty + "L"+ thermX + " " + y;
            var path = dipstickPaper.path(pat)
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
            var st = dipstickPaper.set()
            var t = dipstickPaper.text(textX, currY, p.replace("_PHENOTYPE",""))
            st.push(t)
            t.attr({"font-size": FONTSIZE, "text-anchor": "end"});
            var bb = t.getBBox()
            var button = dipstickPaper.rect(bb.x -1, bb.y, bb.width+4, bb.height);
            button.txt = t


            button.attr({fill:"black","fill-opacity":0.0,  "stroke-opacity":0.0})
            st.push(button)
            button.click(function(event){ 
                      if (highlight)
                          highlight.remove()
                      Session.set("SelectedItem", M[this.entry]);
                  })

            st.button = button
            button.entry = p
            button.phe_i = i
            button.hover(
                // When the mouse comes over the object //
                // Stock the created "glow" object in myCircle.g
                function() {
                    var bb = this.txt.getBBox()
                    highlight = dipstickPaper.rect(bb.x, bb.y, PhenotypeTextWidth, bb.height)
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


Template.DIPSC.onRendered(function() {
    dipstickPaper = Raphael("dipstickPaper", SCREENWIDTH, SCREENHEIGHT);
    dipstickPaper.canvas.style.backgroundColor = '#FFF';
    Session.set("SelectedItem", 1);
});


Template.DIPSC.helpers({
   ready : function() {
       Load(Template.currentData(), Session.get("SelectedItem"));
   }
});
