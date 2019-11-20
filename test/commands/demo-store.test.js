/* global beforeEach afterEach */

const fs = require('fs')
const sinon = require('sinon')
const chai = require('chai')
const sinonChai = require('sinon-chai')
const {ObjectWritableMock} = require('stream-mock')
const process = require('process')
const Auth = require('../../src/helpers/auth')
const spawnPromise = require('../../src/helpers/spawn-promise')
const envWriter = require('../../src/helpers/env-writer')
const config = require('../../src/helpers/config')
const {expect, test} = require('@oclif/test')
const inquirer = require('inquirer')
const streamWriter = require('../../src/helpers/stream-writer')

chai.use(sinonChai)

const mockCache = new class {
  constructor() {
    this.items = {}
  }

  set(attributes) {
    this.items = {
      ...this.items,
      ...attributes,
    }
  }

  get(key) {
    return this.items[key]
  }

  reset() {
    this.items = []
  }
}()

const withStoreChoice = (ocTest, slug) => ocTest.stub(inquirer, 'prompt', sinon.fake.returns({
  slug,
}))

const storeManifest = [{
  slug: 'basic',
  name: 'First test store',
  githubSlug: 'chec/fake',
}, {
  slug: 'branch-test',
  name: 'Second test store',
  githubSlug: 'chec/fake',
  branch: 'test-branch',
}, {
  slug: 'npm-test',
  name: 'Third test store',
  githubSlug: 'chec/fake',
  npm: true,
  buildScripts: ['fake'],
}, {
  slug: 'yarn-test',
  name: 'Fourth test store',
  githubSlug: 'chec/fake',
  npm: 'yarn',
  buildScripts: ['fake'],
}]

const withStoreRepoMocked = ocTest => ocTest.nock('https://raw.githubusercontent.com', api => api
.get('/chec/example-stores/master/manifest.json')
.reply(200, JSON.stringify(storeManifest))
)

const mockZipStream = (ocTest, zipName, repo, branch = 'master') => ocTest.nock('https://github.com', api => api
.get(`/chec/${repo}/archive/${branch}.zip`)
.reply(200, fs.createReadStream(fs.realpathSync(`test/resources/${zipName}.zip`)))
)

const envMock = {
  set: sinon.spy(),
  writeFile: sinon.stub().resolves(true),
}

const mockEnv = ocTest => ocTest
.stub(envWriter, 'create', sinon.stub().resolves(envMock))
.finally(() => {
  envMock.set.resetHistory()
  envMock.writeFile.resetHistory()
})

