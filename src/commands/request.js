const Command = require('../base')
const globalFlags = require('../helpers/global-flags')
const jsonHelper = require('../helpers/json')
const requestHelper = require('../helpers/request')
const ora = require('ora')

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

    const {args, flags: {domain}} = this.parse(RequestCommand)

    let parsedPayload
    try {
      parsedPayload = args.payload ? JSON.parse(args.payload) : null
    } catch (error) {
      spinner.fail('Failed to parse your input payload. Please provide valid JSON.')
      return
    }

    try {
      const result = await requestHelper.request(args.method, args.resource, parsedPayload, {domain})
      spinner.stop()
      this.log(jsonHelper.prettify(result.body))
    } catch (error) {
      spinner.fail('Request failed: ' + error.statusCode + ' ' + error.statusMessage)
      this.error(jsonHelper.prettify(error.body))
    }
  }
}

RequestCommand.description = `Run abstract API request
Runs an arbitrary API request given the HTTP method, endpoint, and input payload.

Data should be provided as a JSON object.
`

RequestCommand.args = [
  {
    name: 'method',
    required: true,
    description: 'HTTP method',
    options: ['GET', 'POST', 'PUT', 'DELETE'],
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
}

RequestCommand.examples = [
  '$ chec request GET /v1/products',
  '$ chec request GET /v1/orders',
  '$ chec request GET /v1/products \'{"limit":1}\'',
]

module.exports = RequestCommand
