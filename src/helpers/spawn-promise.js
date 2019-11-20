const {spawn} = require('child_process')

module.exports.spawn = (...spawnArgs) => new Promise((resolve, reject) => {
  const stream = spawn(...spawnArgs)
  stream.on('exit', resolve)
  stream.on('error', reject)
})
