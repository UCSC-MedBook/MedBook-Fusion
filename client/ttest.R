args <- commandArgs(trailingOnly = TRUE);

library(rmongodb)
conn <- mongo.create()
coll <- "MedBook.QuickR";
id <- mongo.bson.from.list(list("_id"=args[1]));

#Fetch
data <- mongo.bson.to.list(mongo.findOne(conn, coll, id));

#Calc
n = length(data$input);
output <- list();
for (i in 1:(n-1))
    for (j in (i+1):n) {
        pVal = t.test(data$input[[i]]$value, data$input[[j]]$value)$p.value;
        key = paste( data$input[[i]]$key, "***", data$input[[j]]$key, sep="");
        output[key] = pVal;
    }


# Store
bson <- mongo.bson.from.list(list("$set"=list(output=output)))
mongo.update(conn, coll, id, bson)

quit("no", status=0);
    
