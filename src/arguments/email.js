const {flags} = require('@oclif/command')

module.exports = {
  name: 'email',
  message: 'Please enter your email address',
  flag: flags.string({char: 'e', description: 'Your accounts email address'}),

  /**
   * @param {string} email The user provided email address
   * @returns {boolean} If the email address given is valid
   */
  validate(email) {
    if (email.match(/[^@]+@[^@]+/)) {
      return true
    }

    return 'The provided email was invalid'
  },
}
