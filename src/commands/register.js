const {Command} = require('@oclif/command')
const ora = require('ora')
const chalk = require('chalk')
const {cli} = require('cli-ux')
const process = require('process')
const loginHelper = require('../helpers/login')
const globalFlags = require('../helpers/global-flags')
const questionHelper = require('../helpers/question-helper')
const requestHelper = require('../helpers/request')
const emailArg = require('../arguments/email')
const passwordArg = require('../arguments/password')

class RegisterCommand extends Command {
  async run() {
    const {flags} = this.parse(RegisterCommand)

    const answers = await questionHelper.ask([emailArg, passwordArg], flags)

    await this.createMerchant(answers)
  }

  async createMerchant(inputAttributes) {
    // Start a spinner while waiting for the API
    const spinner = ora({
      text: 'Creating Chec.io account...',
      stream: process.stdout,
    }).start()
    const {flags: {domain}} = this.parse(RegisterCommand)

    let response
    const {email, password} = inputAttributes

    try {
      response = await requestHelper.request('PUT', '/v1/merchants', {email, password}, {
        domain,
      })
    } catch (error) {
      spinner.fail('Account creation failed!')

      if (!error.response) {
        return this.error(`An unexpected error occurred (${error.code || error.name})`)
      }

      const {statusCode} = error.response

      // Check for 422 (unprocessable entity) which implies the input was not accepted
      if (statusCode !== 422) {
        return this.error(`An unexpected error occurred (${statusCode})`)
      }

      // Discover the invalid attributes
      const {errors} = JSON.parse(error.body).error

      // Go through the input attributes and prune out those that are invalid
      const stillValidParameters = Object.keys(inputAttributes).reduce((acc, field) => {
        // No errors means it's still valid and can be added to the accumulator
        if (!errors[field]) {
          return {
            ...acc,
            [field]: inputAttributes[field],
          }
        }

        // Log the invalid input and reasons it's invalid
        this.log(chalk.green(`Invalid "${chalk.yellow(field)}" provided:`))
        errors[field].forEach(message => {
          this.log(` - ${message}`)
        })

        // Return the prior accumulator without modifications (dropping our invalid attribute from the result)
        return acc
      }, {})

      // Recursively call this method after asking the user for new parameters
      const answers = await questionHelper.ask([emailArg, passwordArg], stillValidParameters)
      return this.createMerchant(answers)
    }

    let additionalMessage

    try {
      await loginHelper.login(email, password, domain)
    } catch (error) {
      additionalMessage = 'Could not log in with the CLI. Please try manually by running "chec login"'
    }
    spinner.succeed('Account created successfully!')
    if (additionalMessage) {
      this.log(additionalMessage)
    }

    this.log('You may now run commands on the CLI. Log in to the Chec.io dashboard at:')
    cli.url(`dashboard.${domain}/login`, `https://dashboard.${domain}/login`)

    return response
  }
}

RegisterCommand.description = `Register an account with Chec.io
Create an account with Chec.io where you can manage products and pricing that is available through the Chec API
`

RegisterCommand.flags = {
  email: emailArg.flag,
  password: passwordArg.flag,
  ...globalFlags,
}

module.exports = RegisterCommand
