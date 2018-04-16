var keystone = require('keystone');
const ipc = require('node-ipc');
var fs = require('fs');
var path = require('path');

exports = module.exports = function (req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	// Set locals
	locals.section = 'browse';
	locals.filters = {
		sketch: req.params.sketch,
	};
	locals.data = {
		sketches: [],
		channels: [],
	};
	locals.validationErrors = {};
	locals.formData = req.body || {};

	// Load the current sketch
	view.on('init', function (next) {

		var q = keystone.list('Sketch').model.findOne({
			state: 'published',
			slug: locals.filters.sketch,
		}).populate('author channels');

		q.exec(function (err, result) {
			locals.data.sketch = result;
			next(err);
		});

	});

	// Load all channels
	view.on('init', function (next) {

		keystone.list('SketchChannel').model.find().sort('name').exec(function (err, results) {
	
			if (err || !results.length) {
				return next(err);
			}
	
			locals.data.channels = results;
			next(err);
		});
	});
	

	// Save HTML from form
	view.on('post', {
		action: 'save'
	}, function (next) {
		// get absolute file name
		var saveName = res.locals.staticPath+locals.data.sketch.localDir+'/index.html';
		// get code from HTTP body
		var code = req.body.code;
		// save sketch
		fs.writeFile(saveName, code, 'utf8', function(err){
			if(err){
				// error saving
				req.flash('warning', 'error saving html');
				return res.redirect('/browse/sketch/'+locals.data.sketch.slug);
			}else{
				// success saving
				req.flash('success', 'success saving html');
				return res.redirect('/browse/sketch/'+locals.data.sketch.slug);
			}
		});
	});

	// Loads sketch screenshots
	view.on('init', function (next) {
		// 
		var sketchPath = res.locals.staticPath+locals.data.sketch.localDir;
		// make path absolute
		var resolvedPath = path.resolve(__dirname+'./../../', sketchPath);
		var targetFiles;
		fs.readdir(resolvedPath, function(err, files){
			if(err){
				console.log('error getting files: '+err);
			}
			targetFiles = files.filter(function(file) {
				return path.extname(file).toLowerCase() === '.png';
			});
			locals.data.thumbnails = targetFiles;
			next(err);
		});
	});

	// Load other sketches
	view.on('init', function (next) {

		var q = keystone.list('Sketch').model.find().where('state', 'published').sort('-publishedDate').populate('author').limit('4');

		q.exec(function (err, results) {
			locals.data.sketches = results;
			next(err);
		});

	});

	// add channel
	view.on('get', {
		channel: 'true'
	}, function(next){
		//
		keystone.list('Sketch').model.findOne({
			state: 'published',
			slug: locals.filters.sketch,
		})
		.exec(function (err, dbSketch) {
			if(err){
				//
				req.flash('error', 'error finding sketch to delete in database');
				return next();
			}
			if(!dbSketch){
				//
				req.flash('error', 'could not find sketch to delete');
				return next();
			}
			var sketchChannels = [];
			var alreadyInChannel = false;
			// add existing channels
			for(var i=0; i<dbSketch.channels.length; i++){
				// check if channel is already added
				if(dbSketch.channels[i] == req.query._id){
					alreadyInChannel = true; // skip adding
				}else{
					// keep existing channel if not the same channel in request
					sketchChannels.push(dbSketch.channels[i]);
				}
			}
			// add new channel if it wasn't already added
			if(alreadyInChannel == false){
				sketchChannels.push(req.query._id);
			}
			var data = {
				channels: sketchChannels
			};
			// run the database update
			dbSketch.getUpdateHandler(req).process(data, function(err) {
				if(err) return res.err('error updating sketch cnannel: ', err);
				req.flash('success', 'success adding sketch to channel');
				return res.redirect('');
			});
		});
	});
	// remove channel


	// delete
	view.on('get', {
		delete: 'true'
	}, function(next) {
		//
		keystone.list('Sketch').model.findOne({
			state: 'published',
			slug: locals.filters.sketch,
		})
		.exec(function (err, dbSketch) {
			if(err){
				//
				req.flash('error', 'error finding sketch to delete in database');
				return next();
			}
			if(!dbSketch){
				//
				req.flash('error', 'could not find sketch to delete');
				return next();
			}
			dbSketch.state = 'archived';
			dbSketch.save(function(err) {
				if(err) return res.err(err);
				req.flash('success', 'Sketch deleted!');
				return res.redirect('/');
			})
		})

	});

	// screenshot
	view.on('get', {
		screenshot: 'true'
	}, function (next) {
		var sys = require('sys');
		var exec = require('child_process').exec;
		var uploadName = 'screenshot_'+(Math.random().toString(36).substr(2, 6))+'.png';
		var uploadPath = res.locals.staticPath+locals.data.sketch.localDir+'/'+uploadName;//screenshot_'+(Math.random().toString(36).substr(2, 6))+'.png';
		var execCommand = 'import -window root -display :0.0 '+uploadPath;
		console.log('saving screenshot to: ' + uploadPath);
		// save screenshot
		function puts(error, stdout, stderr) {
			sys.puts(stdout);
		}
		// "import -window root -display :0.0 /tmp/screen.png"
		exec(execCommand, function (err, stdout, stderr) {
			console.log(stdout);
			if(err){
				req.flash('warning', 'not done');
				return res.redirect('/browse/sketch/'+locals.data.sketch.slug);
			};
			keystone.list('Sketch').model.findById(locals.data.sketch.id).exec(function(err, item) {
				if(err){
					req.flash('warning', 'not done');
					return res.redirect('/browse/sketch/'+locals.data.sketch.slug);
				}	
				var imgs = {
					thumbnails: locals.data.sketch.thumbnails
				};
				imgs.thumbnails.push(uploadName);
				keystone.list('Sketch').updateItem(item, imgs, {
					fields: ["thumbnails"]
				}, function (dberror) {
					if(dberror) {
						console.log('db error: ' + dberror);
						req.flash('warning', 'not done');
						return res.redirect('/browse/sketch/'+locals.data.sketch.slug);		
					}
				});
			})
			// let updater = locals.data.sketch.getUpdateHandler(req, res, {
			// 	errorMessage: 'error updating sketch with screenshot'
			// });
			// updater.process()
			console.log('thumbnails: '+locals.data.sketch.thumbnails);
			if(err){
				req.flash('warning', 'not done');
				return res.redirect('/browse/sketch/'+locals.data.sketch.slug);
			}else{
				req.flash('success', 'done');
				return res.redirect('/browse/sketch/'+locals.data.sketch.slug);
			}
			next(err);
		});
		// upload screenshot from file
		// locals.data.sketch._.image.upload({
		// 	path: '/tmp/screen.png'
		// }, (err) => { console.log('done done done') });

		//return next();
	});

	// // Forward instruction to display selected sketch
	// view.on('get', {
	// 	display: 'on'
	// }, function (next) {

	// 	// // if image does not exist
	// 	// if (locals.data.sketch.image.exists) {
	// 	// 	console.log('going to try ')
	// 	// 	//var fs = require('fs');
	// 	// 	var sys = require('sys')
	// 	// 	var exec = require('child_process').exec;
	// 	// 	// save screenshot
	// 	// 	function puts(error, stdout, stderr) {
	// 	// 		sys.puts(stdout)
	// 	// 	}
	// 	// 	exec("sleep 7 && import -window root -display :0.0 /tmp/screen.png", function (err, stdout, stderr) {
	// 	// 		console.log(stdout);
	// 	// 	});
	// 	// 	// upload screenshot from file
	// 	// 	locals.data.sketch._.image.upload({
	// 	// 		path: '/tmp/screen.png',
	// 	// 	}, (err) => { console.log('done done done') });
	// 	// }

	// 	var sketchPath = 'file:///' + locals.data.sketch.localPath + 'index.html';
	// 	//ipc.of.dplayeripc.emit('message', sketchPath);
	// 	req.flash('success', 'Sketch queued for display.')
	// 	return next();
	// });

	// // update ipns
	// view.on('get', {
	// 	update: 'ipns'
	// }, function (next) {

	// 	var fs = require('fs');
	// 	var path = require('path');

	// 	var sketchPath = '/data/content/view-static/' + locals.data.sketch.localDir;
	// 	var ipnsURI = '/ipns/' + locals.data.sketch.ipnsHash; //QmZXWHxvnAPdX1PEc7dZHTSoycksUE7guLAih8z3b43UmU'
	// 	locals.ipfs.name.resolve(ipnsURI, function (err, ipfsHash) {
	// 		if (err) {
	// 			console.log(err);
	// 		} else {
	// 			console.log('Resolved name:');
	// 			console.log(ipfsHash);
	// 			var ipfsURI = '/ipfs/QmXb44wak42nvBeuyPXDHQSapXnKNJV9WYLDA5a5GnNP8t' //'/ipfs/' + ipfsHash;
	// 			locals.ipfs.files.get(ipfsURI, function (err, files) {
	// 				if (err) {
	// 					//console.log('not workng')
	// 					console.log(err)
	// 				} else {
	// 					//console.log('workng')
	// 					files.forEach((file) => {
	// 						if (file.content) {

	// 							//console.log(file.path);
	// 							var fileName = file.path.slice(46); // trim ipfs hash
	// 							var fileDir = path.dirname(fileName);
	// 							//var filePath = sketchPath + fileDir; // full directory
	// 							fileDir
	// 								.split(path.sep)
	// 								.reduce((currentPath, folder) => {
	// 									currentPath += folder + path.sep;
	// 									if (!fs.existsSync(path.join(sketchPath, currentPath))) {
	// 										try {
	// 											fs.mkdirSync(path.join(sketchPath, currentPath));
	// 										} catch (fserr) {
	// 											if (fserr.code !== 'EEXIST') {
	// 												throw fserr;
	// 											}
	// 										}
	// 									}
	// 									return currentPath;
	// 								}, '');
	// 							var fileURI = sketchPath + fileName;
	// 							//console.log(fileURI);
	// 							fs.writeFile(fileURI, file.content, 'binary', (err) => {
	// 								if (err) console.log(err)
	// 								//else console.log('File saved')
	// 							});
	// 						}
	// 					});
	// 				}
	// 			});

	// 		}
	// 	});
	// 	req.flash('success', 'Handled.');
	// 	return next();
	// });

	// Render the view
	view.render('sketch');
};