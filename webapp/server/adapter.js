var fs = Npm.require('fs');
var path = Npm.require('path');
//var Fiber = Npm.require('fibers');
var toml = Meteor.npmRequire('toml-js');
var mime = Meteor.npmRequire('mime');
var ntemp = Meteor.npmRequire('temp').track();

//var mime = Npm.require('mime');

medbook_config = null  // config file for apps and tools
medbook_config_file = null  // config file for apps and tools

Meteor.startup(function () {
	medbook_config_file = process.env["MEDBOOK_CONFIG"]
	console.log('Reading config from env MEDBOOK_CONFIG', medbook_config_file)
read_config = function(){
	   console.log('reading ',medbook_config_file)
       fs.readFile(medbook_config_file, function (err, data) {
		   if (err) {
			   console.log('error opening config', err)
			   fs.readFile('../../../../../config.toml', function (err, data) {
				   if (err) {
				   		console.log('cannot open config.toml', err, 'from', process.cwd())
					   return;
				   }
		   		   medbook_config = toml.parse(data);
		   		})
		   }
		   medbook_config = toml.parse(data);
       });
    }

Meteor.methods({
	dipsc_adapter: function (argList) {
		console.log('user', this.userId)
		console.log('dipsc_adapter',argList)
		read_config()
		var contrastId = argList[0]
		var sampleList =  {'_id':0}
		//workDir = '/private/var/tmp/dipscTmp'
		workDir = ntemp.mkdirSync('dipscWork')
		var phenofile = path.join(workDir, 'pheno.tab')
		var contrast = Contrast.findOne({'_id':contrastId},{list1:1,'name':1,'studyID':1,_id:0});	
		try {
			var contrastName = contrast['name']
		}
		catch(error) {
			console.log('No contrast found for ', argList, " error is ", error)
			return -1
		}
		var studyID = contrast['studyID']
		var wstream = fs.createWriteStream(phenofile)

		wstream.write( "sample\tgroup\n")
		console.log('# of samples in each side of' , contrast['name'],': ' , contrast['list1'].length, 'vs',contrast['list2'].length)
		_.each(contrast['list1'], function(item) {
			wstream.write(item)
			sampleList[item] = 1
			wstream.write('\t')
			wstream.write(contrast['group1'])
			wstream.write( '\n')
		})
		_.each(contrast['list2'], function(item) {
			wstream.write(item)
			sampleList[item] = 1
			wstream.write('\t')
			wstream.write(contrast['group2'])
			wstream.write( '\n')
		})
		wstream.end()
		var expfile =path.join(workDir, 'expdata.tab')
	
		console.log('sample list length from study', studyID , Object.keys(sampleList).length )
		console.log('input files', expfile, phenofile)
		var exp_curs = Expression.find({}, sampleList);
		var fd = fs.openSync(expfile,'w');
		fs.writeSync(fd,'gene\t')
		_.map(sampleList, function(value, key) {
			if (value == 1) {
				fs.writeSync(fd,key)
				fs.writeSync(fd,'\t')
			}
		})
		fs.writeSync(fd,'\n')
		console.log('exp count' , exp_curs.count())

		exp_curs.forEach(function(exp) {

			fs.writeSync(fd,exp['gene'])
			fs.writeSync(fd,'\t')
			_.map(sampleList, function(value, key) {
			
				if (value == 1) {
					geneExp = exp[key]
					fs.writeSync(fd,geneExp+'')
					fs.writeSync(fd,'\t')
				}
			})
			fs.writeSync(fd,'\n')
		})
		fs.closeSync(fd)
		fs.exists(expfile, function(data) {
			console.log('file',	 expfile, 'exists?', data )
		})
			
		var cmd = medbook_config.tools.dipsc.path;
		var whendone = function(retcode, workDir, contrastId, contrastName, studyID, uid) { 
			var idList = [];  
			console.log('whendone work dir', workDir, 'return code', retcode, 'user id', uid)
			var buf = fs.readFileSync(path.join(workDir,'report.list'), {encoding:'utf8'}).split('\n')
			_.each(buf, function(item) {
				if (item) {
					var opts = {};
					ext = path.extname(item).toString();
					filename = path.basename(item).toString();
					if (ext == '.xgmml') 
						opts.type = 'text/xgmml'
					else if (ext == '.sif')
						opts.type = 'text/network'
					else if (ext == '.tab')
						opts.type = 'text/tab-separated-values'
					//else if (filename == 'genes.tab')
					//	opts.type = ' Top Diff Genes'
					else 
						opts.type = mime.lookup(item)
					
					var f = new FS.File();
					f.attachData(item, opts);
					
					var blob = Blobs.insert(f);
					console.log('name', f.name(),'blob id', blob._id, 'ext' , ext, 'type', opts.type, 'opts', opts, 'size', f.size());
					if (f.name() == 'genes.tab') {
						// Write signature object to MedBook
						console.log('write gene signature')
						var sig_lines = fs.readFileSync(item, {encoding:'utf8'}).split('\n')
						var count = 0
						var sig_version = Signature.find({'contrast':contrastId}, {'version':1, sort: { version: -1 }}).fetch()
						var version = 0.9
						var sigDict = {'AR' :{'weight':3.3}}
						try {
							version = Number(sig_version[0]['version']);
						}
						catch(error) {
							version = 0.9;
						}	
						console.log('previous signature version', version)
						version = version + 0.1
						_.each(sig_lines, function(sig_line) {
							var line = sig_line.split('\t')
							
							// logFC AveExpr t P.Value adj.P.Val B
							gene = line[0]
							fc = line[1]
							aveExp = line[2]
							tStat = line[3]
							pVal = line[4]
							adjPval = line[5]
							Bstat = line[6]
							if (gene) {
								try { 
									sig = {}
									//sig['name'] = gene
									sig['weight'] = fc
									sig['pval'] = pVal
										sigDict[gene] = sig
									count += 1
									//if (count < 10) {
									//	console.log(gene,fc, sig)
										//}
								}
								catch (error) {
									console.log('cannot insert signature for gene', gene, error)
								}
							}
						})
						var sigID = new Meteor.Collection.ObjectID();
						var sigObj = Signature.insert({'_id':sigID, 'name':contrastName, 'studyID': studyID, 
							'version':version,'contrast':contrastId, 'signature':  sigDict });
						console.log('signature insert returns', sigObj)						
					}
					idList.push(blob._id);
				}	
			})  /* each item in report.list */
 			console.log('insert list of blobs', idList);
			var resObj = Results.insert({'contrast': contrastId, 'name':'differential results for '+contrastName,'studyID':studyID,'return':retcode, 'blobs':idList});
			var post = {
				title: "Results for contrast: "+contrastName,
				url: "/wb/results/"+resObj,
				body: "this is the results of limmma differential analysis run on 2/14/2015",
				medbookfiles: idList
			}
			//var s = JSON.stringify(post)
			//var uid = this.userId
			console.log('user is ',uid)
			if (uid) {
				var user = Meteor.users.findOne({_id:uid})
				if (user) {
					console.log('user.services', user.services)
					var token = user.services.resume.loginTokens[0].hashedToken
					console.log('before post',post, token, 'username', user.username)
					HTTP.post("http://localhost:10001/medbookPost", {data:{post:post, token:token}})
					console.log('after post')
				}
			}
			//if (retcode == 0) {
			//	ntemp.cleanup(function(err, stats) {
		//			if (err)
		//				console.log('error deleting temp files', err)
		//			console.log('deleting temp files');
		//	  	});
		//	}
		};  /* end of whendon */
		
                Meteor.call('runshell', cmd, [expfile,phenofile, '200', 'sig.tab', 'genes.tab', 'mds.pdf'], 
                            workDir, contrastId, contrastName, studyID, path.join(workDir,'report.list'), whendone, function(err,response) {
                                    if(err) {
                                            console.log('serverDataResponse', "pathmark_adapter Error:" + err);
                                            return ;
                                    }
                    resultObj = response['stderr'];
                    console.log('dipsc started stdout stream id: '+resultObj._id+ ' stdout name '+resultObj.name());
                    var readstream = resultObj.createReadStream('blobs');
                    readstream.setEncoding('utf8');
                    readstream.on('data', function(chunk) {
                            console.log('chunk', chunk);
                    })
                });

        }, // dipsc_adapter
    })

}); // Meteor.startup

