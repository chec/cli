const {flags} = require('@oclif/command')

module.exports = {
  name: 'password',
  type: 'password',
  mask: '*',
  message: 'Enter a password',
  flag: flags.string({char: 'p', description: 'The password to login with'}),

  /**
   * @param {string} password The user provided password
   * @returns {boolean} If the password is valid
   */
  validate(password) {
    if (password.length >= 8) {
      return true
    }

    return 'Your password must be at least 8 characters'
  },
}
