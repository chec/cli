/* global beforeEach afterEach */

const {expect, test} = require('@oclif/test')
const sinon = require('sinon')
const authHelper = require('../../src/helpers/auth')

describe('whoami', () => {
  describe('run', () => {
    let isLoggedInMock

    beforeEach(() => {
      isLoggedInMock = sinon.stub(authHelper, 'isLoggedIn').returns(true)
    })
    afterEach(() => {
      isLoggedInMock.restore()
    })

    test
    .nock('https://api.chec.io', api => api
    .get('/v1/developer/user')
    .once()
    .reply(200, JSON.stringify({
      email: 'foo@bar.com',
      merchants: [
        {business_name: 'Test store'}, // eslint-disable-line camelcase
        {business_name: 'Second store'}, // eslint-disable-line camelcase
      ],
    })),
    )
    .stdout()
    .command(['whoami'])
    .it('tells you your email and merchant names', ctx => {
      expect(ctx.stdout).to.contain('foo@bar.com')
      expect(ctx.stdout).to.contain('Test store')
      expect(ctx.stdout).to.contain('Second store')
    })
  })
})
