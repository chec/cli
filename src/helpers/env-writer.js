const fs = require('fs')
const {parseFile} = require('key-value-file')

module.exports.create = async filepath => {
  // "Touch" the file
  fs.closeSync(fs.openSync(filepath, 'a'))

  return parseFile(filepath)
}
