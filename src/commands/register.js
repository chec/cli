const Command = require('../base')
const chalk = require('chalk')
const {cli} = require('cli-ux')
const process = require('process')
const inquirer = require('inquirer')
const authHelper = require('../helpers/auth')
const globalFlags = require('../helpers/global-flags')
const LoginCommand = require('./login')
const LogoutCommand = require('./logout')

/**
 * Register a new Chec user
 */
class RegisterCommand extends Command {
  async run() {
    // API domain is provided from arguments
    const {flags: {domain}} = this.parse(RegisterCommand)

    // Check if the user is already logged in
    if (authHelper.isLoggedIn()) {
      const {confirm} = await inquirer.prompt([{
        name: 'confirm',
        type: 'confirm',
        message: 'A user is currently logged in, do you want to logout first?',
        default: true,
      }])

      if (!confirm) {
        return
      }
      authHelper.config.clearCache()
      await LogoutCommand.run()
    }

    // Let the user know what we're doing
    this.log('This will open the Chec registration page in your browser')
    await cli.anykey().catch(() => this.exit(0))

    const signupUrl = `https://dashboard.${domain}/signup`
    if (['darwin', 'win32'].includes(process.platform)) {
      cli.open(signupUrl)
    } else {
      this.log(chalk.yellow(
        'Unable to automatically open the registration page in your browser. Please visit the following link to continue:'
      ))
      await cli.url(signupUrl, signupUrl)
    }

    this.log("\nWhen you've completed your registration, enter your credentials to log in:")
    // Run login command
    LoginCommand.run(['--domain', domain])
  }
}

RegisterCommand.description = `Register an account with Chec
Sign up for a Chec account through your browser
`

RegisterCommand.flags = {
  ...globalFlags,
}

module.exports = RegisterCommand
