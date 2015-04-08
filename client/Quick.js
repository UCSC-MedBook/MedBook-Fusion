
// {{> Quick chartElement="genelist" collection="GeneExpression" fieldName="name" placeHolder="Key word"}}
Template.Quick.rendered = function() {
    debugger;
     var $input = $(this.find("input"));
     var previousChart = Charts.findOne({ userId : Meteor.userId() });
     var chartElement = this.data.chartElement;
     var fieldName = this.data.fieldName;
     var collection = this.data.collection;

     $input.select2({
          initSelection : function (element, callback) {
            if (previousChart && previousChart[chartElement])
                callback( previousChart[chartElement].map(function(g) { return { id: g, text: g }}) );
          },
          multiple: true,
          ajax: {
            url: "/fusion/quick",
            dataType: 'json',
            delay: 250,
            data: function (term) {
              var qp = {
                q: term,
                c: collection,
                f: fieldName,
              };
              return qp;
            },
            results: function (data, page, query) { return { results: data.items }; },
            cache: true
          },
          escapeMarkup: function (markup) { return markup; }, // let our custom formatter work
          minimumInputLength: 2,
      });
     if (previousChart && previousChart[chartElement])
         $input.select2("val", previousChart[chartElement] );

     $input.on("change", function() {
        var val =  $(this).select2("val");
        Meteor.subscribe(collection, "prad_wcdt", val);
        var set = {};
        set[chartElement] = val;
        Charts.update({ _id : previousChart._id }, {$set: set});
     });
};

