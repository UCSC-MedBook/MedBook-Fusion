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
  // notFoundTemplate: 'appNotFound',

  // show the appLoading template whilst the subscriptions below load their data
  loadingTemplate: 'appLoading',

  // wait on the following subscriptions before rendering the page to ensure
  // the data it's expecting is present
  waitOn: function() {
    console.log("waitOn", (new Date() - st));
    return [
      Meteor.subscribe('Metadata'),
      Meteor.subscribe('studies')
    ];
  }
});

waitOn = function() {
    console.log("waitOn _id=", this.params._id, (new Date() - st));
    return Meteor.subscribe('Chart', this.params._id);
}

action = function() {
    if (this.ready()) {
        this.render();
    } else {
        this.render('Loading');
    }
}

function fetchData() {
    return function() {
        var q = {};
        if (this.params._id == null) {
            q.post = {$exists: 0};
            q.userId = Meteor.userId();
        } else {
            q._id = this.params._id;
        }
        var data = Charts.findOne(q);
        return data;
    }
}

Router.map(function() {
  this.route('signin', {
    path: '/fusion/signin',
  });

  this.route('loading', {
    template: "appLoading",
    path: '/fusion/loading',
  });

  this.route('home', {
    template: "SampleFusion",
    path: '/fusion/',
    waitOn: waitOn,
    data: fetchData(),
    action: action,
  });

  this.route('inspect', {
    template: "SampleFusion",
    path: '/fusion/inspect/:inspectVariable',
    action: action,
  });

  this.route('display', {
    template: "SampleFusion",
    path: '/fusion/display/:_id',
    waitOn: waitOn,
    data: fetchData(),
    action: action,
  });

  this.route('edit', {
    template: "SampleFusion",
    path: '/fusion/edit/:_id',
    waitOn: waitOn,
    data: fetchData(),
    action: action,
  });


});

if (Meteor.isClient) {
  Router.onBeforeAction('loading', {except: ['join', 'signin']});
  Router.onBeforeAction('dataNotFound', {except: ['join', 'signin']});
}

