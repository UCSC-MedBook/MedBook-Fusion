SafetyFirst = {
  GeneSets: GeneSets,
}
HTTP.methods({

    genes: function(data){
        var items = [];
        Expression.find( {gene: {$regex: "^"+ this.query.q + ".*" }}, { sort: {gene:1 }, fields: {"gene":1 }}).
            forEach(function(f) {
                items.push({id: f.gene, text: f.gene});
            });
        this.setContentType("application/javascript");
        return JSON.stringify({
            items:items
        });
    },

    quick: function(data){
        var items = [];
        var term = this.query.q;
        var collection = this.query.c;
        var fieldName = this.query.f;
        var fields = {};
        fields[fieldName] = 1;

        GeneSets.find( {name: {$regex: "^"+ term + ".*" }}, { sort: fields, fields: fields}).
            forEach(function(f) {
                items.push({id: f._id, text: f[fieldName]});
            });
        this.setContentType("application/javascript");
        return JSON.stringify({
            items:items
        });
    },
});
