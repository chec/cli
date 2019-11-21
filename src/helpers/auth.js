const config = require('./config')

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
    this.keys = null
    this.config.remove('keys')
    this.config.remove('notifications')
  }
}

module.exports = new Auth()
