
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



Meteor.publish('GeneExpression', function(studyID, genes) {
    var cursor =  Expression.find({studyID:studyID, gene: {$in: genes}});
    console.log("Expression publish", studyID, genes, cursor.count());
    return cursor;
});

Meteor.publish('GeneSets', function() {
    var cursor = GeneSets.find();
    console.log("GeneSets publish", cursor.count());
    return cursor;
});
