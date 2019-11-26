/* global beforeEach afterEach */

const fs = require('fs')
const sinon = require('sinon')
const {makeConfig} = require('../../src/helpers/config')
const chai = require('chai')
const sinonChai = require('sinon-chai')

const {expect} = chai
chai.use(sinonChai)

const someJSON = '{"key":"something","someArray":["one","two"]}'

describe('config', () => {
  beforeEach(() => {
    sinon.stub(fs, 'realpathSync').returnsArg(0)
  })
  afterEach(() => {
    sinon.restore()
  })

  it('calls realpath on a provided config directory', () => {
    fs.realpathSync.restore()
    sinon.stub(fs, 'realpathSync').returns('after/realpath')

    const config = makeConfig('before/realpath')

    expect(config.configDirectory).to.equal('after/realpath')
  })

  describe('supported', () => {
    it('should return false if access is not on the config directory', () => {
      const config = makeConfig('fake/dir')
      sinon.stub(fs, 'accessSync').throws()
      expect(config.supported()).to.equal(false)
    })

    it('should return false if the config file cannot be opened', () => {
      const config = makeConfig('fake/dir')
      sinon.stub(fs, 'accessSync')
      sinon.stub(fs, 'openSync').throws()
      expect(config.supported()).to.equal(false)
    })

    it('should return true if all fs commands don\'t throw', () => {
      const config = makeConfig('fake/dir')
      sinon.stub(fs, 'accessSync')
      sinon.stub(fs, 'openSync')
      sinon.stub(fs, 'closeSync')
      expect(config.supported()).to.equal(true)
    })
  })

  describe('load', () => {
    let readStub
    beforeEach(() => {
      readStub = sinon.stub(fs, 'readFileSync')
    })
    it('should return parsed json from the config file', () => {
      readStub.returns(someJSON)

      const config = (makeConfig('.checrc', 'fake/dir')).load()

      expect(readStub).to.have.been.calledOnceWith('fake/dir/.checrc')

      expect(config).to.include({key: 'something'})
      expect(config.someArray).has.members(['one', 'two'])
    })

    it('should only read the file once per run', () => {
      readStub.returns(someJSON)

      const config = makeConfig('.checrc', 'fake/dir')
      config.load() // #1
      const result = config.load() // #2

      expect(readStub).to.have.been.calledOnceWith('fake/dir/.checrc')

      expect(result).to.include({key: 'something'})
      expect(result.someArray).has.members(['one', 'two'])
    })

    it('should still return an object with no content in the config file', () => {
      readStub.returns('')

      const config = (makeConfig('.checrc', 'fake/dir')).load()

      expect(config).to.be.an('object')
    })

    it('should reset config if it is corrupted', () => {
      readStub.returns('%!@#%!(@#$!@$ bad json')
      const writeStub = sinon.stub(fs, 'writeFileSync')

      const config = (makeConfig('.checrc', 'fake/dir')).load()

      expect(config).to.be.an('object')
      expect(writeStub).to.have.been.calledOnceWith('fake/dir/.checrc', '')
    })
  })

  describe('get', () => {
    let readStub
    beforeEach(() => {
      readStub = sinon.stub(fs, 'readFileSync')
    })
    it('should allow fetching config with paths', () => {
      readStub.returns(JSON.stringify({some: {deeply: {nested: {value: 'one'}}}}))

      expect((makeConfig('.checrc', 'fake/dir')).get('some.deeply.nested.value')).to.equal('one')
    })
  })

  describe('save', () => {
    let writeStub
    let readStub
    beforeEach(() => {
      writeStub = sinon.stub(fs, 'writeFileSync')
      readStub = sinon.stub(fs, 'readFileSync')
    })

    it('saves the given attributes after converting to json', () => {
      readStub.returns('')
      const config = makeConfig('.checrc', 'fake/dir')

      config.save({test: 'one'})

      expect(writeStub).to.have.been.calledOnceWith('fake/dir/.checrc', '{"test":"one"}')
    })

    it('overwrites existing config with makeConfig', () => {
      readStub.returns('{"existing":"yes"}')

      const config = makeConfig('.checrc', 'fake/dir')

      config.save({test: 'one'})

      expect(writeStub).to.have.been.calledOnceWith('fake/dir/.checrc', '{"test":"one"}')
    })

    it('does not merge attributes', () => {
      readStub.returns('{"test":["one","two"]}')
      const config = makeConfig('.checrc', 'fake/dir')

      config.save({test: ['three', 'four']})

      expect(writeStub).to.have.been.calledOnceWith('fake/dir/.checrc', '{"test":["three","four"]}')
    })
  })

  describe('set', () => {
    let writeStub
    let readStub
    beforeEach(() => {
      writeStub = sinon.stub(fs, 'writeFileSync')
      readStub = sinon.stub(fs, 'readFileSync')
    })

    it('combines existing config with makeConfig', () => {
      readStub.returns('{"existing":"yes"}')

      const config = makeConfig('.checrc', 'fake/dir')

      config.set({test: 'one'})

      expect(writeStub).to.have.been.calledOnceWith('fake/dir/.checrc', '{"existing":"yes","test":"one"}')
    })

    it('overwrites existing settings with new ones', () => {
      readStub.returns('{"existing":"yes","test":"something"}')
      const config = makeConfig('.checrc', 'fake/dir')

      config.set({test: 'one'})

      expect(writeStub).to.have.been.calledOnceWith('fake/dir/.checrc', '{"existing":"yes","test":"one"}')
    })
  })

  describe('remove', () => {
    let writeStub
    let readStub
    beforeEach(() => {
      writeStub = sinon.stub(fs, 'writeFileSync')
      readStub = sinon.stub(fs, 'readFileSync')
    })

    it('can remove specific config items and return the removed value', () => {
      readStub.returns('{"one":1,"two":"2","three":true}')

      const config = makeConfig('.checrc', 'fake/dir')

      expect(config.remove('two')).to.equal('2')
      expect(writeStub).to.have.been.calledOnceWith('fake/dir/.checrc', '{"one":1,"three":true}')
    })

    it('works with non-existent key', () => {
      readStub.returns('{"one":1,"two":"2","three":true}')

      const config = makeConfig('.checrc', 'fake/dir')

      expect(config.remove('four')).to.equal(undefined)
      expect(writeStub).to.have.been.calledOnceWith('fake/dir/.checrc', '{"one":1,"two":"2","three":true}')
    })
  })
})
