const Command = require('../base')
const {flags} = require('@oclif/command')
const ora = require('ora')
const inquirer = require('inquirer')
const authHelper = require('../helpers/auth')
const loginHelper = require('../helpers/login')
const questionHelper = require('../helpers/question-helper')
const globalFlags = require('../helpers/global-flags')
const emailArg = require('../arguments/email')
const passwordArg = require('../arguments/password')

class LoginCommand extends Command {
  async run() {
    // Parse "skipCheck", "email" and "password" from command arguments
    const {flags: {'skip-check': skipCheck, ...flags}} = this.parse(LoginCommand)

    // Assert that logging in is supported
    if (!authHelper.loginSupported()) {
      return this.error(`The login command requires a writable home directory (using "${require('os').homedir()}")`)
    }

    // Check if the user is already logged in
    if (!skipCheck && authHelper.isLoggedIn()) {
      const {confirm} = await inquirer.prompt([{
        name: 'confirm',
        type: 'confirm',
        message: 'A user is currently logged in, do you want to continue?',
        default: true,
      }])

      if (!confirm) {
        return
      }
    }

    // Do the actual login
    await this.login(flags)
  }

  async login(input = {}) {
    // API domain is provided from arguments
    const {flags: {domain}} = this.parse(LoginCommand)
    // Fill in any blanks from the input
    const {email, password} = await questionHelper.ask([emailArg, passwordArg], input)

    const spinner = ora({
      text: 'Logging into Chec...',
      stream: process.stdout,
    }).start()

    try {
      // Use the email
      await loginHelper.login(email, password, domain)
    } catch (error) {
      if (!error.invalid) {
        spinner.fail('Login failed!')
        return this.error(error.message)
      }

      // Just stop the spinner with no feedback while we ask for new input
      spinner.fail('No user was found matching the given credentials')
      return this.login()
    }

    spinner.succeed('Login successful!')
  }
}

LoginCommand.description = `Log into your Chec account
Log into your Chec account to enable commands that require API access.
`

LoginCommand.flags = {
  email: emailArg.flag,
  password: passwordArg.flag,
  'skip-check': flags.boolean({
    description: 'Indicate that this command should skip checking if a user is already logged in',
    default: false,
  }),
  ...globalFlags,
}

module.exports = LoginCommand
