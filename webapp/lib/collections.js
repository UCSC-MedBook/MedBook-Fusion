Collections = {};
Collections.studies = new Meteor.Collection('studies');
Collections.Metadata = new Meteor.Collection("Metadata");
Collections.CRFs = new Meteor.Collection("CRFs");

DIPSC_coll = new Meteor.Collection("DIPSC");
Charts = new Meteor.Collection("Charts");
Expression = new Meteor.Collection('expression2');
ExpressionIsoform = new Meteor.Collection('expression_isoform');
Mutations = new Meteor.Collection('mutations');
SignatureScores = new Meteor.Collection('signature_score2');
GeneSets = new Meteor.Collection('gene_sets');

DomainCollections = {
  'Expression' : Expression,
  'ExpressionIsoform' : ExpressionIsoform,
  'Mutations' : Mutations,
  'SignatureScores' : SignatureScores
};

Charts.before.insert( function ChartsUpdate(userId, doc) {
  doc.updatedAt = Date.now();
  doc.userId = userId;
});

Charts.before.update(function (userId, doc, fieldNames, modifier, options) {
    modifier.$set = modifier.$set || {};
    modifier.$set.updatedAt = Date.now();
});

QuickR = new Meteor.Collection('QuickR');
Contrast = new Meteor.Collection('contrast');
Summaries = new Meteor.Collection("Summaries");

