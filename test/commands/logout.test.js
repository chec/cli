const {expect, test} = require('@oclif/test')
const loginHelper = require('../../src/helpers/login-helper')
const sinon = require('sinon')

describe('logout', () => {
  test
  .stub(loginHelper, 'setLoggedInKey', sinon.fake())
  .stdout()
  .command(['logout'])
  .it('blanks out the key and displays a message', ctx => {
    expect(loginHelper.setLoggedInKey.calledOnce).to.equal(true)
    expect(loginHelper.setLoggedInKey.lastArg).to.equal('')
    expect(ctx.stdout).to.contain('Successfully logged out from Chec.io')
  })
})
