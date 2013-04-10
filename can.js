/* Copyright Sebastian Haas <sebastian@sebastianhaas.info>. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

//-----------------------------------------------------------------------------
// CAN-Object

var can = require('./build/Release/can');
var buffer = require('buffer');

// Exports
exports.createRawChannel = function(channel, timestamps) {
  return new can.RawChannel(channel, timestamps);
}

//-----------------------------------------------------------------------------
// Signal-Object

var _signals = require('./build/Release/can_signals');
var signals = require('./signals')

var kcd = require('./parse_kcd');

var json = require('./parse_json');

function Signal(desc)
{
  this.name = desc['name'];

  this.bitOffset = desc['bitOffset'];
  this.bitLength = desc['bitLength'];
  this.endianess = desc['endianess'];
  this.type = desc['type'];

  this.offset = desc['offset'];
  this.factor = desc['factor'];

  this.minValue = desc['minValue'];
  this.maxValue = desc['maxValue'];
  this.resolution = desc['resolution'];

  this.value = desc['defaultValue'];
  if (!this.value)
    this.value = 0;

  this.listeners = [];
}

/**
 * Returns the signal value scaled and rounded based on this signals resolution,
 * minValue and maxValue.
 * @returns {undefined}
 */
Signal.prototype.getValue = function() {
  if (!this.minValue || !this.maxValue || !this.resolution) {
    // return value unmodified
    return this.value;
  }
  var targetRange = this.maxValue - this.minValue;
  var sourceRange = Math.pow(2, this.bitLength) - 1;
  var percentage = this.value / sourceRange;
  var exactValue = percentage * targetRange;
  var targetValue = Math.floor(exactValue / this.resolution) * this.resolution;
  targetValue += this.minValue;

  return targetValue;
};

/**
 * Register a listener for changes on this signal.
 * @param {type} listener
 * @returns {undefined}
 */
Signal.prototype.registerOnChangeListener = function(listener) {
  // add listener to array
  this.listeners.push(listener);
};

/**
 * Unregister any listeners matching the passed one.
 * @param {type} listener
 * @returns {undefined}
 */
Signal.prototype.unregisterOnChangeListener = function(listener) {
  for (var i = 0; i < this.listeners.length; i++) {
    if (this.listeners[i] === listener) {
      // remove listener from array
      this.listeners.splice(i, 1);
    }
  }
};

// Someone wants to change signals' value
Signal.prototype.update = function(newValue) {
  // Nothing changed
  if (this.value != newValue) {
    this.value = newValue;
  }

  /////////////////////////////////////////////////////////////////////////////
  // MODIFIED to always send an update
  // Update all listeners, that the signal changed
  for (f in this.listeners) {
    this.listeners[f](this);
  }
  /////////////////////////////////////////////////////////////////////////////
};

//-----------------------------------------------------------------------------
// Message-Object
function Message(desc)
{
  this.id = desc.id;
  this.ext = desc.ext;

  this.name = desc.name;

  this.length = desc.length;

  this.signals = [];

  for (i in desc['signals']) {
    var s = desc['signals'][i];
    this.signals[s.name] = new Signal(s);
  }

  this.listeners = [];
}

/**
 * Register a listener for changes on all signals for this message.
 * @param {type} listener
 * @returns {undefined}
 */
Message.prototype.registerOnChangeListener = function(listener) {
  // add listener to array
  this.listeners.push(listener);
};

/**
 * Unregister any listeners matching the passed one.
 * @param {type} listener
 * @returns {undefined}
 */
Message.prototype.unregisterOnChangeListener = function(listener) {
  for (var i = 0; i < this.listeners.length; i++) {
    if (this.listeners[i] === listener) {
      // remove listener from array
      this.listeners.splice(i, 1);
    }
  }
};

/**
 * Notify listeners that a new message with potential new signal values has arrived.
 * @returns {undefined}
 */
Message.prototype.update = function() {
  for (f in this.listeners) {
    this.listeners[f](this);
  }
};

//-----------------------------------------------------------------------------
// DatabaseService
function DatabaseService(channel, db_desc, isUsingJavascriptDecoding) {
  this.channel = channel;
  this.isUsingJavascriptDecoding = isUsingJavascriptDecoding;

  this.messages = [];

  for (i in db_desc) {
    var m = db_desc[i];
    var id = m.id | (m.ext ? 1 : 0) << 31;

    var nm = new Message(m);
    this.messages[id] = nm;
    this.messages[m.name] = nm;
  }

  channel.addListener("onMessage", this.onMessage, this);
}

DatabaseService.prototype.onMessage = function(messageReceived) {
  if (messageReceived.rtr)
    return;

  id = messageReceived.id | (messageReceived.ext ? 1 : 0) << 31;

  var messageLocal = this.messages[id];

  if (!messageLocal)
  {
    console.log("Message ID " + messageReceived.id + " not found");
    return;
  }

  // Extract and convert all signals
  for (i in messageLocal.signals) {
    var s = messageLocal.signals[i];

    if (this.isUsingJavascriptDecoding) {
      // Decode with Javascript code
      var val = signals.decodeSignal(messageReceived.data, s.bitOffset, s.bitLength, s.endianess == 'little', s.type == 'signed');
    } else {
      // Decode with C code
      var val = _signals.decode_signal(messageReceived.data, s.bitOffset, s.bitLength, s.endianess == 'little', s.type == 'signed');
    }

    if (s.factor)
      val *= s.factor;

    if (s.offset)
      val += s.offset;

    s.update(val);
  }

  // update listeners on this message
  messageLocal.update();
}

DatabaseService.prototype.send = function(msg_name) {
  var m = this.messages[msg_name]

  if (!m)
    throw msg_name + " not defined";

  var canmsg = {
    id: m.id,
    ext: m.ext,
    rtr: false,
    data: new Buffer(m.length)
  }

  for (var i = 0; i < m.length; i++)
    canmsg.data[i] = 0;

  for (i in m.signals) {
    var s = m.signals[i];

    var val = s.value;

    // Apply factor/offset and convert to Integer
    if (s.offset)
      val -= s.offset;

    if (s.factor)
      val /= s.factor;

    if (typeof(val) == 'double')
      val = parseInt(Math.round(val));

    _signals.encode_signal(canmsg.data, s.bitOffset, s.bitLength, s.endianess == 'little', s.type == 'signed', val);
  }

  this.channel.send(canmsg);
}

// Exports
exports.parseNetworkDescription = kcd.parseKcdFile;
exports.parseNetworkDescriptionJson = json.parseJsonFile;
exports.DatabaseService = DatabaseService;

