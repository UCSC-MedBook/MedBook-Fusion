Router.map(function() {
  this.route('dipsc', {
    template: "DIPSC",
    path: '/fusion/dipsc/:_id/',
    data: function() {
        if (this.params._id != null) {
            data = DIPSC_coll.findOne({_id: this.params._id});
        } else {
            data = Charts.findOne();
        }
        return data;
    },

    waitOn:  function() {
        return [
          Meteor.subscribe('DIPSC', this.params._id),
        ]
    }
  });
});


