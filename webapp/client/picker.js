function eachRowInPicker(func) {
   if (func) {
       var $rows = $('.Picker tr'); 
       $rows.each(function(i, elem) { 
           if ($(elem).is("td"))
               elem = $(elem).parent().get(0);
           var d = Blaze.getData(elem);
           func(elem, d);
       })
   }
}

Template.Picker.events({
        
    'click #selectAll' : function(evt, tmpl) {
       eachRowInPicker(tmpl.data.selectRow);
    },
    'click #clearAll' : function(evt, tmpl) {
       eachRowInPicker(tmpl.data.clearRow);
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

})

Template.Picker.rendered = function(){
   var $rows = $('.reactive-table tr'); 
   var renderRow = this.data.renderRow;
   if (renderRow)
       $rows.each(function(i, elem) { 
           if ($(elem).is("td"))
               elem = $(elem).parent().get(0);
           var d = Blaze.getData(elem);
           renderRow(elem, d);
       })
};
