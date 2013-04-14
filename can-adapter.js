// Wrapper class around node-can can.js for easy setup
var can = require('./can');
var fs = require('fs');

var network;
var channel;
var db;

/**
 * Set up the CAN network and create a channel to listen on.
 * @param {type} networkDescriptionFilePath Path to network description JSON.
 * @param {type} canChannelName Name of SocketCAN interface to use (e.g. vcan0).
 * @param {type} canBusName Name of CAN bus as defined in description file.
 * @param {type} isDecodingInJavascript Whether to use C or JS code for signal decoding.
 */
function setup(networkDescriptionFilePath, canChannelName, canBusName, isDecodingInJavascript) {
  console.log("Setting up CAN adapter...");

  if (typeof networkDescriptionFilePath !== 'string'
          || typeof canChannelName !== 'string'
          || typeof canBusName !== 'string') {
    return new Error("All parameters need to be string.");
  }

  try {
    // Parse database
    network = can.parseNetworkDescriptionJson(networkDescriptionFilePath);
    // Create channel for virtual CAN interface
    channel = can.createRawChannel(canChannelName);
    // Create new db service for channel and messages
    db = new can.DatabaseService(channel, network.buses[canBusName].messages, isDecodingInJavascript);

    channel.start();
  } catch (err) {
    return new Error("Failed to setup: " + err.message);
  }

  console.log("Setting up CAN adapter... DONE");
}

/**
 * Tear down the CAN adapter.
 * @returns {Error}
 */
function stop() {
  console.log("Stopping CAN adapter...");

  try {
    channel.stop();
  } catch (err) {
    return new Error("Could not tear down CAN channel: " + err.message);
  }

  console.log("Stopping CAN adapter... DONE");
}

/**
 * Convenience method which allows to register listeners by simply passing
 * either a message name or a <messagename>.<signalname>.
 * @param {type} messageOrSignalName
 * @param {type} onUpdateCallback
 * @returns {undefined}
 */
function registerListener(messageOrSignalName, onUpdateCallback) {
  var strArr = messageOrSignalName.split(".");

  if (strArr.length === 1) {
    registerMessageListener(strArr[0], onUpdateCallback);
  } else if (strArr.length === 2) {
    registerSignalListener(strArr[0], strArr[1], onUpdateCallback);
  }
}

/**
 * Convenience method which allows to unregister listeners by simply passing
 * either a message name or a <messagename>.<signalname>.
 * @param {type} messageOrSignalName
 * @param {type} onUpdateCallback
 * @returns {undefined}
 */
function unregisterListener(messageOrSignalName, onUpdateCallback) {
  var strArr = messageOrSignalName.split(".");

  if (strArr.length === 1) {
    unregisterMessageListener(strArr[0], onUpdateCallback);
  } else if (strArr.length === 2) {
    unregisterSignalListener(strArr[0], strArr[1], onUpdateCallback);
  }
}

/**
 * Set up a listener for the given message. Message name must exist in the
 * setup network. Listeners will get fed a node-can Message object.
 * @param {type} messageName
 * @param {type} onUpdateCallback
 */
function registerMessageListener(messageName, onUpdateCallback) {
  ensureMessageSetup(messageName);

  db.messages[messageName].registerOnChangeListener(onUpdateCallback);
}

/**
 * Remove a listener for the given message. Message name must exist in the
 * setup network.
 * @param {type} messageName
 * @param {type} onUpdateCallback
 */
function unregisterMessageListener(messageName, onUpdateCallback) {
  ensureMessageSetup(messageName);

  db.messages[messageName].unregisterOnChangeListener(onUpdateCallback);
}

/**
 * Set up a listener for the given message and signal name. Both names need
 * to exist in the setup network. Listeners will get fed a node-can
 * Signal object.
 * @param {type} messageName
 * @param {type} signalName
 * @param {type} onUpdateCallback
 */
function registerSignalListener(messageName, signalName, onUpdateCallback) {
  ensureSignalSetup(messageName, signalName);

  db.messages[messageName].signals[signalName].registerOnChangeListener(onUpdateCallback);
}

/**
 * Remove a listener for the given message and signal name. Both names need
 * to exist in the setup network.
 * @param {type} messageName
 * @param {type} signalName
 * @param {type} onUpdateCallback
 */
function unregisterSignalListener(messageName, signalName, onUpdateCallback) {
  ensureSignalSetup(messageName, signalName);

  db.messages[messageName].signals[signalName].unregisterOnChangeListener(onUpdateCallback);
}

/**
 * Update the value of the given signal. You still will have to trigger
 * sending by calling send.
 * @param {type} messageName
 * @param {type} signalName
 * @param {type} value
 */
function updateSignalValue(messageName, signalName, value) {
  ensureSignalSetup(messageName, signalName);

  db.messages[messageName].signals[signalName].update(value);
}

/**
 * Send current signal values of the given message onto the CAN bus.
 * @param {type} messageName
 * @returns {undefined}
 */
function sendMessage(messageName) {
  ensureMessageSetup(messageName);

  db.send(messageName);
}

function ensureMessageSetup(messageName) {
  if (db === undefined) {
    throw "Setup CAN network first.";
  }
  if (db.messages[messageName] === undefined) {
    throw "Message does not exist, make sure to use the exact naming scheme as specified inside the network JSON.";
  }
}

function ensureSignalSetup(messageName, signalName) {
  ensureMessageSetup(messageName);

  if (db.messages[messageName].signals[signalName] === undefined) {
    throw "Signal does not exist, make sure to use the exact naming scheme as specified inside the network JSON.";
  }
}

exports.setup = setup;
exports.stop = stop;
exports.registerListener = registerListener;
exports.unregisterListener = unregisterListener;
exports.registerMessageListener = registerMessageListener;
exports.unregisterMessageListener = unregisterMessageListener;
exports.registerSignalListener = registerSignalListener;
exports.unregisterSignalListener = unregisterSignalListener;
exports.updateSignalValue = updateSignalValue;
exports.sendMessage = sendMessage;