const {Command} = require('@oclif/command')
const got = require('got')
const ora = require('ora')
const chalk = require('chalk')
const {cli} = require('cli-ux')
const process = require('process')
const globalFlags = require('../helpers/global-flags')
const questionHelper = require('../helpers/question-helper')
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
    try {
      response = await got(`http://api.${domain}/v1/merchants`, {
        method: 'PUT',
        body: JSON.stringify(inputAttributes),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      spinner.fail('Account creation failed!')

      if (!error.response) {
        return this.error(`An unexpected error occured (${error.code || error.name})`)
      }

      const {body, statusCode} = error.response

      // Check for 422 (unprocessable entity) which implies the input was not accepted
      if (statusCode !== 422) {
        return this.error(`An unexpected error occured (${statusCode})`)
      }

      // Discover the invalid attributes
      const {errors} = JSON.parse(body).error

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
      return this.createMerchant(await questionHelper.ask([emailArg, passwordArg], stillValidParameters))
    }

    spinner.succeed('Account created successfully!')

    this.log('Login to your account at:')
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
