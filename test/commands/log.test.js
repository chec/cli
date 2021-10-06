/* global beforeEach afterEach */

const {test} = require('@oclif/test')
const sinon = require('sinon')
const LogEntry = require('../../src/helpers/log-entry')
const chai = require('chai')
const authHelper = require('../../src/helpers/auth')
const sinonChai = require('sinon-chai')

const {expect} = chai
chai.use(sinonChai)

const fakeFullLog = {
  id: 123,
  status_code: 201, // eslint-disable-line camelcase
  url: '/v1/fake/endpoint',
  created: 1572304602,
  response: {content: 'test response'},
}

describe('log', () => {
  let getFullLogStub
  let formattedSummaryStub
  let formattedLogStub
  let authHelperStub

  beforeEach(() => {
    getFullLogStub = sinon.stub(LogEntry.prototype, 'getFullLog')
    getFullLogStub.resolves(fakeFullLog)

    formattedSummaryStub = sinon.stub(LogEntry.prototype, 'formattedSummary')
    formattedSummaryStub.returns('a formatted summary')

    formattedLogStub = sinon.stub(LogEntry.prototype, 'formattedLog')
    formattedLogStub.resolves('a formatted log')

    authHelperStub = sinon.stub(authHelper, 'isLoggedIn')
    authHelperStub.returns(true)
  })

  afterEach(() => {
    getFullLogStub.restore()
    formattedSummaryStub.restore()
    formattedLogStub.restore()
    authHelperStub.restore()
  })

  test
  .stdout()
  .command(['log', 'abc_123'])
  .it('will return a formatted log entry', ctx => {
    expect(ctx.stdout).to.contain('a formatted log')
  })

  test
  .stdout()
  .command(['log', 'abc_123'])
  .it('will display a summary too', ctx => {
    expect(ctx.stdout).to.contain('a formatted summary')
  })

  test
  .stdout()
  .command(['log', 'abc_123'])
  .it('does not ask for UTC time formats', () => {
    expect(formattedSummaryStub).to.have.been.called
    expect(formattedSummaryStub).not.to.have.been.calledWith(true)
  })

  test
  .stdout()
  .command(['log', 'abc_123', '--utc'])
  .it('will call methods with UTC configuration only if specified', () => {
    expect(formattedSummaryStub).to.have.been.called
    expect(formattedSummaryStub).to.have.been.calledWith(true)
  })

  test
  .stdout()
  .command(['log', 'abc_123', '--raw'])
  .it('will display a JSON blob if the --raw flag is specified', ctx => {
    expect(ctx.stdout).to.contain(JSON.stringify(fakeFullLog))
    expect(ctx.stdout).not.to.contain('a formatted log')
    expect(ctx.stdout).not.to.contain('a formatted summary')
  })

  test
  .stdout()
  .do(() => {
    getFullLogStub.throws(new class extends Error {
      constructor(message) {
        super(message)
        this.statusCode = 999
      }
    }('bad'))
  })
  .command(['log', 'abc_123'])
  .it('indicates a failure when fetching a log and specifies the status code', ctx => {
    expect(ctx.stdout).to.contain('Could not fetch the log "abc_123". Error: 999')
  })
})
