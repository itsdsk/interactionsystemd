const net = require('net');
const WebSocket = require('ws');
const EventEmitter = require('events');

var exports = module.exports = {};

// backend inter-process communication
exports.backend = null;

exports.initialiseBackend = function () {
    if (exports.backend == null || exports.backend.readyState != 1) {
        exports.backend = new WebSocket('ws://localhost:9002');
    }
};

exports.initialiseBackend();

exports.backend.on('error', function (err) {
    console.log('backend not connected', err);
});

exports.backend.on('open', function () {
    console.log('backend connected');
});

// renderer inter-process communication
const SOCKETFILE = "/tmp/renderer.sock";
exports.rendererConnected = false;
exports.renderer = null;
exports.rendererEvent = new EventEmitter();

var connectToRendererInterval;

function startConnectingToRenderer() {
    clearInterval(connectToRendererInterval);
    connectToRendererInterval = setInterval(connectToRenderer, 2500);
}

startConnectingToRenderer();

function connectToRenderer() {
    console.log("Connecting to renderer");
    exports.renderer = net.createConnection(SOCKETFILE)
        .on('connect', () => {
            console.log("Connected to renderer");
            exports.rendererConnected = true;
            clearInterval(connectToRendererInterval);
        })
        .on('data', function (data) {
            console.log("Received data from renderer: " + data.toString());
            exports.rendererEvent.emit('data', data);
            // if (data.toString() === '__disconnect') {
            //     cleanup();
            // } else {
            //     saveScreenshot();
            // }
        })
        .on('end', function () {
            console.log("Renderer ended communiction");
            exports.rendererConnected = false;
            exports.renderer.end();
            startConnectingToRenderer();
        })
        .on('close', function () {
            console.log("Renderer communiction closed");
            //startConnectingToRenderer();
        })
        .on('error', function (data) {
            console.log("Error communicating with renderer: " + data);
            exports.rendererConnected = false;
            exports.renderer.end();
            startConnectingToRenderer();
        });
}

// backend inter-process communication
const BACKENDSOCKETFILE = "/tmp/backend.sock";
exports.backendConnected = false;
exports.backend = null;
exports.backendEvent = new EventEmitter();

var connectToBackendInterval;

function startConnectingToBackend() {
    clearInterval(connectToBackendInterval);
    connectToBackendInterval = setInterval(connectToBackend, 2500);
}

startConnectingToBackend();

function connectToBackend() {
    console.log("Connecting to backend");
    exports.backend = net.createConnection(BACKENDSOCKETFILE)
        .on('connect', () => {
            console.log("Connected to backend");
            exports.backendConnected = true;
            clearInterval(connectToBackendInterval);
            //exports.backend.write("weifywkf");
        })
        .on('data', function (data) {
            console.log("Received data from backend: " + data.toString());
            exports.backendEvent.emit('data', data);
            setTimeout(function() {
                console.log("responding to broadcast");
                exports.backend.write("responsetobroadcast");
            }, 1500);
            // if (data.toString() === '__disconnect') {
            //     cleanup();
            // } else {
            //     saveScreenshot();
            // }
        })
        .on('end', function () {
            console.log("Backend ended communiction");
            exports.backendConnected = false;
            exports.backend.end();
            startConnectingToBackend();
        })
        .on('close', function () {
            console.log("Backend communiction closed");
            //startConnectingToRenderer();
        })
        .on('error', function (data) {
            console.log("Error communicating with backend: " + data);
            exports.backendConnected = false;
            exports.backend.end();
            startConnectingToBackend();
        });
}