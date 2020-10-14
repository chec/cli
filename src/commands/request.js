const Command = require('../base')
const {flags} = require('@oclif/command')
const globalFlags = require('../helpers/global-flags')
const jsonHelper = require('../helpers/json')
const requestHelper = require('../helpers/request')
const fs = require('fs')
const ora = require('ora')
const chalk = require('chalk')

/**
 * Runs an arbitrary HTTP request against the Chec API
 */
class RequestCommand extends Command {
  requiresAuth() {
    return true
  }

  async run() {
    const spinner = ora({
      text: 'Processing...',
      stream: process.stdout,
    }).start()

    const {args, flags: {domain, sandbox, file}} = this.parse(RequestCommand)

    let parsedPayload
    try {
      if (args.payload) {
        parsedPayload = JSON.parse(args.payload)
      } else if (file) {
        parsedPayload = JSON.parse(fs.readFileSync(file))
      }
    } catch (error) {
      spinner.fail('Failed to parse your input payload. Please provide valid JSON.')
      if (file && !fs.existsSync(file)) {
        this.error(`Input file ${chalk.yellow(file)} could not be opened`)
      }
      return
    }

    try {
      const result = await requestHelper.request(args.method, args.resource, parsedPayload, {
        domain,
        sandbox,
      })
      spinner.stop()
      this.log(jsonHelper.prettify(result.body))
    } catch (error) {
      const errorMessage = error.statusCode === 403 ?
        'Authentication error, try logging out and back in again.' :
        `Request failed: ${error.statusCode} ${error.statusMessage}`
      spinner.fail(errorMessage)
      this.error(jsonHelper.prettify(error.body))
    }
  }
}

RequestCommand.description = `Run abstract API request
Runs an arbitrary API request given the HTTP method, endpoint, and input payload.

Data should be provided as a JSON object. You may also use \`--sandbox\` to use
sandbox API keys.
`

RequestCommand.args = [
  {
    name: 'method',
    required: true,
    description: 'HTTP method',
    options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
  {
    name: 'resource',
    required: true,
    description: 'API resource (e.g. /v1/products)',
  },
  {
    name: 'payload',
    required: false,
    description: 'Request payload (JSON encoded)',
  },
]

RequestCommand.flags = {
  ...globalFlags,
  sandbox: flags.boolean({
    description: 'Use sandbox API keys',
    default: false,
  }),
  file: flags.string({
    description: 'Optional: path to JSON encoded file containing request payload',
    default: null,
  }),
}

RequestCommand.examples = [
  '$ chec request GET /v1/products',
  '$ chec request GET /v1/orders',
  '$ chec request GET /v1/products \'{"limit":1}\'',
  '$ chec request GET /v1/products \'{"limit":1}\' --sandbox',
  '$ chec request POST /v1/assets --file=my-asset-payload.json',
]

module.exports = RequestCommand
