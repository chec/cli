const {expect, test} = require('@oclif/test')

describe('request', () => {
  describe('run', () => {
    test
    .stdout()
    .command(['request', 'GET', '/v1/products', '{hello:"world"}'])
    .it('fails when you provide it invalid JSON payload', ctx => {
      expect(ctx.stdout).to.contain('Failed to parse your input payload')
    })

    test
    .nock('http://api.chec.io', api => api
    .get('/v1/products')
    .once()
    .reply(200, JSON.stringify({foo: 'bar'}))
    )
    .stdout()
    .command(['request', 'GET', '/v1/products'])
    .it('returns responses from the API', ctx => {
      expect(ctx.stdout).to.contain('foo')
      expect(ctx.stdout).to.contain('bar')
    })

    test
    .nock('http://api.chec.io', api => api
    .get('/v1/products?limit=1')
    .once()
    .reply(401, JSON.stringify({message: 'It broke'}))
    )
    .stdout()
    .command(['request', 'GET', '/v1/products', '{"limit":1}'])
    .catch(error => expect(error.message).to.contain('It broke'))
    .it('prints the error responses', ctx => {
      expect(ctx.stdout).to.contain('Request failed')
    })
  })
})
