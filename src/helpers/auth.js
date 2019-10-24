const got = require('got')
const config = require('./config')

class LoginError extends Error {
  constructor(message, invalid = false) {
    super(message)

    this.message = message
    this.invalid = invalid
  }
}

class Auth {
  constructor() {
    this.config = config
  }

  /**
   * Indicates logging in is supported by checking that a dotfile is writable
   *
   * @return {boolean} Whether logging in is supported
   */
  loginSupported() {
    return this.config.supported()
  }

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

    const keys = JSON.parse(response.body)

    if (!Array.isArray(keys) || keys.length === 0) {
      throw new LoginError('An unexpected error occured (MISSING_KEYS)')
    }

    // Write the key
    this.config.save({keys})
  }

  getApiKeys() {
    if (!Array.isArray(this.keys)) {
      this.keys = this.config.get('keys') || []
    }

    return this.keys
  }

  /**
   * Get an API key for the logged in user
   *
   * @param {boolean} sandbox Whether to return a sandbox key (default: false)
   * @param {string} type The type of key to return (default: secret)
   * @returns {string|null} The API key if saved
   */
  getApiKey(sandbox = false, type = 'secret') {
    return this.getApiKeys().find(candidate => candidate.type === type && candidate.is_sandbox === sandbox)
  }

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

    return this.getApiKeys().length > 0
  }

  /**
   * Log out the user from the API
   */
  logout() {
    this.config.remove('keys')
  }
}

module.exports = new Auth()