var spawn = Npm.require('child_process').spawn;
var PassThrough = Npm.require('stream').PassThrough;

function tsvJSON(tsv){
 
  var lines=tsv.split("\n");
 
  var result = [];
 
  var headers=lines[0].split("\t");
 
  for(var i=1;i<lines.length;i++){
 
	  var obj = {};
	  var currentline=lines[i].split("\t");
 
	  for(var j=0;j<headers.length;j++){
		  obj[headers[j]] = currentline[j];
	  }
 
	  result.push(obj);
 
  }
  
  //return result; //JavaScript object
  return JSON.stringify(result); //JSON
}

Meteor.startup(function () {
	Meteor.methods({
	  runshell: function (name, argArray, workDir, contrastId, jname, studyID, output_list, whendone) {
		var uid = this.userId
		console.log('server, calling : ', name , ' with args ', argArray, 'user', uid,' list of output files written to ' +output_list);

		if(name==undefined || name.length<=0) {
	      throw new Meteor.Error(404, "Please enter your name");
		}

		//FS.debug = true;
		var newFile = new FS.File();
		newFile.name('pathmark log');
		newFile.type('text/plain');
		newFile.size(200); //TODO CFS needs to properly calculate size for streams if not provided; this dummy value makes things work for now
		newFile.metadata = {
			  command: name,
			  args: argArray
		};
		var newError = new FS.File();
		newError.name('pathmark errors');
		newError.type('text/plain');
		newError.size(200); //TODO CFS needs to properly calculate size for streams if not provided; this dummy value makes things work for now
		newError.metadata = {
			  command: name,
			  args: argArray
		};

        // Create a bufferable / paused new stream...
        var pt = new PassThrough();
        var pt2 = new PassThrough();
		// run the command with the provided arguments
		console.log('work dir is ', workDir)
	    var shlurp = spawn(name, argArray, {cwd: workDir});
		shlurp.stdout.pipe(pt)
		shlurp.stderr.pipe(pt2);
		shlurp.on('error', function(error) {
				console.log('command failed '+error)
		});
		shlurp.on('close', function(retcode) {
				console.log('process ended with code ' + retcode);
				if (output_list) {
					fs.readFile(output_list, function(err, data) {
						if (err) {
							return console.log(err);
						}
						console.log('output files '+data);
					});					
				}	
				Fiber(function() {
					whendone(retcode, workDir, contrastId, jname, studyID, uid)
				}).run();  
		});
		
		
        // Set the createReadStream...
        newFile.createReadStream = function() {
            return pt;
        };
        newError.createReadStream = function() {
            return pt2;
        };

		var fileObj = Blobs.insert(newFile);
		var fileErr = Blobs.insert(newError);
		console.log('stdout',fileObj._id, 'stderr', fileErr._id)

		return {'stdout':fileObj, 'stderr':fileErr};
      }
	});
  });


/* 
http://journal.gentlenode.com/meteor-14-execute-a-unix-command/
*/
