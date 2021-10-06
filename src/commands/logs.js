const Command = require('../base')
const {flags} = require('@oclif/command')
const chalk = require('chalk')
const inquirer = require('inquirer')
const ora = require('ora')
const clipboardy = require('clipboardy')
const readline = require('readline')
const {once} = require('events')
const LogEntry = require('../helpers/log-entry')
const LogFeed = require('../helpers/log-feed')
const globalFlags = require('../helpers/global-flags')
const requestHelper = require('../helpers/request')

class LogsCommand extends Command {
  requiresAuth() {
    return true
  }

  async run() {
    const {flags: {tail, follow, domain}} = this.parse(LogsCommand)
    this.logs = []

    // Clear the screen now if we're going to be listening eventually
    if (follow) {
      this.clearScreen()
    }

    // Handle a request to start with a given number of logs
    if (tail > 0) {
      this.spinner('Fetching logs from Chec...')
      try {
        this.logs = await requestHelper.request(
          'GET',
          '/v1/developer/logs',
          {limit: tail},
          {domain}
        ).then(response => JSON.parse(response.body).data.map(entry => new LogEntry(entry, domain)))
      } catch (error) {
        const errorMessage = error.response.statusCode === 403 ?
          'Authentication error, try logging out and back in again.' :
          `Failed to fetch initial logs from Chec. (${error.response.statusCode})`
        this.spinnerInstance.fail(errorMessage)
        return
      }

      this.spinner(null)

      // Print them
      this.printLogs()

      // Now prune in case lots of logs are pulled in
      this.pruneLogs()
    }

    // We've tailed some logs, we can close out if we're not listening
    if (!follow) {
      return
    }

    // Register the listener
    this.registerLogFeed()

    // Run the main loop
    try {
      await this.loop()
    } catch (error) {
      if (this.spinnerInstance) {
        this.spinnerInstance.fail(error.message)
      }
    }

    // Stop the spinner and disconnect before stopping
    this.spinner(null)
    this.logFeed.disconnect()
  }

  /**
   * The "main loop" of this long-running command.
   */
  async loop() {
    // Always reset the "canLog" tracker
    this.canLog = true

    const navigationPrompt = 'Press "up" to navigate through the existing logs'
    this.spinner(`Listening for logs from Chec. ${this.logs.length > 0 ? navigationPrompt : ''}`)

    // Wait for the user to navigation logs
    if (!await this.handleNavigation()) {
      return
    }

    // Trim the log count
    this.pruneLogs()

    // Print the rest of the logs
    this.printLogs()

    // Recurse
    await this.loop()
  }

  /**
   * Register the pusher websocket and handler for new logs coming in
   */
  registerLogFeed() {
    const {flags: {domain, utc}} = this.parse(LogsCommand)
    const feed = new LogFeed()

    feed.onLog(log => {
      const entry = new LogEntry(log, domain)

      // Check if we're waiting
      if (this.canLog) {
        // Stop the spinner
        this.spinner(null)

        // Print the line
        this.log(entry.formattedSummary(utc))
        entry.setPrinted()

        // Restart the spinner
        this.spinner('Listening for logs from Chec. Press "up" to navigate through the existing logs')

        // Keep logs pruned
        this.pruneLogs()
      }

      // Append the log
      this.logs.push(entry)
    })

    this.logFeed = feed
  }

  /**
   * Wait for a key pressed by the user. The promise will error if an exit command in triggered by the user
   *
   * @param {string|function} matcher The key to match or a function that matches a given "key" object and returns a boolean
   * @return {Promise<true>} Returns a promise that resolves when the given key is pressed
   */
  async waitForKeyPress(matcher) {
    // Register a one-time event handler for a "keypress input"
    return once(readline.createInterface({
      terminal: true,
      input: process.stdin,
      output: process.stdout,
    }).input, 'keypress').then(([_, key]) => {
      // Handle an exit sequence and throw an error to fail the promise
      if (key.ctrl && ['z', 'c'].includes(key.name)) {
        throw new Error('exit')
      }

      // Clear the line to prevent input from showing
      process.stdout.clearLine()
      process.stdout.cursorTo(0)

      // Check if the key matches
      if ((typeof matcher === 'function' && matcher(key)) || matcher === key.name) {
        return true
      }

      // Queue the same event handler if the key didn't match
      return this.waitForKeyPress(matcher)
    })
  }

  /**
   * An asyncronous handler for the user attempting to navigate logs while streaming.
   *
   * @returns {Promise<boolean>} Reutrns a promise that resolves to a boolean whether the application should continue (or exit)
   */
  async handleNavigation() {
    // "up" launches into an interactive session to get full versions of prior logs. Skip anything else
    try {
      await this.waitForKeyPress('up')
    } catch (error) {
      return false
    }

    // Don't do anything if there's no logs, just keep waiting for input
    if (this.logs.length === 0) {
      return this.handleNavigation()
    }

    // Ensure we don't log now
    this.canLog = false

    // Ask the user for a log
    const log = await this.promptForLog()

    // If the user cancelled, go back to waiting
    if (!log) {
      this.clearScreen()
      await this.printLogs()
      this.canLog = true
      return this.handleNavigation()
    }

    // Fetch the individual log entry
    this.spinner('Fetching log from Chec...')
    try {
      await log.getFullLog()
    } catch (error) {
      throw new Error(`Failed to fetch full log detail from Chec. (${error.response.statusCode})`)
    }
    this.spinner(null)

    // Fetch the UTC preference from command flags
    const {flags: {utc}} = this.parse(LogsCommand)

    // Clear the screen and display the log
    this.clearScreen()
    this.log(chalk.dim(log.formattedSummary(utc)))
    this.log(await log.formattedLog())
    this.log('')
    this.log('Press "enter" to return to streaming logs or "c" to copy to clipboard')

    // Register a handler to copy the response and ignore any failures
    this.waitForKeyPress('c').then(async () => {
      clipboardy.write(JSON.stringify(await log.getFullLog(), null, 2))
    }).catch(() => {})

    // Wait for them to press enter
    try {
      await this.waitForKeyPress('return')
    } catch (error) {
      return false
    }

    // Clean up the console for the logs to be displayed again
    this.clearScreen()

    return true
  }

