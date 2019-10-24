const {Command} = require('@oclif/command')
const ora = require('ora')
const loginHelper = require('../helpers/auth')

class LogoutCommand extends Command {
  async run() {
    // Blank out the key to force a logout
    loginHelper.logout()
    ora({stream: process.stdout}).succeed('Logged out')
  }
}

LogoutCommand.description = `Log into your Chec.io account
Log into your Chec.io account to enable commands that require API access.
`
module.exports = LogoutCommand
