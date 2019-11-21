const Command = require('../base')
const globalFlags = require('../helpers/global-flags')
const requestHelper = require('../helpers/request')
const ora = require('ora')
const chalk = require('chalk')

/**
 * Tells you who you're logged in as
 */
class WhoamiCommand extends Command {
  requiresAuth() {
    return true
  }

  async run() {
    const spinner = ora({
      text: 'Processing...',
      stream: process.stdout,
    }).start()

    const {flags: {domain}} = this.parse(WhoamiCommand)

    try {
      const result = await requestHelper.request('GET',
        '/v1/developer/user', {}, {domain})
      spinner.stop()

      const data = JSON.parse(result.body)
      this.log(`${chalk.green.bold(data.email)}: ${data.merchants.map(merchant => merchant.business_name).join(', ')}`)
    } catch (error) {
      spinner.fail('Request failed! ' + error.statusCode + ' ' + error.statusMessage)
    }
  }
}

WhoamiCommand.description = `Get information on your user account
Fetches information on your user account, and merchants associated with your account.
`

WhoamiCommand.args = []

WhoamiCommand.flags = {
  ...globalFlags,
}

WhoamiCommand.examples = [
  '$ chec whoami',
]

module.exports = WhoamiCommand
