/*
Router.onBeforeAction(function () {
  // all properties available in the route function
  // are also available here such as this.params

  var user = Meteor.user();
  if (user && user.profile && user.profile.collaborations && user.profile.collaborations.indexOf("WCDT")) {
      this.next();
      return;
  }
  this.render('signin');

});
*/


Router.configure({
  layoutTemplate: 'MasterLayout',
  loadingTemplate: 'appLoading',
});



function data() {
    var defaultQ = {
        post: {$exists: 0},
        userId: Meteor.userId()
    };
    var data;

    if (this.params._id != null) {
        data = Charts.findOne({_id: this.params._id});
    } else {
        data = Charts.findOne(defaultQ);
    }
    return data;
}

function waitOn() {
    return [
      Meteor.subscribe('Chart', this.params._id),
      Meteor.subscribe('Metadata'),
      Meteor.subscribe('studies')
    ]
}

Router.map(function() {
  this.route('home', {
    template: "SampleFusion",
    path: '/fusion/',
    data: data,
    waitOn: waitOn, 
  });
});

Router.map(function() {
  this.route('display', {
    template: "SampleFusion",
    path: '/fusion/display/:_id/',
    data: data,
    waitOn: waitOn, 
  });
});

Router.map(function() {
  this.route('edit', {
    template: "SampleFusion",
    path: '/fusion/edit/:_id/',
    data: data,
    waitOn: waitOn, 
  });
});

