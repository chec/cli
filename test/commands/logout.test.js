const {expect, test} = require('@oclif/test')
const loginHelper = require('../../src/helpers/auth')
const sinon = require('sinon')

describe('logout', () => {
  test
  .stub(loginHelper, 'logout', sinon.fake())
  .stdout()
  .command(['logout'])
  .it('blanks out the key and displays a message', ctx => {
    expect(loginHelper.logout.calledOnce).to.equal(true)
    expect(ctx.stdout).to.contain('Successfully logged out from Chec.io')
  })
})
