/* global beforeEach afterEach */

const {test} = require('@oclif/test')
const sinon = require('sinon')
const clipboardy = require('clipboardy')
const chai = require('chai')
const sinonChai = require('sinon-chai')
const inquirer = require('inquirer')
const readline = require('readline')
const stripAnsi = require('strip-ansi')
const LogFeed = require('../../src/helpers/log-feed')
const LogEntry = require('../../src/helpers/log-entry')
const requestHelper = require('../../src/helpers/request')
const authHelper = require('../../src/helpers/auth')

const {expect} = chai
chai.use(sinonChai)

class FakeFeed {
  constructor() {
    this.callbacks = []
    this.onLogFake = sinon.stub(LogFeed.prototype, 'onLog')
    this.onLogFake.callsFake(callback => {
      this.callbacks.push(callback)
    })

    this.disconnectFake = sinon.stub(LogFeed.prototype, 'disconnect')
  }

  sendLog(log) {
    this.callbacks.forEach(callback => callback(log))
  }
}

const fakePartialLog = {
  log_id: 123, // eslint-disable-line camelcase
  status_code: 201, // eslint-disable-line camelcase
  url: '/v1/fake/endpoint',
  time: 1572304602,
}
const fakeFullLog = {
  ...fakePartialLog,
  response: {content: 'test response'},
}
const fakeLogEntry = new LogEntry(fakeFullLog)

const emitKeypress = (key, ctrl = false) => {
  readline.createInterface({
    terminal: true,
    input: process.stdin,
    output: process.stdout,
  }).input.emit('keypress', key, {name: key, ctrl})
}

const makeTimedExtension = callback => (time, ...args) => {
  return {
    timeout: null,
    run() {
      this.timeout = setTimeout(() => callback(...args), time * 2)
    },
    finally() {
      clearTimeout(this.timeout)
    },
  }
}

let fakeFeed

const base = test
// Register specific testing helpers for this command
.register('quitsAfter', makeTimedExtension(() => emitKeypress('c', true)))
.register('pressesAfter', makeTimedExtension((key, ctrl = false) => emitKeypress(key, ctrl)))
.register('receivesLogAfter', makeTimedExtension(log => {
  if (fakeFeed) {
    fakeFeed.sendLog(log)
  }
}))
// Retry all these flakey tests
.retries(2)

