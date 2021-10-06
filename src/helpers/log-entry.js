const requestHelper = require('./request')
const chalk = require('chalk')
const dateFormat = require('date-format')
const colorise = require('json-colorizer')

/**
 * A "model" that represents a log entry provided by Chec
 */
module.exports = class LogEntry {
  /**
   * @param {object} rawEntry The entry provided by Chec
   * @param {string} domain The domain that issued this log, for fetching further information about the log
   */
  constructor(rawEntry, domain = 'chec.io') {
    const {id: logId} = rawEntry

    if (!logId) {
      throw new Error('LogEntry must be given a "raw" entry that at least contains the `id`')
    }

    this.raw = rawEntry
    this.domain = domain
    this.printed = false
    this.full = Object.hasOwnProperty.call(rawEntry, 'response')
  }

  /**
   * @returns {string} The log ID for this entry
   */
  id() {
    return this.raw.id
  }

  /**
   * Indicatee this log entry has (or hasn't) been printed
   *
   * @param {boolean} printed Whether the entry should be recorded as printed
   */
  setPrinted(printed = true) {
    this.printed = printed
  }

  /**
   * Get the full log details for this entry
   *
   * @returns {Promise<object>} The object representation of the log
   */
  async getFullLog() {
    // Resolve immediately if we've already got the "full" log
    if (this.full) {
      return this.raw
    }

    // Retrieve all details for the log
    this.raw = await requestHelper.request(
      'GET',
      `/v1/developer/logs/${this.id()}`,
      null,
      {domain: this.domain}
    ).then(response => JSON.parse(response.body))

    // Indicate we've got the full log now
    this.full = true
    return this.raw
  }

  /**
   * Return a colourised log for output to the CLI
   *
   * @returns {Promise<string>} Colourised string for the CLI
   */
  async formattedLog() {
    return colorise(await this.getFullLog(), {pretty: true})
  }

  /**
   * Get a formatted date string for this log entry
   *
   * @param {boolean} utc Indicates timestamps should be UTC
   * @returns {string} The formatted date
   */
  formattedDate(utc = false) {
    const {created} = this.raw
    const suffix = utc ? 'O' : ''
    const parsedDate = dateFormat(`yyyy-MM-dd hh:mm:ss${suffix}`, new Date(created * 1000))

    if (!utc) {
      return parsedDate
    }

    return parsedDate.substring(0, parsedDate.length - 5)
  }

  /**
   * Format a log entry into a line that can be logged on the CLI
   *
   * @param {boolean} utc Indicates timestamps should be UTC
   * @return {string} A formatted string to log
   */
  formattedSummary(utc = false) {
    const {status_code: statusCode, id, url} = this.raw

    const date = chalk.dim(`[${this.formattedDate(utc)}]`)
    const responseCodeColor = statusCode >= 200 && statusCode < 300 ? 'bgGreen' :
      statusCode >= 300 && statusCode < 400 ? 'bgYellow' : 'bgRed'
    const responseCode = chalk[responseCodeColor](` ${chalk.black(statusCode)} `)

    return `${date} ${responseCode} ${chalk.yellow(id)} ${url}`
  }
}
