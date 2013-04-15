node-can for WebDAS
===================

This is a [NodeJS][1] SocketCAN extension. [SocketCAN][2] is a socket-based implementation of the CANbus protocol for Linux system.

This extensions makes it possible to send and receive CAN messages (extended, remote transission) using simple JavaScript functions.

**This is a fork of [sebi2k1/node-can][3] extended and customized for the needs of a university project.**

Usage
-----

Basic listening example:
```javascript
var canadapter = require('node-can');

// C Decoder is faster than JS Decoder
var isDecodeJS = false;

// Read message format from network.json
// Open socket on vcan0 interface
// Listen for messages on "Instrumentation" bus
canadapter.setup("./network.json", "vcan0", "Instrumentation", isDecodeJS);

// Message name, signal name, onUpdateCallback
canadapter.registerSignalListener("SteeringInfo", "WheelAngle", function(s) {
  // raw integer value
  var rawValue = s.value;
  // Converts using minValue, maxValue and resolution from network.json
  var convertedValue = s.getValue();
  console.log(Date.now() + ": Wheel angle is " + convertedValue);
});
```

Basic sending example:
```javascript
// same setup as above
var canadapter = require('node-can');
canadapter.setup("./network.json", "vcan0", "Instrumentation", false);

var newValue = 10;

// update signals of a message
canadapter.updateSignalValue("SteeringInfo", "WheelAngle", newValue);

// send the message onto the bus
canadapter.sendMessage("SteeringInfo");
```

There are also:
```javascript
// notifies when all signals for a message have been parsed
canadapter.registerMessageListener("SteeringInfo", function(m) {
  // access signals like m.signals["WheelAngle"].getValue()
});

// convenience method accepting just message names or message.signal names
// message listeners will call with a Message, signal listeners with a Signal back
canadapter.registerListener("SteeringInfo.WheelAngle", onUpdateCallback);

// Tear down channel
canadapter.stop();
```

Each registerX function has a **un**registerX sibling which removes the given onUpdateCallback. The network.json used for this example can be found in the samples folder.

[1]: http://nodejs.org/
[2]: http://en.wikipedia.org/wiki/SocketCAN
[3]: https://github.com/sebi2k1/node-can
