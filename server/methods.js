SafetyFirst = {
  GeneSets: GeneSets,
}
HTTP.methods({

    genes: function(data){
        var items = [];
        var seen = {}
        Expression.find( {gene: {$regex: "^"+ this.query.q + ".*" }}, { sort: {gene:1 }, fields: {"gene":1 }}).
            forEach(function(f) {
                if (!(f.gene in seen)) {
                    items.push({id: f.gene, text: f.gene});
                    seen[f.gene] = 1;
                }
            });
        items = _.unique(items);
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
