/* global beforeEach afterEach */
const requestHelper = require('../../src/helpers/request')
const chai = require('chai')
const dateFormat = require('date-format')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')

const makeStub = () => {
  const stub = sinon.stub()
  stub.returnsArg(0)
  return stub
}
const chalkStub = {
  dim: makeStub(),
  black: makeStub(),
  yellow: makeStub(),
  bgYellow: makeStub(),
  bgGreen: makeStub(),
  bgRed: makeStub(),
}
const coloriseStub = sinon.stub()
const LogEntry = proxyquire('../../src/helpers/log-entry', {
  'json-colorizer': coloriseStub,
  chalk: chalkStub,
})

const {expect} = chai
chai.use(sinonChai)

const fakePartialLog = {
  id: 123,
  status_code: 201, // eslint-disable-line camelcase
  url: '/v1/fake/endpoint',
  created: 1572304602,
}
const fakeFullLog = {
  ...fakePartialLog,
  response: {content: 'test response'},
}

const timestampAssertion = dateFormat('yyyy-MM-dd hh:mm:ss', new Date(1572304602000))

describe('LogEntry', () => {
  let requestMock
  beforeEach(() => {
    requestMock = sinon.stub(requestHelper, 'request')
  })
  afterEach(() => {
    requestMock.restore()
  })

  describe('construction', () => {
    it('requires at least a "id"', () => {
      expect(() => new LogEntry({})).to.throw('LogEntry must be given a "raw" entry that at least contains the `id`')
    })
    it('does not do any requests', () => {
      new LogEntry(fakePartialLog) // eslint-disable-line no-new
      expect(requestMock).not.to.have.been.called
    })
    it('identifies a full log by the existence of a response', () => {
      expect(new LogEntry(fakeFullLog)).to.have.own.property('full', true)
    })
  })

  describe('id', () => {
    it('returns the log ID', () => {
      const log = new LogEntry(fakePartialLog)
      expect(log.id()).to.equal(123)
    })
  })

  describe('setPrinted', () => {
    it('will indicate that the log entry has been printed', () => {
      const log = new LogEntry(fakePartialLog)
      expect(log.printed).to.equal(false)
      log.setPrinted()
      expect(log.printed).to.equal(true)
    })

    it('can be used to indicate the log has not been printed', () => {
      const log = new LogEntry(fakePartialLog)
      log.setPrinted()
      expect(log.printed).to.equal(true)
      log.setPrinted(false)
      expect(log.printed).to.equal(false)
    })
  })

  describe('getFullLog', () => {
    beforeEach(() => {
      requestMock.returns(Promise.resolve({body: JSON.stringify(fakeFullLog)}))
    })

    it('Returns the full value when the log is fully fetched, without dispatching a request', async () => {
      const log = new LogEntry(fakeFullLog)
      expect(await log.getFullLog()).to.equal(fakeFullLog)
      expect(requestMock).not.to.have.been.called
    })

    it('dispatches a request for the full log if not fully loaded', async () => {
      const log = new LogEntry(fakePartialLog)
      expect(await log.getFullLog()).to.deep.equal(fakeFullLog)
      expect(requestMock).to.have.been.calledOnceWithExactly('GET', '/v1/developer/logs/123', null, {domain: 'chec.io'})
    })

    it('should indicate the log is fully fetched and only dispatch one request for multiple calls', async () => {
      const log = new LogEntry(fakePartialLog)
      await log.getFullLog()
      expect(log.full).to.be.true
      expect(requestMock).to.have.been.calledOnce
      await log.getFullLog()
      expect(requestMock).to.have.been.calledOnce
    })
  })

  describe('formattedLog', () => {
    it('should use "colorise" on the existing log content', async () => {
      coloriseStub.returns('a formatted string')
      const log = new LogEntry(fakeFullLog)
      expect(await log.formattedLog()).to.equal('a formatted string')
      expect(coloriseStub).to.have.been.calledOnceWith(fakeFullLog, {pretty: true})
    })
  })

  describe('formattedDate', () => {
    it('should render the log\'s timestamp in a readable format', () => {
      const log = new LogEntry(fakePartialLog)
      expect(log.formattedDate()).to.equal(timestampAssertion)
    })

    it('should show UTC if specified', () => {
      const log = new LogEntry(fakePartialLog)
      expect(log.formattedDate(true)).to.equal('2019-10-28 23:16:42')
    })
  })

  describe('formattedSummary', () => {
    const colorOptions = ['bgYellow', 'bgGreen', 'bgRed']
    beforeEach(() => {
      colorOptions.forEach(key => {
        chalkStub[key].resetHistory()
      })
    })
    it('should render a line of information on the entry', () => {
      const log = new LogEntry(fakePartialLog)
      expect(log.formattedSummary()).to.equal(`[${timestampAssertion}]  201  123 /v1/fake/endpoint`)
    })

    it('passes through the UTC setting', () => {
      const log = new LogEntry(fakePartialLog)
      expect(log.formattedSummary(true)).to.equal('[2019-10-28 23:16:42]  201  123 /v1/fake/endpoint')
    })

    const options = [
      [302, 'bgYellow'],
      [201, 'bgGreen'],
      [500, 'bgRed'],
    ]

    options.forEach(([code, colour]) => it(`should render ${code.toString()[0]}xx responses in ${colour.substring(2).toLowerCase()}`, () => {
      const log = new LogEntry({
        ...fakePartialLog,
        status_code: code, // eslint-disable-line camelcase
      })

      log.formattedSummary()

      // eslint-disable-next-line max-nested-callbacks
      colorOptions.forEach(option => {
        const method = option === colour ? 'called' : 'notCalled'
        expect(chalkStub[option][method]).to.equal(true)
      })
    }))
  })
})
