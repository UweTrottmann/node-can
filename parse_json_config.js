/**
 * Takes the path to a JSON file including a CAN network description. Tries to
 * parse it for use with node-can.
 * @param {type} fileName
 * @returns {Error|parseJsonConfiguration.result}
 */
function parseJsonConfiguration(fileName) {
  var jsonFile;
  try {
    // load the config file
    jsonFile = require(fileName);
  } catch (err) {
    return new Error("Failed to load config: " + err.message);
  }

  var result = {}; // Result will be a dictionary describing the whole network

  result.nodes = {};

  result.buses = {};
  for (b in jsonFile.buses) {
    
  }

  return result;
}

exports.parseJsonConfiguration = parseJsonConfiguration;