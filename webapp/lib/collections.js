CRFmetadataCollection = new Meteor.Collection("CRFmetadataCollection");

Charts = new Meteor.Collection("Charts");
Expression = new Meteor.Collection('expression2');
ExpressionIsoform = new Meteor.Collection('expression_isoform');
Mutations = new Meteor.Collection('mutations');
SignatureScores = new Meteor.Collection('signature_score2');
Studies = new Meteor.Collection('studies');
GeneSets = new Meteor.Collection('gene_sets');

DomainCollections = {
  'Expression' : Expression,
  'ExpressionIsoform' : ExpressionIsoform,
  'Mutations' : Mutations,
  'SignatureScores' : SignatureScores
};

Patient_Enrollment_form = new Meteor.Collection('Patient_Enrollment_form');
Demographics = new Meteor.Collection('Demographics');
SU2C_Biopsy_V3 = new Meteor.Collection('SU2C_Biopsy_V3');
                                ~ 
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