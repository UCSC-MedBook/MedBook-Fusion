
Meteor.publish('studies', function() {
    return Studies.find({});
});

Meteor.publish('Clinical_Info', function() {
    return Clinical_Info.find({});
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



Meteor.publish('GeneExpression', function(studies, genes) {
    var q = ({studyID:{$in: studies}, gene: {$in: genes}});
    var cursor =  Expression.find(q);
    console.log("Expression publish", q,"returns", cursor.count());
    return cursor;
});

Meteor.publish('GeneExpressionIsoform', function(studies, genes) {
    var cursor =  ExpressionIsoform.find({studyID:{$in: studies}, gene: {$in: genes}});
    console.log("ExpressionIsoform publish", studies, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneSets', function() {
    var cursor = GeneSets.find();
    console.log("GeneSets publish", cursor.count());
    return cursor;
});
