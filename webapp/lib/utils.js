ConvertToTSV = function (data, keys) {

    var array = typeof data != 'object' ? JSON.parse(data) : data;
    var str = '';

    keys.map(function(key) {
        if (str != '') str += '\t'
        str += key;
    })
    str += "\n";

    for (var i = 0; i < array.length; i++) {
        var line = '';

        keys.map(function(key) {
            var obj = array[i];
            if (key in obj) {
                if (line != '') line += '\t'
                line += obj[key];
            }
        });

        str += line + '\n';
    }

    return str;
}

