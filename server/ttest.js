
ttest = Meteor.npmRequire("ttest")

A1 = [30.02, 29.99, 30.11, 29.97, 30.01, 29.99];
A2 = [29.89, 29.93, 29.72, 29.98, 30.02, 29.98];

console.log("ttest 1", ttest([0,1,1,1], {mu: 1}));
res = ttest(A1, A2);
console.log("ttest 2", res.pValue(), res);

Meteor.startup(
  function() {
    Meteor.methods({

        ttest : function(op, keyValues) {
            var colHeaders = _.pluck(keyValues, "key");
            colHeaders.unshift("ttest" + " " + op);
            var results = [colHeaders];

            for (var i = 0; i < keyValues.length; i++) {
                var a = keyValues[i];
                var row = [a.key];
                results.push(row)

                for (var j = 0; j < keyValues.length; j++) {
                    var b = keyValues[j];
                    var v = "";

                    if (a.value.length < 3 )
                        v += "<br>too few samples in<br>"+ a.key;
                    else if (b.value.length < 3 )
                        v += "<br>too few samples in<br>"+ b.key;

                    if (v == "") {
                        var res = ttest(a.value, b.value);
                        if (op == "pValue") {
                            var f = res.pValue()
                            v = f.toPrecision(4);
                            if (f < 0.05)
                                v = '<div style="background-color:#FFBAD2;" >' + v + '</div>';
                        } else 
                            v = "unknown op";
                    }
                    row.push(v);
                }
            }
            return results;
        }

    })
})
