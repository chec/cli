/* global beforeEach afterEach */

const config = require('../../src/helpers/config')
const auth = require('../../src/helpers/auth')
const sinon = require('sinon')
const {expect} = require('chai')

describe('auth', () => {
  let configGetStub
  let configRemoveStub
  let configSupportedStub
  beforeEach(() => {
    configGetStub = sinon.stub(config, 'get')
    configRemoveStub = sinon.stub(config, 'remove')
    configSupportedStub = sinon.stub(config, 'supported')
    configSupportedStub.returns(true)
    auth.keys = null
  })
  afterEach(() => {
    configGetStub.restore()
    configRemoveStub.restore()
    configSupportedStub.restore()
  })

  describe('isLoggedIn', () => {
    it('should indicate logged out if config is unsupported', () => {
      configSupportedStub.returns(false)
      expect(auth.isLoggedIn()).to.equal(false)
    })

    it('should indicate logged out if there are no saved keys', () => {
      configGetStub.returns([])
      expect(auth.isLoggedIn()).to.equal(false)
    })

    it('should indicate logged in if there are saved keys', () => {
      configGetStub.returns(['key'])
      expect(auth.isLoggedIn()).to.equal(true)
    })
  })

  describe('getApiKey', () => {
    const keys = [
      {key: 'public', type: 'public', is_sandbox: false}, // eslint-disable-line camelcase
      {key: 'public.sandbox', type: 'public', is_sandbox: true}, // eslint-disable-line camelcase
      {key: 'secret', type: 'secret', is_sandbox: false}, // eslint-disable-line camelcase
      {key: 'secret.sandbox', type: 'secret', is_sandbox: true}, // eslint-disable-line camelcase
    ]
    beforeEach(() => {
      configGetStub.returns(keys)
    })

    keys.forEach(key => {
      const suffix = key.is_sandbox ? ' with the sandbox flag' : ''
      it(`should filter ${key.type} keys${suffix}`, () => {
        expect(auth.getApiKey(key.is_sandbox, key.type)).to.equal(key)
      })
    })
  })

  describe('logout', () => {
    it('removes the keys config', () => {
      auth.logout()

      expect(configRemoveStub.calledTwice).to.equal(true)
      expect(configRemoveStub.calledWithExactly('keys')).to.equal(true)
      expect(configRemoveStub.calledWithExactly('notifications')).to.equal(true)
    })
  })
})
