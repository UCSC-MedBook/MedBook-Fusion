Template.Inspector.helpers({
    mergeClass : function() {
       var a = "table table-fixed table-bordered table-hover Inspector";
       var b = this["class"];
       if (b)
           return a + " " +b;
       return a;
    },
});

Template.Inspector.events({
    'click .Inspector' : function(evt, tmpl) {
        evt.preventDefault();
    },
});

