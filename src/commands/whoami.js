const Command = require('../base')
const globalFlags = require('../helpers/global-flags')
const authHelper = require('../helpers/auth')
const requestHelper = require('../helpers/request')
const ora = require('ora')
const chalk = require('chalk')
const {cli} = require('cli-ux')

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

    const {flags} = this.parse(WhoamiCommand)

    try {
      const result = await requestHelper.request('GET',
        '/v1/developer/user', {}, {domain: flags.domain})
      spinner.stop()

      // Show email address and merchant name
      const data = JSON.parse(result.body)
      this.log(`${chalk.green.bold(data.email)}: ${data.merchants.map(merchant => merchant.business_name).join(', ')}`)

      // Show API keys
      this.log()

      cli.table(authHelper.getApiKeys(), {
        key: {},
        type: {},
        is_sandbox: {}, // eslint-disable-line camelcase
      }, {
        printLine: this.log,
        ...flags,
      })
    } catch (error) {
      const errorMessage = error.statusCode === 403 ?
        'Authentication error, try logging out and back in again.' :
        `Request failed: ${error.statusCode} ${error.statusMessage}`
      spinner.fail(errorMessage)
    }
  }
}

WhoamiCommand.description = `Get information on your user account
Fetches information on your user account, and merchants associated with your account.
`

WhoamiCommand.args = []

WhoamiCommand.flags = {
  ...globalFlags,
  ...cli.table.flags,
}

WhoamiCommand.examples = [
  '$ chec whoami',
]

module.exports = WhoamiCommand
