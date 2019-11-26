const ora = require('ora')
const logUpdate = require('log-update')
const {spawn} = require('child_process')

/**
 * Factory class for spawning child processes with various options
 */
class Spawner {
  constructor(...spawnArgs) {
    this.spawnArgs = spawnArgs
    this.spinner = null
    this.completeMessage = null
    this.stream = null
    this.clearOnComplete = false
  }

  /**
   * Indicates a spinner should show. This will prevent output unless explicitly enabled with `streamOutput`
   *
   * @param {object|string} textOrOptions Either the specific text to show or options to be passed to ora
   * @returns {Spawner} Returns this object for a fluent interface
   */
  withSpinner(textOrOptions) {
    if (!['object', 'string'].includes(typeof textOrOptions)) {
      throw new TypeError(`withSpinner expects a string or object. ${typeof textOrOptions} given`)
    }

    if (this.stream === null) {
      this.stream = false
    }

    if (typeof textOrOptions === 'string') {
      this.spinner = {
        text: textOrOptions,
        stream: process.stdout,
      }
      return this
    }

    this.spinner = {
      text: 'Loading...',
      stream: process.stdout,
      ...textOrOptions,
    }

    return this
  }

  /**
   * Define a message that should be shown when the process is complete
   *
   * @param {string} message The message to display
   * @returns {Spawner} Returns this object for a fluent interface
   */
  onComplete(message) {
    this.completeMessage = message
    return this
  }

  /**
   * Indicate whether the output should be output to the stdout (and stderr) and optionally if it should clear when the process is complete
   * Note that the output is streamed by default, unless a spinner is configured.
   *
   * @param {boolean} stream Indicates if the output should stream
   * @param {boolean} clearOnComplete If the streamed output should be removed when the process completes
   * @returns {Spawner} Returns this object for a fluent interface
   */
  streamOutput(stream = true, clearOnComplete = false) {
    this.stream = stream
    this.clearOnComplete = clearOnComplete
    return this
  }

  /**
   * Spawn the process
   *
   * @returns {Promise} A promise that resolves when the process is complete with exit code 0
   */
  run() {
    return new Promise((resolve, reject) => {
      // Determine if we're streaming the output. If it's not explicitly declared we check if a spinner is configured
      const stream = this.stream === null ? !this.spinner : this.stream
      const stdio = !stream || this.spinner || this.clearOnComplete ? ['inherit', 'pipe', 'pipe'] : 'inherit'
      const providedOptions = this.spawnArgs[2] || {}
      const options = {
        ...providedOptions,
        stdio,
      }

      const spinner = this.spinner ? ora(this.spinner).start() : null
      const ps = spawn(this.spawnArgs[0], this.spawnArgs[1] || [], options)

      let stdoutLogs = ''
      let stderrLogs = ''

      const withPausedSpinner = callback => {
        spinner.stop()
        const out = callback()
        spinner.start()
        return out
      }

      if (stream && (this.spinner || this.clearOnComplete)) {
        if (ps.stdout) {
          ps.stdout.setEncoding('utf8').on('data', data => {
            stdoutLogs += data
            withPausedSpinner(() => logUpdate(stdoutLogs))
          })
        }
        if (ps.stderr) {
          ps.stderr.setEncoding('utf8').on('data', data => {
            stderrLogs += data
            withPausedSpinner(() => {
              logUpdate.clear()
              logUpdate.stderr(stderrLogs)
              logUpdate(stdoutLogs)
            })
          })
        }
      }

      ps.on('close', code => {
        if (code !== 0) {
          if (spinner) {
            spinner.stop()
          }
          reject(code)
          return
        }
        if (stream) {
          const method = this.clearOnComplete ? 'clear' : 'done'
          logUpdate[method]()
          logUpdate.stderr[method]()
        }
        if (spinner) {
          if (this.completeMessage) {
            spinner.succeed(this.completeMessage)
          } else {
            spinner.stop()
          }
        } else if (this.completeMessage) {
          process.stdout.write(`${this.completeMessage}\n`)
        }
        resolve()
      })

      ps.on('error', reject)
    })
  }
}

module.exports.create = (...args) => new Spawner(...args)
