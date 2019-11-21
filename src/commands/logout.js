const Command = require('../base')
const ora = require('ora')
const loginHelper = require('../helpers/auth')

class LogoutCommand extends Command {
  async run() {
    // Blank out the key to force a logout
    loginHelper.logout()
    ora({stream: process.stdout}).succeed('Logged out')
  }
}

LogoutCommand.description = `Log out of your account
Log out of your account and remove the local copy of your API keys.
`
module.exports = LogoutCommand
