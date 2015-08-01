// Generic class:

function LogSlider(options) {
   options = options || {};
   this.minpos = options.minpos || 0;
   this.maxpos = options.maxpos || 100;
   this.minlval = Math.log(options.minval || 1);
   this.maxlval = Math.log(options.maxval || 100000);

   this.scale = (this.maxlval - this.minlval) / (this.maxpos - this.minpos);
}

LogSlider.prototype = {
   // Calculate value from a slider position
   value: function(position) {
      return Math.exp((position - this.minpos) * this.scale + this.minlval);
   },
   // Calculate slider position from a value
   position: function(value) {
      return this.minpos + (Math.log(value) - this.minlval) / this.scale;
   }
};


// Usage:

var logsl = new LogSlider({maxpos: 20, minval: 100, maxval: 10000000});

$('#slider').on('change', function() {
   var val = logsl.value(+$(this).val());
   $('#value').val(val.toFixed(0));
});

$('#value').on('keyup', function() {
   var pos = logsl.position(+$(this).val());
   $('#slider').val(pos);
});

$('#value').val("1000").trigger("keyup");
