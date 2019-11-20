const {Writer} = require('fstream')

module.exports.create = options => new Writer(options)
