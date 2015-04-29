
CRFmetadataCollection = new Meteor.Collection("CRFmetadataCollection");
Clinical_Info = new Meteor.Collection("Clinical_Info");
CRFmetadataCollectionMap = {Clinical_Info: Clinical_Info };

Charts = new Meteor.Collection("Charts");
Contrast = new Meteor.Collection('contrast');
Expression = new Meteor.Collection('expression2');
ExpressionIsoform = new Meteor.Collection('expression_isoform');
Mutations = new Meteor.Collection('mutations');
Studies = new Meteor.Collection('studies');
GeneSets = new Meteor.Collection('gene_sets');


Charts.before.insert( function ChartsUpdate(userId, doc) {
  doc.updatedAt = Date.now();
});

Charts.before.update(function (userId, doc, fieldNames, modifier, options) {
    modifier.$set = modifier.$set || {};
    modifier.$set.updatedAt = Date.now();
});

