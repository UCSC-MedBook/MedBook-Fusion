ContrastTable = function(attachPoint) {
    var groupTable = $("<table class='table table-responsive'>").attr("cellpadding", 5).appendTo(attachPoint);
    var header = $("<thead><tr><th>Group</th><th>Samples</th></tr></thead>").appendTo(groupTable);
    this.tableBody = $("<tbody>").appendTo(groupTable);


    this.addToTable = function(groupName, samples) {
       var tr = $("<tr >").appendTo(this.tableBody);
       var td = $("<td><i><span class='groupName'> " + groupName + "</span></i></td>").appendTo(tr);
       var select = $("<select class='contrastGroup form-control input-sm'>").appendTo(td);
       // select.change(setPrototypeName);
       ["no group", "group 1", "group 2"].map(function(f) {
           $("<option value='"+f+"'>"+f+"</option>").appendTo(select);
       });
       var links = samples.map(function (d) { 
           return "<a style='text-decoration: underline;' href='/wb/patient/" + d.Patient + "?Study_ID=" + d.Study_ID + "'>" + d.Patient + "</a>";
       });
       $("<td>" + links.sort().join(" ") + "</td>").appendTo(tr);
    }
}
