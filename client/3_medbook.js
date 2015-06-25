
function ConvertToCSV(objArray) {
    var dataFieldNames = Session.get("dataFieldNames");
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';

    dataFieldNames.map(function(fieldName) {
        if (str != '') str += '\t'
        str += fieldName;
    })
    str += "\n";

    for (var i = 0; i < array.length; i++) {
        var line = '';

        dataFieldNames.map(function(fieldName) {
            if (line != '') line += '\t'
            line += array[i][fieldName];
        });

        str += line + '\n';
    }

    return str;
}
window.DownloadButton = function () {
    var data = Session.get('ChartDataFinal');
    var name = Session.get('studies').join(" ") + "_" + data.length + ".txt";

    saveTextAs(ConvertToCSV(data), name);
}

window.postButton = function () {
	var doc = Session.get('ChartDocument');
	delete doc["_id"];
	delete doc["user_id"];
	delete doc["userId"];
	var cloned_id = Charts.insert(doc);
	var url = Meteor.absoluteUrl('display/'+cloned_id)
	window.medbookpost = { title: document.title  , url: url }
    $.getScript('/postScript');
}

addMedBookButtons = function (result, groupArray) {
    var span = $('<span>').appendTo(result);

    var postBtn = $('<button type="button" onclick="postButton()" style="margin:10px;" class="btn btn-default">Post</button>').  appendTo(span);
    var DownloadBtn = $('<button type="button" onclick="DownloadButton()" style="margin:10px;" class="btn btn-default">Download</button>').  appendTo(span);
    /*
    var sliderDiv = $('<span class="sliderContainer">Legend</span>').appendTo(result);
    var slider = $('<input id="test" value="' + window.LEGEND_PROPORTION * 100+ '" min="10" max="90" class="slider" type="range"/>').appendTo(sliderDiv);
    slider.change(function() {
       window.LEGEND_PROPORTION = $(this).val() / 100.0;
       window.forceRedrawChart();
    });
    */

    if (groupArray) {
    var contrastBtn = $('<button type="button" style="margin:10px;" class="btn btn-default">Select a contrast between two groups</button>').appendTo(span);

        var form = $("<form hidden>").appendTo(result);
        contrastBtn.click(function() { 
                form.toggle ();
        });

        var contrastName = $("<input style='width:100%;' class='dataExplorerControlPanel contrastName'>").appendTo(form);


        var groupTable = $("<table class='table table-responsive'>").attr("cellpadding", 5).appendTo(form);
        var header = $("<thead><tr><th>Group</th><th>Samples</th></tr></thead>").appendTo(groupTable);
        var body = $("<tbody>").appendTo(groupTable);

        function setPrototypeName () {
            var groupName1 = [];
            var groupName2 = [];
            body.find("tr").each(function(i, row) {
                var group = $(row).find("select").val();
                row = $(row).children();
                var groupName = $(row[0]).find(".groupName").text();
                if (group == "group 1") {
                    groupName1.push(groupName);
                } else if (group == "group 2") {
                    groupName2.push(groupName);
                }
            });
            var g1 = groupName1.join(", ");
            var g2 = groupName2.join(", ");
            var cn = g1 + " vs " + g2;
            cn = cn.replace(/;/g, "");
            contrastName.val(cn);
        }

        if (groupArray)
            groupArray.map(function(row)  {
               if (row) {
                   row.map(function(item) {
                       if (typeof(item) == "object") 
                           Object.keys(item).map(function(groupName) {
                                   var tr = $("<tr hidden>").appendTo(body);
                                   var td = $("<td><i><span class='groupName'> " + groupName + "</span></i></td>").appendTo(tr);
                                   var select = $("<select class='contrastGroup form-control input-sm'>").appendTo(td);
                                   select.change(setPrototypeName);
                                   ["no group", "group 1", "group 2"].map(function(f) {
                                       $("<option value='"+f+"'>"+f+"</option>").appendTo(select);
                                   });
                                   $("<td>" + item[groupName].sort().map(function(f) { return f.Sample_ID }).join(" ") + "</td>").appendTo(tr);
                               });
                   });
               }
            });

        var next = 1;
        var selected = {};

        window.POKECONTRAST = function(groupObject) {
            form.show();
            var key = Object.keys(groupObject).join(" ");
            var selectedRow = $("span.groupName:contains('" + key + "')").parent().parent().parent();
            selectedRow.show();
            var set = "group " + next++;
            if (selected[set]) {
                selected[set].prop('selectedIndex',0);
                delete selected[set];
            }
            selected[set] = selectedRow.find('.contrastGroup');
            selected[set].val(set);
            if (next == 3) 
                next = 1;
            setPrototypeName();
            $('html, body').animate({ scrollTop: selectedRow.offset().top }, 2000);
        }

        function makeContrast() {
            var studyID = "prad_wcdt";
            var groupName1 = [];
            var groupName2 = [];
            var sampleList1 = [];
            var sampleList2 = [];
            body.find("tr").each(function(i, row) {
                var group = $(row).find("select").val();
                row = $(row).children();
                var groupName = $(row[0]).find(".groupName").text();
                var samples = $(row[1]).text().split(" ");
                if (group == "group 1") {
                    sampleList1 = sampleList1.concat(samples);
                    groupName1.push(groupName);
                } else if (group == "group 2") {
                    sampleList2 = sampleList1.concat(samples);
                    groupName2.push(groupName);
                }
            });
            var g1 = groupName1.join(", ");
            var g2 = groupName2.join(", ");
            sampleList1 = sampleList1.sort();
            sampleList2 = sampleList2.sort();
            if (sampleList1.length == 0 || sampleList2.length == 0)
                return alert("please select samples for both group 1 and group 2");

            var collab;
            if (Meteor.user()) {		
                    var collabs = Meteor.user().profile.collaborations;
                    var collab = collabs[0]
            } else {
                    collab = []
            }
            Contrast.insert({'name':contrastName.val(),'studyID':studyID,'collaborations': collab,
                    'group1':g1,'group2':g2,'list1':sampleList1,'list2':sampleList2,  userId: Meteor.userId()}, 
                    function(error, result) { 
                    if (error == null)
                        alert("Contrast " + contrastName.val() + " made");
            });
        };

        var button = $('<center><button type="button" class="btn btn-primary btn-lg"">Make Contrast</button></center>').appendTo(form);
        button.click(makeContrast);
    }
}
