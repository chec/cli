/* global beforeEach */

const {test} = require('@oclif/test')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const mockSpawnFactory = require('mock-spawn')
const chai = require('chai')
const sinonChai = require('sinon-chai')
const {expect} = chai
chai.use(sinonChai)

const oraStop = sinon.stub()
const oraSucceed = sinon.stub()
const oraStart = sinon.stub()
const oraStub = sinon.stub().returns({
  start: () => ({
    succeed: oraSucceed,
    stop: oraStop,
    start: oraStart,
  }),
})

const logUpdateStub = sinon.stub()
logUpdateStub.clear = sinon.stub()
logUpdateStub.done = sinon.stub()
logUpdateStub.stderr = sinon.stub()
logUpdateStub.stderr.clear = sinon.stub()
logUpdateStub.stderr.done = sinon.stub()

let mockSpawn

const spawner = proxyquire('../../src/helpers/spawner', {
  ora: oraStub,
  'log-update': logUpdateStub,
  child_process: { // eslint-disable-line camelcase
    spawn(...args) {
      mockSpawn = mockSpawnFactory()
      mockSpawn.setStrategy(command => {
        switch (command) {
        case 'err':
          return mockSpawn.simple(0, '', 'Some error content for stderr')
        case 'exit1':
          return mockSpawn.simple(1, 'Some output that can be piped through')
        default:
          return mockSpawn.simple(0, 'Some output that can be piped through')
        }
      })
      return mockSpawn(...args)
    },
  },
})

const readOutput = (call, stderr = false) => {
  const source = call[stderr ? 'stderr' : 'stdout']
  let output = ''
  let chunk
  while ((chunk = source.read()) !== null) {
    output += chunk.toString()
  }
  return output
}

describe('Spawner', () => {
  beforeEach(() => {
    oraStart.resetHistory()
    oraSucceed.resetHistory()
    oraStop.resetHistory()
    oraStub.resetHistory()
    logUpdateStub.resetHistory()
    logUpdateStub.clear.resetHistory()
    logUpdateStub.done.resetHistory()
    logUpdateStub.stderr.resetHistory()
    logUpdateStub.stderr.clear.resetHistory()
    logUpdateStub.stderr.done.resetHistory()
  })

  it('Will spawn a process and pipe to stdout by default', async () => {
    await spawner.create('command').run()

    expect(mockSpawn.calls).to.have.lengthOf(1)
    expect(mockSpawn.calls[0].opts).to.have.property('stdio', 'inherit')
    expect(readOutput(mockSpawn.calls[0])).to.contain('Some output that can be piped through')
  })

  it('Pipes through args to the spawn function', async () => {
    await spawner.create('command', ['extra', 'stuff'], {fake: 'option'}).run()

    expect(mockSpawn.calls).to.have.lengthOf(1)
    const call = mockSpawn.calls[0]

    expect(call.command).to.equal('command')
    expect(call.args).to.deep.equal(['extra', 'stuff'])
    expect(call.opts).to.deep.include({fake: 'option'})
  })

  it('Can be configured to suppress output', async () => {
    await spawner.create('command').streamOutput(false).run()

    expect(mockSpawn.calls).to.have.lengthOf(1)
    expect(mockSpawn.calls[0].opts).to.have.property('stdio')
    expect(mockSpawn.calls[0].opts.stdio).to.deep.equal(['inherit', 'pipe', 'pipe'])
    expect(logUpdateStub).not.to.have.been.called
  })

  it('Will show a spinner if configured', async () => {
    await spawner.create('command').withSpinner('loading').run()

    expect(mockSpawn.calls).to.have.lengthOf(1)
    expect(oraStub).to.have.been.calledOnce
    expect(oraStub.firstCall.args[0]).to.deep.include({text: 'loading'})
    expect(oraStop).to.have.been.calledOnce
  })

  it('Forwards options to ora', async () => {
    await spawner.create('command').withSpinner({
      text: 'something',
      fake: 'test',
    }).run()

    expect(mockSpawn.calls).to.have.lengthOf(1)
    expect(oraStub).to.have.been.calledOnce
    expect(oraStub.firstCall.args[0]).to.deep.include({
      text: 'something',
      fake: 'test',
    })
  })

  it('Will not stream output if a spinner was configured', async () => {
    await spawner.create('command').withSpinner('loading').run()

    expect(mockSpawn.calls).to.have.lengthOf(1)
    expect(mockSpawn.calls[0].opts.stdio).to.deep.equal(['inherit', 'pipe', 'pipe'])
    expect(logUpdateStub).not.to.have.been.called
  })

  it('Will stream output if a spinner is configured and the output is told to stream', async () => {
    await spawner.create('command').withSpinner('loading').streamOutput().run()

    expect(mockSpawn.calls).to.have.lengthOf(1)
    expect(oraStub).to.have.been.calledOnce
    expect(oraStop).to.have.been.calledTwice
    expect(oraStart).to.have.been.called
    expect(logUpdateStub).to.have.been.calledOnceWith('Some output that can be piped through')
    expect(logUpdateStub.done).to.have.been.called
    expect(mockSpawn.calls[0].opts.stdio).to.deep.equal(['inherit', 'pipe', 'pipe'])
  })

  it('Will still stream stderr with a spinner', async () => {
    await spawner.create('err').withSpinner('loading').streamOutput().run()

    expect(mockSpawn.calls).to.have.lengthOf(1)
    expect(oraStub).to.have.been.calledOnce
    expect(oraStop).to.have.been.calledTwice
    expect(oraStart).to.have.been.called
    expect(logUpdateStub.stderr).to.have.been.calledOnceWith('Some error content for stderr')
    expect(logUpdateStub.done).to.have.been.called
    expect(mockSpawn.calls[0].opts.stdio).to.deep.equal(['inherit', 'pipe', 'pipe'])
  })

  test
  .stdout()
  .do(async () => {
    await spawner.create('command').onComplete('It is done').run()
  })
  .it('Will show a complete message if configured', async ctx => {
    expect(mockSpawn.calls).to.have.lengthOf(1)
    expect(mockSpawn.calls[0].opts).to.have.property('stdio', 'inherit')
    expect(readOutput(mockSpawn.calls[0])).to.contain('Some output that can be piped through')
    expect(ctx.stdout).to.contain('It is done')
  })

  it('Will use ora.success for completion messages with a spinner', async () => {
    await spawner.create('command').withSpinner('loading').streamOutput().onComplete('It is done').run()

    expect(mockSpawn.calls).to.have.lengthOf(1)
    expect(oraStub).to.have.been.calledOnce
    expect(oraStop).to.have.been.calledOnce
    expect(oraStart).to.have.been.calledOnce
    expect(oraSucceed).to.have.been.calledOnceWith('It is done')
    expect(logUpdateStub).to.have.been.called
  })

  it('Will reject the promise when there is a non-zero exit code', done => {
    spawner.create('exit1').run().catch(error => {
      expect(error).to.equal(1)
      done()
    })
  })

  it('Will stop the spinner before rejecting with a non-zero exit code', done => {
    spawner.create('exit1').withSpinner('loading').run().catch(() => {
      expect(oraStub).to.have.been.calledOnce
      expect(oraStop).to.have.been.calledOnce
      expect(oraStart).not.to.have.been.called
      done()
    })
  })
})
