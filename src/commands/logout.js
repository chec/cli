const {Command} = require('@oclif/command')
const loginHelper = require('../helpers/auth')

class LogoutCommand extends Command {
  async run() {
    // Blank out the key to force a logout
    loginHelper.logout()
    this.log('Successfully logged out from Chec.io')
  }
}

LogoutCommand.description = `Log into your Chec.io account
Log into your Chec.io account to enable commands that require API access.
`
module.exports = LogoutCommand
