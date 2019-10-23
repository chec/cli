const fs = require('fs')
const homedir = require('os').homedir()
const {Command} = require('@oclif/command')
const got = require('got')
const ora = require('ora')
const questionHelper = require('../helpers/question-helper')
const globalFlags = require('../helpers/global-flags')
const emailArg = require('../arguments/email')
const passwordArg = require('../arguments/password')

class LoginCommand extends Command {
  async run() {
    const filename = `${homedir}${require('path').sep}.checrc`
    try {
      fs.accessSync(homedir)
      fs.closeSync(fs.openSync(filename, 'a'))
    } catch (error) {
      return this.error(`The login command requires a writable home directory (using "${homedir}")`)
    }

    const {flags} = this.parse(LoginCommand)

    const response = await this.login(flags)
    const key = JSON.parse(response.body).find(candidate => candidate.type === 'secret' && !candidate.is_sandbox)

    if (!key) {
      return this.error('An unexpected error occured (MISSING_KEY)')
    }

    fs.writeFileSync(filename, key.key)
  }

  async login(input = {}) {
    const {flags: {domain}} = this.parse(LoginCommand)
    let {email, password} = await questionHelper.ask([emailArg, passwordArg], input)

    const spinner = ora({
      text: 'Logging into Chec.io...',
      stream: process.stdout,
    }).start()

    const urlParams = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`

    try {
      const response = await got(`http://api.${domain}/v1/developer/login/issue-keys?${urlParams}`)
      spinner.succeed('Login successful!')
      return response
    } catch (error) {
      if (!error.response) {
        spinner.fail('Login failed!')
        return this.error(`An unexpected error occured (${error.code || error.name})`)
      }

      const {statusCode} = error.response

      // 404 is no user was found matchiing th credentials
      if (statusCode !== 404) {
        spinner.fail('Login failed!')
        return this.error(`An unexpected error occured (${statusCode})`)
      }
    }

    spinner.fail('No user could be found matching the given credentials')

    return this.login()
  }
}

LoginCommand.description = `Log into your Chec.io account
Log into your Chec.io account to enable commands that require API access.
`

LoginCommand.flags = {
  email: emailArg.flag,
  password: passwordArg.flag,
  ...globalFlags,
}

module.exports = LoginCommand

