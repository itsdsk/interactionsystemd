// connect to ui and backend
var socket = io();
var mainSocket = new WebSocket('ws://localhost:9002');

// events to handle user interactions on main page
document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('#brightnessInput').onchange = function (event) {
        var data = {
            "window": {
                "brightness": parseFloat(this.value)
            }
        };
        console.log(JSON.stringify(data));
        mainSocket.send(JSON.stringify(data));
    };
    document.querySelector('#urlInput').onkeyup = function (event) {
        if (event.keyCode == 13) { // 'Enter'
            socket.emit('playURL', this.value);
            console.log("sent " + this.value);
        }
    };
}, false);

// input handlers
socket.emit('load');
socket.on('load', function (msg) {
    // insert HTML body received from server into page
    document.getElementById("container").innerHTML += (msg);
    // add input handlers
    document.querySelectorAll('.newDiskButton').forEach(function (newDiskButton) {
        newDiskButton.onclick = newDiskButtonHandler;
    });
    document.querySelectorAll('.viewChannelButton').forEach(function (viewChannelButton) {
        viewChannelButton.onclick = viewChannelButtonHandler;
    });
    document.querySelectorAll('.playDiskButton').forEach(function (playDiskButton) {
        playDiskButton.onclick = playDiskButtonHandler;
    });
    document.querySelectorAll('.editDiskButton').forEach(function (editDiskButton) {
        editDiskButton.onclick = editDiskButtonHandler;
    });
});

function editDiskButtonHandler(event) {
    var diskDirectory = this.parentElement.children[2].innerHTML;
    socket.emit('loadeditor', diskDirectory);
}

function playDiskButtonHandler(event) {
    var diskDirectory = this.parentElement.children[2].innerHTML;
    socket.emit('play', diskDirectory);
}

function viewChannelButtonHandler(event) {
    var channelName = this.parentElement.firstElementChild.innerHTML;
    socket.emit('loadchannel', channelName);
}

function newDiskButtonHandler(event) {
    var channelName = this.parentElement.firstElementChild.innerHTML;
    socket.emit('createdisk', channelName);
}

socket.emit('loadoutput');
var gap = 50;
var x_min = gap;
var x_max = 0;
var y_min = gap;
var y_max = 0;
var lastReceivedOutputMsg;

socket.on('loadoutput', function (msg) {
    lastReceivedOutputMsg = msg;
    setConfig();
});

function setConfig(msg = lastReceivedOutputMsg) {
    // add svg to HTML
    document.getElementById("outputGraphic").innerHTML = msg;
    // get SVG width+height and set boundaries
    var s_width = document.querySelector("svg").width.baseVal.value;
    var s_height = document.querySelector("svg").height.baseVal.value;
    x_max = s_width - gap;
    y_max = s_height - gap;
    // click circle event
    document.querySelectorAll("circle").forEach(function (circle) {
        circle.onmousedown = function () {
            // circle id (e.g. output 0 circle 1 = "o0_c1") has connected line IN with id "o0_c0l" and line OUT with id "o0_c1l"
            var _lineIn = document.querySelector("#" + circle.id.replace(/.$/, parseInt(circle.id.slice(-1)) - 1) + "l");
            var _lineOut = document.querySelector("#" + circle.id + "l");
            _drag_init(this, _lineIn, _lineOut);
            return false;
        };
    });
    // save output event
    document.querySelector('#saveOutputButton').onclick = function () {
        socket.emit('saveconfig');
    };
    // update output event
    document.querySelector('#updateOutputButton').onclick = function () {
        // update config (data structure resembles host's config.json)
        var data = {
            "window": {},
            "outputs": []
        };
        // get window properties
        document.querySelectorAll("#outputForm .window input").forEach(function (windowProperty) {
            data.window[windowProperty.className] = windowProperty.value;
        });
        // get output properties (except LEDs)
        document.querySelectorAll("#outputForm .outputs > div").forEach(function (outputDiv) {
            var output = {
                "device": outputDiv.className,
                "properties": {}
            };
            outputDiv.querySelectorAll(".properties textarea,input").forEach(function (propertyInput) {
                output.properties[propertyInput.className] = propertyInput.value;
            });
            data.outputs.push(output);
        });
        // send to server
        socket.emit('updateconfig', data);
    };
    // reset output event
    document.querySelector('#resetOutputButton').onclick = function () {
        setConfig();
    };
}

