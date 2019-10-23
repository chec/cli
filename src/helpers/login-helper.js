const fs = require('fs')
const got = require('got')
const homedir = require('os').homedir()
const configFilename = `${homedir}${require('path').sep}.checrc`

class LoginError extends Error {
  constructor(message, invalid = false) {
    super(message)

    this.message = message
    this.invalid = invalid
  }
}

module.exports = {
  /**
   * Indicates logging in is supported by checking that a dotfile is writable
   *
   * @return {boolean} Whether logging in is supported
   */
  loginSupported() {
    try {
      // Check access
      fs.accessSync(homedir)
      // "Touch" the file
      fs.closeSync(fs.openSync(configFilename, 'a'))
      return true
    } catch (error) {
      return false
    }
  },

  /**
   * Login the user by calling an endpoint and persisting an API key
   *
   * @param {string} email The user provided email address
   * @param {string} password The password for the given email address
   * @param {string} domain The domain to use for the API endpoint
   */
  async login(email, password, domain) {
    const urlParams = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
    let response

    try {
      response = await got(`http://api.${domain}/v1/developer/login/issue-keys?${urlParams}`)
    } catch (error) {
      if (!error.response) {
        throw new LoginError(`An unexpected error occured (${error.code || error.name})`)
      }

      const {statusCode} = error.response

      // 404 is no user was found matching the credentials. If it's not a 404 (or 2xx) then it's unexpected
      if (statusCode !== 404) {
        throw new LoginError(`An unexpected error occured (${statusCode})`)
      }

      throw new LoginError('User not found', true)
    }

    const key = JSON.parse(response.body).find(candidate => candidate.type === 'secret' && !candidate.is_sandbox)

    if (!key) {
      throw new LoginError('An unexpected error occured (MISSING_KEY)')
    }

    // Write the key
    this.setLoggedInKey(key.key)
  },

  /**
   * Set the API key that is persitsted for a logged in user
   *
   * @param {string} key The API key to presist
   */
  setLoggedInKey(key) {
    fs.writeFileSync(configFilename, key)
  },

  /**
   * Check that the user is logged in by checking that an API key is persisted. Note this doesn't assert the API key
   * is still valid.
   *
   * @return {boolean} Whether the user is considered "logged in"
   */
  isLoggedIn() {
    if (!this.loginSupported()) {
      return false
    }

    return fs.readFileSync(configFilename).length > 0
  },

  configFilename,
}
