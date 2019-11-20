const authHelper = require('./auth')
const requestHelper = require('./request')

class LoginError extends Error {
  constructor(message, invalid = false) {
    super(message)

    this.message = message
    this.invalid = invalid
  }
}

module.exports = {
  /**
   * Login the user by calling an endpoint and persisting an API key
   *
   * @param {string} email The user provided email address
   * @param {string} password The password for the given email address
   * @param {string} domain The domain to use for the API endpoint
   */
  async login(email, password, domain) {
    let response

    try {
      response = await requestHelper.request(
        'GET',
        '/v1/developer/login/issue-keys',
        {email, password},
        {domain}
      )
    } catch (error) {
      if (!error.response) {
        throw new LoginError(`An unexpected error occurred (${error.code || error.name})`)
      }

      const {statusCode} = error.response

      // 429 is a rate limiting error
      if (statusCode === 429) {
        throw new LoginError('You\'ve made too many requests. Have a coffee and try again later.')
      }

      // 403 is likely to mean that the user must verify their email address before logging in
      if (statusCode === 403) {
        const jsonBody = JSON.parse(error.response.body)
        throw new LoginError(jsonBody.error.message)
      }

      // 404 is no user was found matching the credentials. If it's not a 404 (or 2xx) then it's unexpected
      if (statusCode !== 404) {
        throw new LoginError(`An unexpected error occurred (${statusCode})`)
      }

      throw new LoginError('User not found', true)
    }

    const {body, headers} = response
    const keys = JSON.parse(body)

    if (!Array.isArray(keys) || keys.length === 0) {
      throw new LoginError('An unexpected error occurred (MISSING_KEYS)')
    }

    // Write the key
    authHelper.config.set({keys})

    if (Object.prototype.hasOwnProperty.call(headers, 'x-notification-key')) {
      authHelper.config.set({notifications: {
        token: headers['x-notification-token'],
        key: headers['x-notification-key'],
      }})
    }
  },
}
