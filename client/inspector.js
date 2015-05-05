Template.Inspector.events({
    'click .Inspector' : function(evt, tmpl) {
        evt.preventDefault();
    },

   'click .reactive-table tr': function (evt, tmpl) {
       evt.preventDefault();
       elem = evt.target;
       if (tmpl.data.clickRow) {
           if ($(elem).is("td"))
               elem = $(elem).parent().get(0);
           tmpl.data.clickRow(elem, this);
       }
    }

});

Template.Inspector.rendered = function(){
   var $rows = $('.reactive-table tr'); 
   var renderRow = this.data.renderRow;
   $rows.each(function(i, elem) { 
       if ($(elem).is("td"))
           elem = $(elem).parent().get(0);
       var d = Blaze.getData(elem);
       renderRow(elem, d);
   })
};