socket.on('loadeditor', function (msg) {
    // add received HTML to DOM
    document.getElementById("diskContainer").innerHTML = msg;
    // hide/show containers
    document.getElementById("indexContainer").style.display = "none";
    document.getElementById("diskContainer").style.display = "block";
    // enter text in channel search box event
    document.getElementById("editorChannelsInput").onkeyup = function () {
        // declare variables
        var input = this.value.toUpperCase();
        var ul, li, a, i, txtValue;
        ul = document.getElementById('editorChannelList');
        li = ul.getElementsByTagName("li");
        // loop through list items
        for (i = 0; i < li.length; i++) {
            a = li[i].getElementsByTagName("a")[0];
            txtValue = a.textContent || a.innerText;
            if (txtValue.toUpperCase().indexOf(input) > -1) {
                li[i].style.display = "";
            } else {
                li[i].style.display = "none";
            }
        }
    };
    // create channel event
    document.getElementById("newChannelButton").onclick = function () {
        // get new channel name
        var name = document.getElementById("editorChannelsInput").value;
        // todo: add disk open in editor to new channel...
        //var directory = this.parentElement.children[1].innerHTML;
        socket.emit('createchannel', name);

    };
    // delete from channel event
    document.querySelectorAll('.editorConnectedChannelItem').forEach(function (editorConnectedChannelItem) {
        editorConnectedChannelItem.onclick = editorDisconnectChannelHandler;
    });
    // add to channel event
    document.querySelectorAll('.editorDisconnectedChannelItem').forEach(function (editorDisconnectedChannelItem) {
        editorDisconnectedChannelItem.onclick = editorConnectChannelHandler;
    });
    // update file event
    document.querySelectorAll('.editorUpdateFileButton').forEach(function (editorUpdateFileButton) {
        editorUpdateFileButton.onclick = editorUpdateFileHandler;
    });
    // commit/save version event
    document.getElementById("editorSaveButton").onclick = function () {
        var directory = this.parentElement.children[1].innerHTML;
        socket.emit('saveversion', directory);
    };
    // close editor event
    document.getElementById("editorCloseButton").onclick = function() {
        document.getElementById("indexContainer").style.display = "block";
        document.getElementById("diskContainer").style.display = "none";    
    };
});

function editorUpdateFileHandler(event) {
    // get data
    var directory, filename, fileindex, text;
    directory = this.parentElement.parentElement.children[1].innerHTML;
    filename = this.parentElement.firstElementChild.innerHTML;
    fileindex = this.parentElement.dataset.rowId;
    text = this.parentElement.children[1].value;
    // format
    var data = {
        directory: directory,
        filename: filename,
        fileID: fileindex,
        text: text
    };
    // send to server
    socket.emit('updatefile', data);
}

function editorConnectChannelHandler(event) {
    var directory = this.parentElement.parentElement.parentElement.children[1].innerHTML;
    var channel = this.innerHTML;
    socket.emit('createconnection', [directory, channel]);
}

function editorDisconnectChannelHandler(event) {
    var directory = this.parentElement.parentElement.parentElement.children[1].innerHTML;
    var channel = this.innerHTML;
    socket.emit('deleteconnection', [directory, channel]);
}

//
//
//

var selected = null, // Object of the element to be moved
    lineIn = null,
    lineOut = null,
    x_pos = 0,
    y_pos = 0, // Stores x & y coordinates of the mouse pointer
    x_elem = 0,
    y_elem = 0; // Stores top, left values (edge) of the element

// Will be called when user starts dragging an element
function _drag_init(elem, _lineIn, _lineOut) {
    // Store the object of the element which needs to be moved
    selected = elem;
    lineIn = _lineIn;
    lineOut = _lineOut;
    x_elem = x_pos - selected.cx.baseVal.value;
    y_elem = y_pos - selected.cy.baseVal.value;
}

// Will be called when user dragging an element
function _move_elem(e) {
    x_pos = document.all ? window.event.clientX : e.pageX;
    y_pos = document.all ? window.event.clientY : e.pageY;
    if (selected !== null) {
        selected.cx.baseVal.value = x_pos - x_elem;
        selected.cy.baseVal.value = y_pos - y_elem;
        if (lineIn) {
            lineIn.x2.baseVal.value = x_pos - x_elem;
            lineIn.y2.baseVal.value = y_pos - y_elem;
        }
        if (lineOut) {
            lineOut.x1.baseVal.value = x_pos - x_elem;
            lineOut.y1.baseVal.value = y_pos - y_elem;
        }
    }
}

// Destroy the object when we are done
function _drop_elem() {
    // keep led in boundaries
    if (selected !== null) {
        x_pos = Math.min(Math.max(x_pos - x_elem, x_min), x_max);
        y_pos = Math.min(Math.max(y_pos - y_elem, y_min), x_max);
        selected.cx.baseVal.value = x_pos;
        selected.cy.baseVal.value = y_pos;
        if (lineIn) {
            lineIn.x2.baseVal.value = x_pos;
            lineIn.y2.baseVal.value = y_pos;
        }
        if (lineOut) {
            lineOut.x1.baseVal.value = x_pos;
            lineOut.y1.baseVal.value = y_pos;
        }
        // send updated led to server (data structure resembles host's config.json)
        var data = {
            "outputs": [{
                "device": selected.parentElement.className.baseVal,
                "leds": [{
                    "index": parseInt(selected.id.slice(-1)),
                    "x": selected.cx.baseVal.value,
                    "y": selected.cy.baseVal.value,
                    "r": selected.r.baseVal.value
                }]
            }]
        };
        //socket.emit('updateconfig', data);
        mainSocket.send(JSON.stringify(data));
    }
    // reset
    selected = null;
}

document.onmousemove = _move_elem;
document.onmouseup = _drop_elem;