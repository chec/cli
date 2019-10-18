const {Command, flags} = require('@oclif/command')
const inquirer = require('inquirer')
const questionHelper = require('../helpers/question-helper')
const got = require('got')
const ora = require('ora')
const chalk = require('chalk')
const {cli} = require('cli-ux')
const process = require('process')

class RegisterCommand extends Command {
  async run() {
    const {flags} = this.parse(RegisterCommand)

    const answers = await this.getParameters(flags)

    await this.createMerchant(answers)
  }

  async getParameters(existingParameters) {
    const questions = questionHelper.buildQuestions([
      {
        name: 'email',
        validate: this.validateEmail,
        message: 'Please enter your email address',
      }, {
        name: 'password',
        type: 'password',
        validate: this.validatePassword,
        mask: '*',
        message: 'Enter a password',
      },
    ], existingParameters)

    return {
      ...existingParameters,
      ...(questions.length > 0 ? await inquirer.prompt(questions) : {}),
    }
  }

  async createMerchant(inputAttributes) {
    // Start a spinner while waiting for the API
    const spinner = ora({
      text: 'Creating Chec.io account...',
      stream: process.stdout,
    }).start()
    const {flags: {domain}} = this.parse()

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
      return this.createMerchant(await this.getParameters(stillValidParameters))
    }

    spinner.succeed('Account created successfully!')

    this.log('Login to your account at:')
    cli.url(`dashboard.${domain}/login`, 'http://dashboard.chec.local/login')

    return response
  }

  /**
   * @param {string} email The user provided email address
   * @returns {boolean} If the email address given is valid
   */
  validateEmail(email) {
    if (email.match(/[^@]+@[^@]+/)) {
      return true
    }

    return 'The provided email was invalid'
  }

  /**
   * @param {string} password The user provided password
   * @returns {boolean} If the password is valid
   */
  validatePassword(password) {
    if (password.length >= 8) {
      return true
    }

    return 'Your password must be at least 8 characters'
  }
}

RegisterCommand.description = `Register an account with Chec.io
Create an account with Chec.io where you can manage products and pricing that is available through the Chec API
`

RegisterCommand.flags = {
  email: flags.string({char: 'e', description: 'Email address to register with'}),
  password: flags.string({char: 'p', description: 'Set the password to use when logging in'}),
  domain: flags.string({
    hidden: true,
    description: 'The base URL for the Chec API',
    default: 'chec.io',
  }),
}

module.exports = RegisterCommand
