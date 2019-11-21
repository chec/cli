/* global beforeEach afterEach */

const {expect, test} = require('@oclif/test')
const inquirer = require('inquirer')
const sinon = require('sinon')
const config = require('../../src/helpers/config')
const auth = require('../../src/helpers/auth')

describe('login', () => {
  const fakeSuccessfulResponse = JSON.stringify([
    {key: 'pk_test_123', type: 'public', is_sandbox: true}, // eslint-disable-line camelcase
    {key: 'pk_123', type: 'public', is_sandbox: false}, // eslint-disable-line camelcase
    {key: 'sk_test_123', type: 'secret', is_sandbox: true}, // eslint-disable-line camelcase
    {key: 'sk_123', type: 'secret', is_sandbox: false}, // eslint-disable-line camelcase
  ])

  let configSupportedStub
  let configGetStub
  let configSetStub

  beforeEach(() => {
    configSupportedStub = sinon.stub(config, 'supported')
    configSupportedStub.returns(true)
    configGetStub = sinon.stub(config, 'get')
    configGetStub.returns([])
    configSetStub = sinon.stub(config, 'set')
  })

  afterEach(() => {
    configSupportedStub.restore()
    configGetStub.restore()
    configSetStub.restore()
    auth.keys = null
  })

  test
  .stub(inquirer, 'prompt', sinon.fake.returns({
    confirm: false,
  }))
  .do(() => {
    configGetStub.returns(['key'])
  })
  .command('login')
  .it('Will prompt for confirmation if a user is already logged in and exit when told "no"', () => {
    expect(inquirer.prompt.lastArg[0]).to.include({
      type: 'confirm',
      message: 'A user is currently logged in, do you want to continue?',
    })
  })

  const base = test
  .nock('http://api.chec.io', api => api
  .get('/v1/developer/login/issue-keys?email=test%40example.com&password=abcd1234')
  .reply(200, fakeSuccessfulResponse)
  )
  .stdout()

  base
  .stub(inquirer, 'prompt', sinon.fake.returns({
    confirm: true,
  }))
  .do(() => {
    configGetStub.returns(['key'])
  })
  .command(['login', '-e', 'test@example.com', '-p', 'abcd1234'])
  .it('Will prompt for confirmation if a user is already logged in and continue when told "yes"', ctx => {
    expect(ctx.stdout).to.contain('Login successful!')
  })

  base
  .command(['login', '-e', 'test@example.com', '-p', 'abcd1234'])
  .it('can login with provided args', ctx => {
    expect(ctx.stdout).to.contain('Login successful!')
  })

  base
  .stub(inquirer, 'prompt', sinon.fake.returns({
    email: 'test@example.com',
    password: 'abcd1234',
  }))
  .command(['login'])
  .it('prompts for information that is required', ctx => {
    expect(ctx.stdout).to.contain('Login successful!')
    expect(inquirer.prompt.calledOnce).to.equal(true)
    expect(inquirer.prompt.lastArg[0]).to.include({name: 'email', message: 'Please enter your email address'})
    expect(inquirer.prompt.lastArg[1]).to.include({name: 'password', message: 'Enter password'})
  })

  base
  .stub(inquirer, 'prompt', sinon.fake.returns({
    email: 'test@example.com',
    password: 'abcd1234',
  }))
  .command(['login', '-e', 'bad', '-p', 'bad'])
  .it('prompts for information if arguments are invalid', () => {
    expect(inquirer.prompt.calledOnce).to.equal(true)
    expect(inquirer.prompt.lastArg[0]).to.include({name: 'email', message: 'The provided email was invalid. Please enter your email address'})
    expect(inquirer.prompt.lastArg[1]).to.include({name: 'password', message: 'Your password must be at least 8 characters. Enter password'})
  })

  test
  .nock('http://api.chec.io', api => api
  .get('/v1/developer/login/issue-keys?email=test%40example.com&password=abcd1234')
  .reply(429, JSON.stringify({}))
  )
  .stdout()
  .command(['login', '-e', 'test@example.com', '-p', 'abcd1234'])
  .catch(error => expect(error.message).to.contain('too many requests. Have a coffee and try again later'))
  .it('gracefully handles rate limited responses', ctx => {
    expect(ctx.stdout).to.not.contain('Login successful!')
  })

  test
  .nock('http://api.chec.io', api => api
  .get('/v1/developer/login/issue-keys?email=test%40example.com&password=abcd1234')
  .reply(403, JSON.stringify({
    error: {
      message: 'You must validate your email address before you can log in. Please...',
    },
  }))
  )
  .stdout()
  .command(['login', '-e', 'test@example.com', '-p', 'abcd1234'])
  .catch(error => expect(error.message).to.contain('You must validate your email address before you can log in'))
  .it('tells the user when they need to verify their email', ctx => {
    expect(ctx.stdout).to.not.contain('Login successful!')
  })

  test
  .nock('http://api.chec.io', api => api
  .get('/v1/developer/login/issue-keys?email=test%40example.com&password=abcd1234')
  .reply(500, JSON.stringify({}))
  )
  .stdout()
  .command(['login', '-e', 'test@example.com', '-p', 'abcd1234'])
  .catch(error => expect(error.message).to.contain('An unexpected error occurred (500)'))
  .it('gracefully handles non 2xx and 404 responses', ctx => {
    expect(ctx.stdout).to.not.contain('Login successful!')
  })

  test
  .nock('http://api.chec.io', api => api
  .get('/v1/developer/login/issue-keys?email=test%40example.com&password=abcd1234')
  .reply(404, JSON.stringify({}))
  .get('/v1/developer/login/issue-keys?email=bob%40example.com&password=qw3rty12')
  .reply(200, fakeSuccessfulResponse)
  )
  .stub(inquirer, 'prompt', sinon.fake.returns({
    email: 'bob@example.com',
    password: 'qw3rty12',
  }))
  .stdout()
  .command(['login', '-e', 'test@example.com', '-p', 'abcd1234'])
  .it('gracefully handles 404 responses and continues to prompt user', ctx => {
    expect(inquirer.prompt.calledOnce).to.equal(true)
    expect(inquirer.prompt.lastArg).to.have.length(2)
    expect(inquirer.prompt.lastArg[0]).to.include({name: 'email', message: 'Please enter your email address'})
    expect(inquirer.prompt.lastArg[1]).to.include({name: 'password', message: 'Enter password'})
    expect(ctx.stdout).to.contain('Login successful!')
  })

  test
  .do(() => {
    configSupportedStub.returns(false)
  })
  .command(['login', '-e', 'test@example.com', '-p', 'abcd1234'])
  .catch(error => {
    expect(error.message).to.contain('The login command requires a writable home directory')
  })
  .it('Will advise when config is unwritable', () => {})

  test
  .nock('http://api.chec.io', api => api
  .get('/v1/developer/login/issue-keys?email=bob%2Bplus%40example.com&password=qw3r%2By12')
  .reply(200, fakeSuccessfulResponse)
  )
  .stdout()
  .command(['login', '-e', 'bob+plus@example.com', '-p', 'qw3r+y12'])
  .it('will encode url unsafe characters on the request', ctx => {
    expect(ctx.stdout).to.contain('Login successful!')
  })

  test
  .nock('http://api.chec.io', api => api
  .get('/v1/developer/login/issue-keys?email=test%40example.com&password=abcd1234')
  .reply(200, JSON.stringify([]))
  )
  .stdout()
  .command(['login', '-e', 'test@example.com', '-p', 'abcd1234'])
  .catch(error => {
    expect(error.message).to.contain('An unexpected error occurred (MISSING_KEYS)')
  })
  .it('advises when a valid key was not returned from the API', () => {})
})
