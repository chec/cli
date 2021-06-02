const got = require('got')
const queryString = require('query-string')
const authHelper = require('./auth')

module.exports = {
  /**
   * Performs an authenticated request to the Chec API.
   *
   * This method automatically adds the Chec secret API key to authorize the request.
   * It does not catch any request errors, this must be done in the implementation.
   *
   * @param {string} method HTTP method to use, e.g. `GET`
   * @param {string} resource Endpoint to request, e.g. `/v1/products`
   * @param {object} payload Request payload
   * @param {object} extraOptions List of options to add. Valid options:
   * - domain: {string} override the request domain, default is `chec.io`
   * - headers: {object} extra headers to use in the request
   * @returns {Promise<Response>} A got library response promise
   */
  request(method, resource, payload = null, extraOptions = {}) {
    const {key} = authHelper.getApiKey(extraOptions.sandbox || false) || {}
    const options = {
      domain: 'chec.io',
      ...extraOptions,
      headers: {
        'User-Agent': 'chec/cli',
        'content-type': 'application/json',
        'x-authorization': key || null,
        'Chec-Version': '2021-06-02',
        ...extraOptions.headers || {},
      },
    }

    const urlParams = payload && method === 'GET' ?
      `?${queryString.stringify(payload, {arrayFormat: 'bracket'})}` :
      ''
    const requestPayload = method === 'GET' ? null : payload

    return got(`http://api.${options.domain}${resource}${urlParams}`, {
      method,
      body: JSON.stringify(requestPayload),
      headers: options.headers,
      retry: {
        retries: 0, // Disable automatic retry
      },
    })
  },
}