describe('logs', () => {
  let consoleClearMock
  let testTimeout
  let authMock

  beforeEach(() => {
    consoleClearMock = sinon.stub(console, 'clear')
    fakeFeed = new FakeFeed()

    // Give all runs a hard limit of 4 seconds before sending a SIGINT
    testTimeout = setTimeout(() => {
      emitKeypress('c', true)
    }, 4000)

    authMock = sinon.stub(authHelper, 'isLoggedIn')
    authMock.returns(true)
  })

  afterEach(() => {
    consoleClearMock.restore()
    clearTimeout(testTimeout)
    fakeFeed.onLogFake.restore()
    fakeFeed.disconnectFake.restore()
    authMock.restore()
  })

  // Basic log display:
  base
  .stdout()
  .quitsAfter(10) // For some reason the first one's a bit dicier
  .command('logs')
  .it('should indicate that it\'s waiting for logs', ctx => {
    expect(ctx.stdout).to.contain('Listening for logs from Chec.')
  })

  base
  .stdout()
  .quitsAfter(20)
  .command('logs')
  .it('should clear the console when listening', () => {
    expect(consoleClearMock).to.have.been.called
  })

  base
  .stdout()
  .quitsAfter(20)
  .receivesLogAfter(10, fakePartialLog)
  .command('logs')
  .it('should display a log when it comes in', ctx => {
    expect(ctx.stdout).to.contain(stripAnsi(fakeLogEntry.formattedSummary()))
  })

  base
  .stdout()
  .quitsAfter(20)
  .receivesLogAfter(10, fakePartialLog)
  .command('logs')
  .it('should update the listening message when there is at least one log on the screen', ctx => {
    expect(ctx.stdout).to.contain('Press "up" to navigate through the exisiting logs')
  })

  // Tailing existing logs at the beginning
  base
  .stub(requestHelper, 'request', sinon.stub().resolves({body: JSON.stringify((new Array(5)).fill(fakePartialLog))}))
  .stdout()
  .quitsAfter(10)
  .command(['logs', '-n5'])
  .it('Will send a request to get logs from Chec', ctx => {
    expect(requestHelper.request).to.have.been.calledOnceWith(
      'GET',
      '/v1/developer/logs',
      {limit: 5},
      {domain: 'chec.io'},
    )
    expect(ctx.stdout).to.contain(stripAnsi(fakeLogEntry.formattedSummary()))
  })

  base
  .stub(requestHelper, 'request', sinon.stub().resolves({body: JSON.stringify((new Array(5)).fill(fakePartialLog))}))
  .stdout()
  .timeout(10) // This timeout for the test should assert the expectation is resolved before the 4 second cancel above
  .command(['logs', '-n5', '--no-follow'])
  .it('Will not start a blocking process if given --no-follow', ctx => {
    expect(ctx.stdout).to.contain(stripAnsi(fakeLogEntry.formattedSummary()))
  })

  // Asking user to choose logs to view
  base
  .stdout()
  .stub(inquirer, 'prompt', sinon.fake.returns({
    response: false,
  }))
  .quitsAfter(50)
  .pressesAfter(25, 'up')
  .command('logs')
  .it('Should ignore the users up key without logs', () => {
    expect(inquirer.prompt).not.to.have.been.called
  })

  base
  .stdout()
  .stub(inquirer, 'prompt', sinon.fake.returns({
    response: false,
  }))
  .quitsAfter(50)
  .receivesLogAfter(10, fakePartialLog)
  .pressesAfter(25, 'up')
  .command('logs')
  .it('Should inquire the user to choose a log when the user presses up with at least one log showing', () => {
    expect(inquirer.prompt).to.have.been.calledOnce
    expect(inquirer.prompt.firstCall.args[0]).to.be.an('array').that.has.lengthOf(1)
    expect(inquirer.prompt.firstCall.args[0][0]).to.deep.include({
      type: 'list',
      name: 'response',
      message: 'Choose an entry to view:',
      choices: [
        {
          name: fakeLogEntry.formattedSummary(),
          value: 0,
        },
        {
          name: 'Cancel',
          value: false,
        },
      ],
      default: 0,
      pageSize: 2,
    })
  })

  base
  .stdout()
  .stub(inquirer, 'prompt', sinon.fake.returns({
    response: false,
  }))
  .quitsAfter(60)
  .receivesLogAfter(10, fakePartialLog)
  .receivesLogAfter(10, fakePartialLog)
  .pressesAfter(25, 'up')
  .command('logs')
  .it('Should default the user choice to the most recent log', () => {
    expect(inquirer.prompt).to.have.been.calledOnce
    expect(inquirer.prompt.firstCall.args[0][0]).to.deep.include({
      default: 1,
      pageSize: 3,
    })
  })

  base
  .stub(requestHelper, 'request', sinon.stub().resolves({body: JSON.stringify((new Array(15)).fill(fakePartialLog))}))
  .stub(inquirer, 'prompt', sinon.fake.returns({
    response: false,
  }))
  .quitsAfter(30)
  .pressesAfter(15, 'up')
  .stdout()
  .command(['logs', '-n15'])
  .it('Should limit the number of options for the user', () => {
    expect(inquirer.prompt).to.have.been.calledOnce
    const {choices} = inquirer.prompt.firstCall.args[0][0]
    expect(choices).to.deep.include({
      name: 'View more...',
      value: -1,
    })
    expect(choices).to.have.lengthOf(12)
  })

  base
  .stub(requestHelper, 'request', sinon.stub().resolves({body: JSON.stringify((new Array(15)).fill(fakePartialLog))}))
  .stub(inquirer, 'prompt', (() => {
    const stub = sinon.stub()
    stub.onCall(0).resolves({response: -1})
    stub.onCall(1).resolves({response: false})
    return stub
  })())
  .quitsAfter(30)
  .pressesAfter(15, 'up')
  .stdout()
  .command(['logs', '-n15'])
  .it('Should should show the remainder of the logs when choosing "view more"', () => {
    expect(inquirer.prompt).to.have.been.calledTwice
    const {choices} = inquirer.prompt.secondCall.args[0][0]
    expect(choices).to.have.lengthOf(6)
    expect(choices).to.deep.include({
      name: 'Cancel',
      value: false,
    })
    expect(choices).not.to.deep.include({
      name: 'View more...',
      value: -1,
    })
  })

  base
  .stub(requestHelper, 'request', sinon.stub().resolves({body: JSON.stringify((new Array(15)).fill(fakePartialLog))}))
  .stub(inquirer, 'prompt', sinon.fake.returns({
    response: false,
  }))
  .quitsAfter(30)
  .pressesAfter(15, 'up')
  .stdout()
  .command(['logs', '-n15', '-h7'])
  .it('Should only prompt for as many records as allowed in history', () => {
    expect(inquirer.prompt).to.have.been.calledOnce
    const {choices} = inquirer.prompt.firstCall.args[0][0]
    expect(choices).to.have.lengthOf(8)
    expect(choices).not.to.deep.include({
      name: 'View more...',
      value: -1,
    })
  })

  base
  .stub(requestHelper, 'request', sinon.stub().resolves({body: JSON.stringify(fakeFullLog)}))
  .stub(inquirer, 'prompt', sinon.fake.returns({
    response: 0,
  }))
  .stdout()
  .quitsAfter(50)
  .receivesLogAfter(10, fakePartialLog)
  .pressesAfter(25, 'up')
  .command('logs')
  .it('Should dispatch a request for a full log when chosen by the user', () => {
    expect(requestHelper.request).to.have.been.calledOnceWith(
      'GET',
      '/v1/developer/logs/123',
      null,
      {domain: 'chec.io'}
    )
  })

  base
  .stub(requestHelper, 'request', sinon.stub().resolves({body: JSON.stringify(fakeFullLog)}))
  .stub(inquirer, 'prompt', sinon.fake.returns({
    response: 0,
  }))
  .stdout()
  .quitsAfter(50)
  .receivesLogAfter(10, fakePartialLog)
  .pressesAfter(25, 'up')
  .command('logs')
  .it('Should show the full log that the user chose', ctx => {
    expect(ctx.stdout).to.contain(JSON.stringify(fakeFullLog, null, 2))
    expect(ctx.stdout).to.contain('Press "enter" to return to streaming logs or "c" to copy to clipboard')
  })

  base
  .stub(requestHelper, 'request', sinon.stub().resolves({body: JSON.stringify(fakeFullLog)}))
  .stub(inquirer, 'prompt', sinon.fake.returns({
    response: 0,
  }))
  .stub(clipboardy, 'write', sinon.stub())
  .stdout()
  .quitsAfter(70)
  .receivesLogAfter(10, fakePartialLog)
  .pressesAfter(25, 'up')
  .pressesAfter(50, 'c')
  .command('logs')
  .it('Should copy the full log to clipboard when the correct key is pressed', () => {
    expect(clipboardy.write).to.have.been.calledOnceWith(JSON.stringify(fakeFullLog, null, 2))
  })

  base
  .stub(requestHelper, 'request', sinon.stub().resolves({body: JSON.stringify(fakeFullLog)}))
  .stub(inquirer, 'prompt', sinon.fake.returns({
    response: 0,
  }))
  .stdout()
  .quitsAfter(50)
  .receivesLogAfter(10, fakePartialLog)
  .pressesAfter(20, 'up')
  .pressesAfter(30, 'return')
  .command('logs')
  .it('Should return to streaming logs after choosing an item and pressing enter', ctx => {
    const [, sincePrompt] = ctx.stdout.split('Press "enter" to return to streaming logs or "c" to copy to clipboard', 2)
    expect(sincePrompt).to.contain(stripAnsi(fakeLogEntry.formattedSummary()))
    expect(sincePrompt).to.contain('Listening for logs from Chec.')
  })

  // Error handling
  base
  .stub(requestHelper, 'request', sinon.stub().rejects({response: {statusCode: 401}}))
  .stdout()
  .quitsAfter(10)
  .command(['logs', '-n5'])
  .it('Will gracefully show errors when fetching a tail', ctx => {
    expect(ctx.stdout).to.contain('Failed to fetch initial logs from Chec. (401)')
  })

  // The following test is working but seems to hang the console after it runs. Not sure why yet...
  base
  .stub(requestHelper, 'request', sinon.stub().rejects({response: {statusCode: 401}}))
  .stub(inquirer, 'prompt', sinon.fake.returns({
    response: 0,
  }))
  .stdout()
  .quitsAfter(50)
  .receivesLogAfter(10, fakePartialLog)
  .pressesAfter(25, 'up')
  .command('logs')
  .skip('Will gracefully show errors when fetching a full log', ctx => {
    expect(ctx.stdout).to.contain('Failed to fetch full log detail from Chec. (401)')
  })
})
