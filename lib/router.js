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

Router.configure({
  // we use the  appBody template to define the layout for the entire app
  layoutTemplate: 'MasterLayout',

  // the appNotFound template is used for unknown routes and missing lists
  notFoundTemplate: 'appNotFound',

  // show the appLoading template whilst the subscriptions below load their data
  loadingTemplate: 'appLoading',

  // wait on the following subscriptions before rendering the page to ensure
  // the data it's expecting is present
  waitOn: function() {
    return [
      Meteor.subscribe('Metadata'),
      Meteor.subscribe('Clinical_Info'),
      Meteor.subscribe('Charts'),
      Meteor.subscribe('studies')
    ];
  }
});

Router.map(function() {
  this.route('signin', {
    path: '/fusion/signin',
    onBeforeAction: function() {
        this.next();
    }
  });

  this.route('home', {
    template: "PivotTable",
    path: '/fusion/',
    onBeforeAction: function() {
        this.next();
    }
  });
});

if (Meteor.isClient) {
  Router.onBeforeAction('loading', {except: ['join', 'signin']});
  Router.onBeforeAction('dataNotFound', {except: ['join', 'signin']});
}
