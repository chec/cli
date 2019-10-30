const {Command, flags} = require('@oclif/command')
const chalk = require('chalk')
const ora = require('ora')
const globalFlags = require('../helpers/global-flags')
const LogEntry = require('../helpers/log-entry')

class LogCommand extends Command {
  async run() {
    const {args: {logId}, flags: {domain, raw, utc}} = this.parse(LogCommand)
    const log = new LogEntry({log_id: logId}, domain) // eslint-disable-line camelcase
    const spinner = ora({
      text: 'Fetching log from Chec.io...',
      stream: process.stdout,
    }).start()

    try {
      await log.getFullLog()
    } catch (error) {
      spinner.fail(`Could not fetch the log "${logId}". Error: ${error.statusCode}`)
      return
    }

    spinner.stop()

    if (raw) {
      this.log(JSON.stringify(await log.getFullLog()))
      return
    }

    this.log(chalk.dim(log.formattedSummary(utc)))
    this.log(await log.formattedLog())
  }
}

LogCommand.args = [
  {
    name: 'logId',
    required: true,
    description: 'The log ID for the log entry you want to retrieve',
  },
]

LogCommand.flags = {
  raw: flags.boolean({
    default: false,
    description: 'Display a "raw" unformatted JSON blob of the log details',
  }),
  utc: flags.boolean({
    default: false,
    description: 'Display timestamps in UTC timezone instead of the local timezone',
  }),
  ...globalFlags,
}

LogCommand.description = `Get full detail about a given log ID
Communicates with Chec.io to get full log information for the given log ID
`

module.exports = LogCommand
