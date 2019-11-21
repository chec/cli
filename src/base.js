const {Command} = require('@oclif/command')
const authHelper = require('./helpers/auth')
const chalk = require('chalk')

/**
 * Base class for all Chec CLI commands
 */
class BaseCommand extends Command {
  async init() {
    if (this.requiresAuth() && !authHelper.isLoggedIn()) {
      return this.error(
        `You must be logged in to use this command. Please run ${chalk.yellow('chec login')} then try again.`
      )
    }
  }

  /**
   * @returns {boolean} Whether the command requires authentication before it will run
   */
  requiresAuth() {
    return false
  }
}

module.exports = BaseCommand