  /**
   * Prompt the user to choose a log from the internally kept history of logs. The list is shown with recent logs
   * first but a number of logs can be excluded of the end by provding a "reverseOffset"
   *
   * @param {integer} reverseOffset The number of logs to skip from the end of the logs list
   * @param {integer} logCount The number of logs to show to the user to choose from
   * @returns {Promise<LogEntry|null>} A promise that resolves to the log entry the user chose or null if cancelled
   */
  async promptForLog(reverseOffset = 0, logCount = 10) {
    // Fetch the UTC preference from command flags
    const {flags: {utc}} = this.parse(LogsCommand)
    // Get the logs, taking off a given number from the end
    const logs = reverseOffset > 0 ? this.logs.slice(0, this.logs.length - reverseOffset) : this.logs
    // Slice the specific logs that need to be presented
    const logsToPresent = logs.length <= logCount ? logs : logs.slice(this.logs.length - logCount)
    // Map them into "choices" for inquirer
    const choices = logsToPresent.map((entry, index) => ({name: entry.formattedSummary(utc), value: index}))

    // Add a "view more" option if there's more logs in the history
    if (logs.length > logCount) {
      choices.unshift({name: 'View more...', value: -1})
    }

    // Add a "cancel" option
    choices.push({name: 'Cancel', value: false})

    // Stop the spinner and clear the screen
    this.spinner(null)
    this.clearScreen()

    // Show the user the list of logs (formatted the same way)
    const {response} = await inquirer.prompt([{
      type: 'list',
      name: 'response',
      message: 'Choose an entry to view:',
      choices,
      default: choices.length - 2,
      pageSize: choices.length,
    }])

    // `false` means they chose "Cancel"
    if (response === false) {
      return null
    }

    // Check if the user chose "View more"
    if (response < 0) {
      return this.promptForLog(reverseOffset + logCount, logCount)
    }

    // Return the log that was chosen
    return logsToPresent[response]
  }

  /**
   * Print logs that have been queueing
   */
  printLogs() {
    // Find the first index of an unprinted log
    const unprinted = this.logs.findIndex(log => !log.printed)

    // Bail if there's nothing to print
    if (unprinted < 0) {
      return
    }

    // Fetch the UTC preference from command flags
    const {flags: {utc}} = this.parse(LogsCommand)

    // Slice just those logs and print them
    const updated = this.logs.slice(unprinted)
    updated.forEach(log => {
      this.log(log.formattedSummary(utc))
      log.setPrinted()
    })

    // Splice in the logs that have been printed
    this.logs.splice(unprinted, updated.length, ...updated)

    // Recurse until logs are printed. It's slightly possible that logs might come in while catching up
    this.printLogs()
  }

  /**
   * Trim the logs cache to a the number of entries defined by user argument
   */
  pruneLogs() {
    const {flags: {history}} = this.parse(LogsCommand)
    if (this.logs.length > history) {
      this.logs = this.logs.slice(this.logs.length - history)
    }
  }

  /**
   * Show or cancel the spinner
   *
   * @param {string|null} text The text to show on the spinner (or null to stop the spinner)
   */
  spinner(text) {
    // Stop any existing instance
    if (this.spinnerInstance) {
      this.spinnerInstance.stop()
    }

    // We're done if we're trying to cancel
    if (text === null) {
      return
    }

    // Re-create the spinner with the given text
    this.spinnerInstance = ora({
      text,
      stream: process.stdout,
    }).start()
  }

  /**
   * Clear the console for the user
   */
  clearScreen() {
    console.clear() // eslint-disable-line no-console

    // Mark logs to be reprinted
    const logCount = this.logs.length
    const count = process.stdout.rows || logCount
    const toPrint = logCount > count ? this.logs.slice(logCount - count) : this.logs
    toPrint.forEach(entry => entry.setPrinted(false))
  }
}

LogsCommand.flags = {
  tail: flags.integer({
    char: 'n',
    default: 0,
    description: 'Show the last n number of logs before listening for new logs',
  }),
  follow: flags.boolean({
    char: 'f',
    default: true,
    allowNo: true,
    description: '"Follow" logs from Chec. New events that happen are shown live',
  }),
  history: flags.integer({
    char: 'h',
    default: 100,
    description: 'Keep record of the given number of logs when browsing back.',
  }),
  utc: flags.boolean({
    default: false,
    description: 'Display timestamps in UTC timezone',
  }),
  ...globalFlags,
}

LogsCommand.description = `Show a summary of your API requests processed by Chec.
Listens for logs from Chec and displays a summary of them to you as they are processed by Chec.
You may optionally retrieve prior logs and navigate through shown logs to fetch further details about the log entry from Chec.
`
module.exports = LogsCommand
