/* global beforeEach afterEach */

const chai = require('chai')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const config = require('../../src/helpers/config')

class FakeChannel {
  constructor(channel) {
    this.channel = channel
    this.bindFake = sinon.fake()
    this.callbacks = []
  }

  bind(event, callback) {
    this.callbacks.push(callback)
    return this.bindFake(event, callback)
  }
}

class FakePusher {
  constructor(key, config) {
    this.key = key
    this.config = config
    this.disconnectFake = sinon.fake()
  }

  subscribe(channel) {
    return new FakeChannel(channel)
  }

  disconnect() {
    this.disconnectFake()
  }
}

const LogFeed = proxyquire('../../src/helpers/log-feed', {
  'pusher-js': FakePusher,
})

const {expect} = chai
chai.use(sinonChai)

describe('LogFeed', () => {
  let configGetMock
  beforeEach(() => {
    configGetMock = sinon.stub(config, 'get')
    configGetMock.returns({
      key: 'key',
      token: 'token',
    })
  })
  afterEach(() => {
    configGetMock.restore()
  })

  describe('getConfiguration', () => {
    it('should get the "notifications" key from config', () => {
      (new LogFeed()).getConfiguration()
      expect(configGetMock).to.have.been.calledOnceWithExactly('notifications')
    })
    it('should error if the required config is not available', () => {
      configGetMock.returns(null)
      expect(() => (new LogFeed()).getConfiguration()).to.throw('Could not locate required credentials to subscribe to a log feed')
    })
    it('will return a key and token', () => {
      expect((new LogFeed()).getConfiguration()).to.deep.equal({
        key: 'key',
        token: 'token',
      })
    })
  })

  describe('getChannel', () => {
    it('creates a pusher socket and channel', () => {
      const feed = new LogFeed()
      expect(feed.socket).to.be.null
      expect(feed.channel).to.be.null
      feed.getChannel()
      expect(feed.socket).to.be.instanceOf(FakePusher)
      expect(feed.channel).to.be.instanceOf(FakeChannel)
    })

    it('reuses an existing socket and channel', () => {
      const feed = new LogFeed()
      const channel = feed.getChannel()
      const socket = feed.socket
      const newChannel = feed.getChannel()
      expect(newChannel).to.equal(channel)
      expect(feed.socket).to.equal(socket)
    })
  })

  describe('disconnect', () => {
    it('doesn\'t choke without a socket', () => {
      const feed = new LogFeed()
      expect(() => feed.disconnect()).not.to.throw()
      expect(feed.socket).to.be.null
    })
    it('calls disconnect on a pusher instance', () => {
      const feed = new LogFeed()
      feed.getChannel()
      feed.disconnect()
      expect(feed.socket.disconnectFake).to.have.been.called
    })
  })

  describe('onLog', () => {
    it('creates a socket and channel if required', () => {
      const feed = new LogFeed()
      feed.onLog(() => {})
      expect(feed.channel).to.be.instanceOf(FakeChannel)
      expect(feed.socket).to.be.instanceOf(FakePusher)
    })
    it('calls bind on a channel', () => {
      const feed = new LogFeed()
      feed.onLog(() => {})
      expect(feed.channel.bindFake).to.have.been.calledOnceWith('log')
    })
    it('proxies the given callback to provide the specific log', () => {
      const feed = new LogFeed()
      const callback = sinon.fake()
      feed.onLog(callback)
      const boundCallback = feed.channel.callbacks.pop()
      boundCallback({log: 'a log'})
      expect(callback).to.have.been.calledOnceWithExactly('a log')
    })
  })
})
