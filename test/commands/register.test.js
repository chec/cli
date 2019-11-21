/* global beforeEach, afterEach, process */
const {expect, test} = require('@oclif/test')
const inquirer = require('inquirer')
const {cli} = require('cli-ux')
const sinon = require('sinon')
const auth = require('../../src/helpers/auth')
const config = require('../../src/helpers/config')
const LoginCommand = require('../../src/commands/login')

describe('register', () => {
  let configGetStub
  let originalPlatform

  beforeEach(() => {
    originalPlatform = process.platform
    configGetStub = sinon.stub(config, 'get')
    configGetStub.returns([])
  })

  afterEach(() => {
    configGetStub.restore()
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    })
    auth.keys = null
  })

  test
  .stub(inquirer, 'prompt', sinon.fake.returns({
    confirm: true,
  }))
  // mock the "press any key to continue" prompt to not continue
  .stub(cli, 'anykey', () => sinon.stub().rejects())
  .do(() => {
    configGetStub.returns(['key'])
  })
  .stdout()
  .command(['register'])
  .catch(error => expect(error.code).to.equal('EEXIT'))
  .it('Will prompt for confirmation if a user is already logged in and continue when told "yes"', ctx => {
    expect(ctx.stdout).to.contain('Logged out')
  })

  test
  .stub(inquirer, 'prompt', sinon.fake.returns({
    confirm: false,
  }))
  .stub(cli, 'anykey', () => sinon.stub().resolves())
  .do(() => {
    configGetStub.returns(['key'])
  })
  .stdout()
  .command(['register'])
  .it('Will prompt for confirmation if a user is already logged in and stop when told "no"', ctx => {
    expect(ctx.stdout).not.to.contain('Logged out')
  })

  test
  // mock the "press any key to continue" prompt to not continue
  .stub(cli, 'anykey', () => sinon.stub().rejects())
  .stdout()
  .command(['register'])
  .catch(error => expect(error.code).to.equal('EEXIT'))
  .it('quits when you press "q" in "open browser" confirmation', ctx => {
    expect(ctx.stdout).to.contain('This will open the Chec registration page in your browser')
    expect(ctx.stdout).not.to.contain('Logged out')
  })

  test
  .stdout()
  .stub(cli, 'anykey', () => sinon.stub().resolves())
  .stub(cli, 'open', () => sinon.stub().returns('foo'))
  .stub(LoginCommand, 'run', sinon.fake.returns(true))
  .command(['register'])
  .it('opens the registration page in the browser', ctx => {
    expect(ctx.stdout).to.contain('When you\'ve completed your registration')
  })

  test
  .stub(cli, 'anykey', () => sinon.stub().resolves())
  .stub(LoginCommand, 'run', sinon.fake.returns(true))
  .do(() => {
    Object.defineProperty(process, 'platform', {
      value: 'MockOS',
    })
  })
  .stdout()
  .command(['register'])
  .it('shows the registration page URL when auto-open fails', ctx => {
    expect(ctx.stdout).to.contain('Unable to automatically open the registration page in your browser')
    expect(ctx.stdout).to.contain('dashboard.chec.io/signup')
  })

  test
  .stub(cli, 'anykey', () => sinon.stub().resolves())
  .stub(cli, 'open', () => sinon.stub().returns('foo'))
  .stub(LoginCommand, 'run', sinon.fake.returns(true))
  .stdout()
  .command(['register'])
  .it('calls the login command', ctx => {
    expect(ctx.stdout).to.contain('enter your credentials to log in')
    expect(LoginCommand.run.calledOnce).to.equal(true)
  })
})