describe('demo-store', () => {
  let writerMock
  let readdirMock

  beforeEach(() => {
    writerMock = new ObjectWritableMock()
    sinon.stub(streamWriter, 'create').returns(writerMock)
    readdirMock = sinon.stub(fs, 'readdirSync').callThrough()
  })
  afterEach(() => {
    writerMock.destroy()
    streamWriter.create.restore()
    readdirMock.restore()
  })

  let base = withStoreRepoMocked(test)
  .stub(config, 'makeConfig', () => mockCache)
  .finally(() => mockCache.reset())

  withStoreChoice(base, 'fake')
  .stdout()
  .command('demo-store')
  .it('Will indicate the selected store does not exist', ctx => {
    expect(ctx.stdout).to.contain('Could not find store matching "fake"')
  })

  withStoreChoice(base, 'fake')
  .stdout()
  .command('demo-store')
  .it('Will cache fetched stores', () => {
    expect(mockCache.items.storeManifest).to.deep.equal(storeManifest)
  })

  mockZipStream(base, 'basic-project', 'fake')
  .stdout()
  .stub(process, 'cwd', () => '/home/dir')
  .command(['demo-store', 'basic'])
  .it('Will download an archive from github and extract to cwd', function () {
    this.slow(600)
    expect(streamWriter.create).to.have.been.calledOnceWith({path: '/home/dir/basic/.chec.json'})
  })

  mockZipStream(base, 'branch-project', 'fake', 'test-branch')
  .stdout()
  .stub(process, 'cwd', () => '/home/dir')
  .command(['demo-store', 'branch-test'])
  .it('Can handle different branches from GitHub', function () {
    this.slow(600)
    expect(streamWriter.create).to.have.been.calledOnceWith({path: '/home/dir/branch-test/.chec.json'})
  })

  mockZipStream(base, 'basic-project', 'fake')
  .stdout()
  .command(['demo-store', 'basic', '/given/directory'])
  .it('Will download an archive from github and extract to a given directory', function () {
    this.slow(600)
    expect(streamWriter.create).to.have.been.calledOnceWith({path: '/given/directory/.chec.json'})
  })

  base
  .nock('https://github.com', api => api
  .get('/chec/fake/archive/master.zip')
  .reply(404)
  )
  .stdout()
  .command(['demo-store', 'basic', '/given/directory'])
  .exit(1)
  .it('Gracefully handles failed downloads', ctx => {
    expect(ctx.stdout).to.contain('Unexpected error occurred fetching https://github.com/chec/fake/archive/master.zip. (404)')
  })

  mockZipStream(base, 'basic-project', 'fake')
  .stdout()
  .command(['demo-store', 'basic', '/given/directory'])
  .it('Will use descriptions provided by the downloaded project', function (ctx) {
    this.slow(600)
    expect(ctx.stdout).to.contain('First test store')
    expect(ctx.stdout).to.contain('A test basic project')
  })

  base
  .stdout()
  .stub(fs, 'accessSync', () => true)
  .do(() => readdirMock.withArgs('/given/directory').returns([1]))
  .command(['demo-store', 'basic', '/given/directory'])
  .exit(1)
  .it('Will exit out if destination directory exists and is not empty', ctx => {
    expect(streamWriter.create).not.to.have.been.called
    expect(ctx.stdout).to.contain('The destination directory (/given/directory) already exists and is not empty')
  })

  mockZipStream(base, 'basic-project', 'fake')
  .stdout()
  .stub(fs, 'accessSync', () => true)
  .do(() => readdirMock.withArgs('/given/directory').returns([]))
  .command(['demo-store', 'basic', '/given/directory'])
  .it('Will not exit out if destination directory exists and is empty', ctx => {
    expect(streamWriter.create).to.have.been.called
    expect(ctx.stdout).not.to.contain('The destination directory (/given/directory) already exists and is not empty')
  })

  mockZipStream(mockEnv(base), 'env-project', 'fake')
  .stub(Auth, 'isLoggedIn', () => true)
  .stub(Auth, 'getApiKey', sinon.stub().callsFake((_, type) => ({key: type})))
  .stdout()
  .command(['demo-store', 'basic', '/given/directory'])
  .it('Will write env variables if configured', function () {
    this.slow(600)

    expect(envWriter.create).to.have.been.calledOnceWith('/given/directory/.env')
    expect(envMock.set).to.have.callCount(4)

    expect(envMock.set).to.have.been.calledWith('test', 123)
    expect(envMock.set).to.have.been.calledWith('string', 'content')
    expect(envMock.set).to.have.been.calledWith('key', 'public')
    expect(envMock.set).to.have.been.calledWith('secret', 'secret')
  })

  mockZipStream(mockEnv(base), 'env-project', 'fake')
  .stub(Auth, 'isLoggedIn', () => false)
  .stdout()
  .command(['demo-store', 'basic', '/given/directory'])
  .it('Will indicate if API keys cannot be written without being logged in', function (ctx) {
    this.slow(600)

    expect(ctx.stdout).to.contain('Downloaded basic to /given/directory')
    expect(ctx.stdout).to.contain('Could not run the example store. You must be logged in')
    expect(ctx.stdout).to.contain('This store requires a .env file with your Chec.io public key provided as "key"')
  })

  mockZipStream(mockEnv(base), 'env-project', 'fake')
  .stub(Auth, 'isLoggedIn', () => true)
  .stub(Auth, 'getApiKey', sinon.stub().callsFake((_, type) => ({key: type})))
  .stdout()
  .command(['demo-store', 'basic', '/given/directory', '--env', 'test=something'])
  .it('Will allow override env settings with flags', function () {
    this.slow(600)

    expect(envMock.set).not.to.have.been.calledWith('test', 123)
    expect(envMock.set).to.have.been.calledWith('test', 'something')
  })

  mockZipStream(mockEnv(base), 'env-project', 'fake')
  .stdout()
  .command(['demo-store', 'basic', '/given/directory', '--env', 'test'])
  .it('Validates env settings given as flags', function (ctx) {
    this.slow(600)

    expect(ctx.stdout).to.contain('Could not understand env definition: test. Please provide env settings as key=value. Eg. --env key=value')
  })

  mockZipStream(base, 'basic-project', 'fake')
  .stub(spawnPromise, 'spawn', sinon.stub().resolves())
  .stdout()
  .command(['demo-store', 'npm-test', '/given/directory'])
  .it('Runs NPM install and scripts if configured', function () {
    this.slow(600)

    expect(spawnPromise.spawn).to.have.callCount(2)

    expect(spawnPromise.spawn).to.have.been.calledWith('npm', ['--prefix', '/given/directory', 'install'])
    expect(spawnPromise.spawn).to.have.been.calledWith('npm', ['--prefix', '/given/directory', 'run', 'fake'])
  })

  mockZipStream(base, 'basic-project', 'fake')
  .stub(spawnPromise, 'spawn', sinon.stub().resolves())
  .stdout()
  .command(['demo-store', 'yarn-test', '/given/directory'])
  .it('Uses yarn instead of NPM if configured', function () {
    this.slow(600)

    expect(spawnPromise.spawn).to.have.callCount(2)

    expect(spawnPromise.spawn).to.have.been.calledWith('yarn', ['--cwd', '/given/directory', 'install'])
    expect(spawnPromise.spawn).to.have.been.calledWith('yarn', ['--cwd', '/given/directory', 'run', 'fake'])
  })
})
