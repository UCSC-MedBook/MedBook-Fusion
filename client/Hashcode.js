String.prototype.hashCode = function(){
    var hash = 0;
    if (this.length == 0) return hash;
    for (var i = 0; i < this.length; i++) {
        var character = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

var seeds = {};

Jitter = function(s) {
    var seed; 
    if (s in seeds) {
        seed = seeds[s];
    } else {
        seed = s.hashCode();
        console.logj
    }
    var x = Math.sin(seed) * 10000;
    var f =  Math.floor(x);
    seeds[s] = f;
    return x - f;
}

JitterSeedless = function(s) {
    var seed = s.hashCode();
    var x = Math.sin(seed) * 10000;
    var f =  Math.floor(x);
    seeds[s] = f;
    return x - f;
}
