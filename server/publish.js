
Meteor.publish('studies', function() {
    return Studies.find({});
});

Meteor.publish('Clinical_Info', function() {
    return Clinical_Info.find({});
});
Meteor.publish("aggregatedQueries", function(aggregatedQueries) {
    var collNames = Object.keys(aggregatedQueries);
    return collNames.map(function(collName) {
        var collMetadata = CRFmetadataCollection.findOne({name: collName});
        // SECURITY  Put additional collection specific checks here

        // CHECK 1:  Must be metadata
        if (collMetadata == null)
            throw "No matching metadata";

        var fields = aggregatedQueries[collName];

        // CHECK 2:  Must be fields
        if (fields == null || fields.length == 0)
            throw "Need fields in aggregated query";

        // CHECK 3:  All fields must be known to metadata
        var wrongFields = _.difference(fields, collMetadata. fieldOrder);
        if (wrongFields.length > 0) 
            throw "Wrong fields in aggregated query";

        if (!(collName in CRFmetadataCollectionMap))
            CRFmetadataCollectionMap[collName] = new Meteor.Collection(collName);

        var mf = { Sample_ID: 1, Patient_ID: 1};
        fields.map(function(f) { mf[f] = 1; });


        var cursor = CRFmetadataCollectionMap[collName].find({}, { fields: mf, sort: mf});
        console.log("Metadata", collName, "publish", cursor.count());
        return cursor;
    });
});

Meteor.publish('Charts', function() {
    return Charts.find({});
});

Charts.allow({
  insert: function (userId, doc) { return true; }, 
  update: function (userId, doc, fieldNames, modifier) { return true; },
  remove: function (userId, doc) { return true; }
});
Charts.deny({
  insert: function (userId, doc) { return false; }, 
  update: function (userId, doc, fieldNames, modifier) { return false; }, 
  remove: function (userId, doc) { return true; }
});

Meteor.publish('Contrast', function() {
    return Contrast.find({});
});

Contrast.allow({
  insert: function (userId, doc) { return true; }, 
  update: function (userId, doc, fieldNames, modifier) { return true; },
  remove: function (userId, doc) { return true; }
});
Contrast.deny({
  insert: function (userId, doc) { return false; }, 
  update: function (userId, doc, fieldNames, modifier) { return false; }, 
  remove: function (userId, doc) { return false; }
});

/*
function assure(userId, collaborations)  {
    Meteor.findOne();

    var collaborations = ["public"]
    if (this.userId) {
        var user_record = Meteor.users.findOne({_id:this.userId}, {_id:0,'profile.collaborations':1})
        console.log('concat',user_record.profile.collaborations)
        collaborations = collaborations.concat(user_record.profile.collaborations)
    }
    var cnt = Studies.find({collaborations: {$in: collaborations}}).count();
    console.log ('member of',cnt, 'study based on ',collaborations)
    return Studies.find({collaborations: {$in: collaborations}});
}
*/

Meteor.publish('GeneExpression', function(studies, genes) {
    var q = ({Study_ID:{$in: studies}, gene: {$in: genes}});
    var cursor =  Expression.find(q);
    console.log("Expression publish", q,"returns", cursor.count());
    return cursor;
});

Meteor.publish('GeneExpressionIsoform', function(studies, genes) {
    var cursor =  ExpressionIsoform.find({Study_ID:{$in: studies}, gene: {$in: genes}});
    console.log("ExpressionIsoform publish", studies, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneSignatureScores', function(studies, genes) {
    var cursor =  SignatureScores.find({Study_ID:{$in: studies}, gene: {$in: genes}});
    console.log("SignatureScores publish", studies, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneMutations', function(studies, genes) {
    var q = { // Study_ID:{$in: studies},
            Hugo_Symbol: {$in: genes} };
    var cursor =  Mutations.find( q, { fields: {"Hugo_Symbol":1, sample: 1, Variant_Type:1 } });
    console.log("Mutations publish", studies, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneSets', function() {
    var cursor = GeneSets.find();
    console.log("GeneSets publish", cursor.count());
    return cursor;
});

Meteor.publish('Metadata', function() {
    var cursor =  CRFmetadataCollection.find({}, { sort: {"name":1}});
    console.log("Metadata publish", cursor.count());
    return cursor;
});

QuickR.allow({
  insert: function (userId, doc) { return userId != null; }, 
  update: function (userId, doc, fieldNames, modifier) { return userId != null; },
  remove: function (userId, doc) { return true; }
});

QuickR.before.insert(function(userId, doc) {
    doc.userId = userId;
});

Meteor.publish('QuickR', function() {
    if (this.userId) {
        var cursor = QuickR.find({userId: this.userId});
        console.log("publish QuickR for user ", this.userId, "count", cursor.count());
        return cursor;
    }
    return null;
});
