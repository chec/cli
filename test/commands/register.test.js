const {expect, test} = require('@oclif/test')
const inquirer = require('inquirer')
const sinon = require('sinon')

describe('register', () => {
  const base = test
  .nock('http://api.chec.io', api => api
  .put('/v1/merchants')
  .reply(200, JSON.stringify({}))
  )
  .stdout()

  base
  .command(['register', '-e', 'test@example.com', '-p', 'abcd1234'])
  .it('can register with provided args', ctx => {
    expect(ctx.stdout).to.contain('Account created successfully!')
  })

  base
  .stub(inquirer, 'prompt', sinon.fake.returns({
    email: 'test@example.com',
    password: 'abcd1234',
  }))
  .command(['register'])
  .it('prompts for information that is required', ctx => {
    expect(ctx.stdout).to.contain('Account created successfully!')
    expect(inquirer.prompt.calledOnce).to.equal(true)
    expect(inquirer.prompt.lastArg[0]).to.include({name: 'email', message: 'Please enter your email address'})
    expect(inquirer.prompt.lastArg[1]).to.include({name: 'password', message: 'Enter a password'})
  })

  base
  .stub(inquirer, 'prompt', sinon.fake.returns({
    email: 'test@example.com',
    password: 'abcd1234',
  }))
  .command(['register', '-e', 'bad', '-p', 'bad'])
  .it('prompts for information if arguments are invalid', () => {
    expect(inquirer.prompt.calledOnce).to.equal(true)
    expect(inquirer.prompt.lastArg[0]).to.include({name: 'email', message: 'The provided email was invalid. Please enter your email address'})
    expect(inquirer.prompt.lastArg[1]).to.include({name: 'password', message: 'Your password must be at least 8 characters. Enter a password'})
  })

  test
  .nock('http://api.chec.io', api => api
  .put('/v1/merchants')
  .reply(500, JSON.stringify({}))
  )
  .stdout()
  .command(['register', '-e', 'test@example.com', '-p', 'abcd1234'])
  .catch(error => expect(error.message).to.contain('An unexpected error occured (RequestError)'))
  .it('gracefully handles non 2xx and 422 responses', ctx => {
    expect(ctx.stdout).to.not.contain('Account created successfully!')
  })

  test
  .nock('http://api.chec.io', api => api
  .put('/v1/merchants')
  .once()
  .reply(422, JSON.stringify({error: {errors: {
    email: ['It is bad'],
  }}}))
  .put('/v1/merchants')
  .reply(200, JSON.stringify({}))
  )
  .stub(inquirer, 'prompt', sinon.fake.returns({
    email: 'test+1@example.com',
  }))
  .stdout()
  .command(['register', '-e', 'test@example.com', '-p', 'abcd1234'])
  .it('gracefully handles 422 responses and continues to prompt user', ctx => {
    expect(inquirer.prompt.calledOnce).to.equal(true)
    expect(inquirer.prompt.lastArg).to.have.length(1)
    expect(inquirer.prompt.lastArg[0]).to.include({name: 'email', message: 'Please enter your email address'})
    expect(ctx.stdout).to.contain('Account created successfully!')
  })
})
