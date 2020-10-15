/* global beforeEach afterEach */

const fs = require('fs')
const sinon = require('sinon')
const chai = require('chai')
const sinonChai = require('sinon-chai')
const {ObjectWritableMock} = require('stream-mock')
const process = require('process')
const stripAnsi = require('strip-ansi')
const Auth = require('../../src/helpers/auth')
const spawner = require('../../src/helpers/spawner')
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

const mockSpawner = new class {
  constructor() {
    this.reset()
  }

  reset() {
    this.withSpinner = sinon.stub().returnsThis()
    this.onComplete = sinon.stub().returnsThis()
    this.streamOutput = sinon.stub().returnsThis()
    this.run = sinon.stub().resolves()
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
  description: 'Long description that should be trimmed down because it is just really long and annoying',
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

const withStoreRepoMocked = (ocTest, manifest = storeManifest) => ocTest.nock('https://raw.githubusercontent.com', api => api
.get('/chec/example-stores/master/manifest.json')
.reply(200, JSON.stringify(manifest))
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
    mockSpawner.reset()
  })

  const applyStubs = ocTest => ocTest
  .stub(config, 'makeConfig', () => mockCache)
  .stub(Auth, 'isLoggedIn', () => true)
  .finally(() => mockCache.reset())

  let base = applyStubs(withStoreRepoMocked(test))

  withStoreChoice(base, 'fake')
  .stdout()
  .command('demo-store')
  .it('Will prompt the user for the stores that were fetched from the example-stores repo', () => {
    expect(inquirer.prompt).to.have.been.called
    const callArgs = inquirer.prompt.firstCall.args[0]
    expect(callArgs).to.be.an('array').that.has.length(1)
    expect(callArgs[0]).to.include({
      type: 'list',
      name: 'slug',
      message: 'Please choose a demo store to install:',
    })
    expect(callArgs[0]).to.have.property('choices')

    const {slugs, options} = storeManifest.reduce((acc, store) => ({
      slugs: [...acc.slugs, store.slug],
      options: [...acc.options, `${store.name} (${store.slug}): `],
    }), {slugs: [], options: []})

    options[1] += 'Long description that should be trimm...'

    expect(callArgs[0].choices).to.satisfy(choices => choices.every(choice =>
      slugs.includes(choice.value) && options.includes(stripAnsi(choice.name))
    ))
  })

  withStoreChoice(base, 'fake')
  .stdout()
  .command('demo-store')
  .it('Will indicate the selected store does not exist', ctx => {
    expect(ctx.stdout).to.contain('Could not find store matching "fake"')
  })

  mockZipStream(applyStubs(withStoreRepoMocked(test, [storeManifest[0]])), 'basic-project', 'fake')
  .stdout()
  .stub(inquirer, 'prompt', sinon.stub())
  .stub(process, 'cwd', () => '/home/dir')
  .command('demo-store')
  .it('Will not ask for a store if there is only one in the store manifest', function () {
    this.slow(600)
    expect(inquirer.prompt).not.to.have.been.called
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
  .command(['demo-store', 'basic', '/given/directory', '--domain', 'chec.example'])
  .it('Will write env variables if configured', function () {
    this.slow(600)

    expect(envWriter.create).to.have.been.calledOnceWith('/given/directory/.env')
    expect(envMock.set).to.have.callCount(5)

    expect(envMock.set).to.have.been.calledWith('test', 123)
    expect(envMock.set).to.have.been.calledWith('string', 'content')
    expect(envMock.set).to.have.been.calledWith('key', 'public')
    expect(envMock.set).to.have.been.calledWith('secret', 'secret')
    expect(envMock.set).to.have.been.calledWith('api_url', 'https://api.chec.example')
  })

  test
  .stub(Auth, 'isLoggedIn', () => false)
  .command(['demo-store', 'basic', '/given/directory'])
  .catch(error => {
    expect(stripAnsi(error.message)).to.contain('You must be logged in to use this command. Please run chec login then try again.')
  })
  .it('Will indicate if API keys cannot be written without being logged in')

  mockZipStream(mockEnv(base), 'env-project', 'fake')
  .stub(Auth, 'isLoggedIn', () => false)
  .stdout()
  .command(['demo-store', 'basic', '/given/directory', '--no-login'])
  .catch(error => {
    expect(stripAnsi(error.message)).to.contain('Could not write the required .env file')
  })
  .it('Will indicate if API keys cannot be written without being logged in when ignoring login requirement', function (ctx) {
    this.slow(600)

    expect(ctx.stdout).to.contain('Downloaded basic to /given/directory')
    expect(ctx.stdout).to.contain('Could not set keys in an env file as you are not logged in!')
    expect(ctx.stdout).to.contain('This store requires a .env file with your Chec public key provided as "key"')
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
  .catch(error => {
    expect(stripAnsi(error.message)).to.contain('Could not write the required .env file')
  })
  .it('Validates env settings given as flags', function (ctx) {
    this.slow(600)

    expect(ctx.stdout).to.contain('Could not parse env definition: test. Please provide env settings as key=value. Eg. --env key=value')
  })

  mockZipStream(base, 'basic-project', 'fake')
  .stub(spawner, 'create', sinon.stub().returns(mockSpawner))
  .stdout()
  .command(['demo-store', 'npm-test', '/given/directory'])
  .it('Runs NPM install and scripts if configured', function () {
    this.slow(600)

    expect(spawner.create).to.have.callCount(2)

    expect(spawner.create).to.have.been.calledWith('npm', ['--prefix', '/given/directory', 'install'])
    expect(spawner.create).to.have.been.calledWith('npm', ['--prefix', '/given/directory', 'run', 'fake'])
  })

  mockZipStream(base, 'basic-project', 'fake')
  .stub(spawner, 'create', sinon.stub().returns(mockSpawner))
  .stdout()
  .command(['demo-store', 'npm-test', '/given/directory', '--no-seed'])
  .it('Does not runs NPM install and scripts if no-seed flag is used', function () {
    this.slow(600)

    expect(spawner.create).to.have.callCount(1)

    expect(spawner.create).to.have.been.calledWith('npm', ['--prefix', '/given/directory', 'install'])
    expect(spawner.create).not.to.have.been.calledWith('npm', ['--prefix', '/given/directory', 'run', 'fake'])
  })

  mockZipStream(base, 'basic-project', 'fake')
  .stub(spawner, 'create', sinon.stub().returns(mockSpawner))
  .stdout()
  .command(['demo-store', 'yarn-test', '/given/directory'])
  .it('Uses yarn instead of NPM if configured', function () {
    this.slow(600)

    expect(spawner.create).to.have.callCount(2)

    expect(spawner.create).to.have.been.calledWith('yarn', ['--cwd', '/given/directory', 'install'])
    expect(spawner.create).to.have.been.calledWith('yarn', ['--cwd', '/given/directory', 'run', 'fake'])
  })
})
