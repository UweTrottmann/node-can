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

/**
 * Decodes the given data based on the given offset, length, endianess and type.
 * @param {type} data
 * @param {type} bitOffset
 * @param {type} bitLength
 * @param {type} isLittleEndian
 * @param {type} isSigned
 * @returns {Error|Number}
 */
function decodeSignal(data, bitOffset, bitLength, isLittleEndian, isSigned) {
  if (!Buffer.isBuffer(data)) {
    throw "Data is not a buffer.";
  }

  var buffer = new Buffer(data.length);
  data.copy(buffer);

  var byteOffset = Math.floor(bitOffset / 8);
  switch (bitLength) {
    case 8:
      if (isSigned) {
        return data.readInt8(byteOffset);
      } else {
        return data.readUInt8(byteOffset);
      }
    case 16:
      if (isSigned) {
        if (isLittleEndian) {
          return data.readInt16LE(byteOffset);
        } else {
          return data.readInt16BE(byteOffset);
        }
      } else {
        if (isLittleEndian) {
          return data.readUInt16LE(byteOffset);
        } else {
          return data.readUInt16BE(byteOffset);
        }
      }
    case 32:
      if (isSigned) {
        if (isLittleEndian) {
          return data.readInt32LE(byteOffset);
        } else {
          return data.readInt32BE(byteOffset);
        }
      } else {
        if (isLittleEndian) {
          return data.readUInt32LE(byteOffset);
        } else {
          return data.readUInt32BE(byteOffset);
        }
      }
  }

  return 0;
}

exports.decodeSignal = decodeSignal;