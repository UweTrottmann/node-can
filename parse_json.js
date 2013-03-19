/*
 * Copyright 2013 Uwe Trottmann
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 */

var fs = require('fs');

/**
 * Takes the path to a JSON file including a CAN network description. Tries to
 * parse it for use with node-can.
 * @param {type} fileName
 * @returns {Error|parseJsonConfiguration.result}
 */
function parseJsonFile(fileName) {
  var jsonFile;

  try {
    // load the config file
    rawFile = fs.readFileSync(fileName);
    jsonFile = JSON.parse(rawFile);
  } catch (err) {
    return new Error("Failed to load config: " + err.message);
  }

  var network = {};

  // Nodes are not supported right now

  // Buses
  network.buses = {};
  for (bus in jsonFile.buses) {
    network.buses[bus] = {};
    var parsedBus = network.buses[bus];

    parsedBus['messages'] = [];
    var messages = jsonFile.buses[bus].messages;
    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];

      var parsedMessage = {
        name: message.name,
        id: parseInt(message.id),
        ext: message.format == 'extended',
        triggered: message.triggered == 'true',
        length: message.length,
        interval: message.interval ? parseInt(message.interval) : 0,
        signals: []
      };

      parsedBus['messages'].push(parsedMessage);

      // Signals for this message
      var maxOffset = 0;
      var signals = message.signals;
      for (var s = 0; s < signals.length; s++) {
        var signal = signals[s];
        
        var parsedSignal = {
          name: signal.name,
          bitLength: signal.bitLength ? parseInt(signal.bitLength) : 1,
          bitOffset: signal.bitOffset ? signal.bitOffset : 0,
          endianess: signal.endianess ? signal.endianess : 'little',
        };

        // get max offset
        var signalOffset = parsedSignal.bitOffset + parsedSignal.bitLength;
        if (signalOffset > maxOffset) {
          maxOffset = signalOffset;
        }

        parsedMessage.signals.push(parsedSignal);
      }

      // calc a length if none is given
      if (!parsedMessage.length) {
        parsedMessage.length = parseInt(maxOffset / 8);
        if (maxOffset % 8 > 0)
          parsedMessage.length++;
      }
    }
  }

  return network;
}

exports.parseJsonFile = parseJsonFile;