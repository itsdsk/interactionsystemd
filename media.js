const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// compile media
var template;
fs.readFile(__dirname + "/template.handlebars", function (err, data) {
    if (err) throw err;
    template = Handlebars.compile(data.toString());
});
var mediaPathRoot = './media';
module.exports = {
    // build local database in memory
    scanMedia: function () {
        var media = new Array();
        // look in each folder in content directory
        fs.readdirSync(mediaPathRoot).filter(function (mediaPath) {
            if (fs.statSync(path.join(mediaPathRoot, mediaPath)).isDirectory()) {
                // load json
                var meta = require(path.join(__dirname, mediaPathRoot, mediaPath, 'demo.json'));
                meta.directory = mediaPath;
                // load files
                meta.files = new Array();
                (meta.demo.files).forEach(filename => {
                    fs.readFile(path.join(__dirname, mediaPathRoot, mediaPath, filename), 'utf8', function (err, buf) {
                        if (err) throw err;
                        var fileData = {
                            name: filename,
                            text: buf
                        };
                        meta.files.push(fileData);
                        //console.log(meta);
                        //media.push(meta);
                    });
                });
                // parse image into json
                fs.readFile('./media/item1/thumb.jpg', function (err, buf) {
                    if (err) throw err;
                    meta.img_src = "data:image/jpeg;base64," + buf.toString('base64');
                    //media.push(meta);
                });
                // add item to array
                media.push(meta);
            }
        });
        return media;
    },
    mediaObjectToHtml: function (item) {
        return template(item);
    },
    updateFile: function (localItem, mediaUpdate) {
        // get object with matching filename
        var mediaItemFile = localItem.files.find(object => {
            return object.name === mediaUpdate.filename;
        });
        // save updated text in memory
        mediaItemFile.text = mediaUpdate.text;
        // save updated text to file on disk
        var filePath = path.join(__dirname, mediaPathRoot, localItem.directory, mediaUpdate.filename);
        fs.writeFile(filePath, mediaUpdate.text, function (err) {
            if (err) console.log(err);
            console.log('saved ' + filePath);
        });
    },
    playLocalMedia: function (name) {
        var filePath = path.join(__dirname, mediaPathRoot, name);
        console.log('playing local media: ' + filePath);
        // TODO: reimplement IPC to send filepath to renderer
    }
};