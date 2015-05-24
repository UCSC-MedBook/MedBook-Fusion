args <- commandArgs(trailingOnly = TRUE);

library(rmongodb)
conn <- mongo.create()
coll <- "MedBook.QuickR";
id <- mongo.bson.from.list(list("_id"=args[1]));

#Fetch
bson <- mongo.findOne(conn, coll, id);
data <- mongo.bson.to.list(bson);

#Calc
n = length(data$input);
output <- list();
for (i in 1:(n-1)) {
    for (j in (i+1):n) {
        set1 = as.numeric(data$input[[i]]$value)
        set2 = as.numeric(data$input[[j]]$value)
        if (length(set1) > 2 && length(set2) > 2) {
            obj = t.test(set1,set2)
            pVal = obj$p.value;
            key = paste( data$input[[i]]$key, "***", data$input[[j]]$key, sep="");
            output[key] = pVal;
        }
    }
}


# Store
bson <- mongo.bson.from.list(list("$set"=list(output=output)))
mongo.update(conn, coll, id, bson)
print(paste('_id',args[1],'$set:{',key,':',output,'}'))

quit("no", status=0);
    
