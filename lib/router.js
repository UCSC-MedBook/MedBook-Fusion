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



Router.onBeforeAction('loading');

Router.map(function() {
  this.route('home', {
    template: "SampleFusion",
    path: '/fusion/',
    data: function() {
        var defaultQ = {
            post: {$exists: 0},
            userId: Meteor.userId()
        };
        var data;

        if (this.params._id != null) {
            data = Charts.findOne({_id: this.params._id});
            var default_obj = Charts.findOne(defaultQ);
            data._id = default_obj._id;
        } else {
            data = Charts.findOne(defaultQ);
        }
        return data;
    },

    waitOn:  function() {
        return [
          Meteor.subscribe('Chart', this.params._id),
          Meteor.subscribe('Metadata'),
          Meteor.subscribe('studies')
        ]
    }
  });
});


