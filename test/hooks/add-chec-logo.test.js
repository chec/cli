const {test} = require('@oclif/test')
const addChecLogo = require('../../src/hooks/add-chec-logo')
const chai = require('chai')

const {expect} = chai

describe('add-chec-logo', () => {
  test
  .stdout()
  .do(() => {
    addChecLogo({id: undefined})
  })
  .it('Shows logo when no command is provided', ctx => {
    expect(ctx.stdout).to.contain('C  $cc$  E')
  })

  test
  .stdout()
  .do(() => {
    addChecLogo({id: 'help'})
  })
  .it('Shows logo when help command is provided', ctx => {
    expect(ctx.stdout).to.contain('C  $cc$  E')
  })

  test
  .stdout()
  .do(() => {
    addChecLogo({id: 'login', argv: ['--help']})
  })
  .it('Shows logo when login command is provided with --help argument', ctx => {
    expect(ctx.stdout).to.contain('C  $cc$  E')
  })

  test
  .stdout()
  .do(() => {
    addChecLogo({id: 'login', argv: ['-h']})
  })
  .it('Shows logo when login command is provided with short -h argument', ctx => {
    expect(ctx.stdout).to.contain('C  $cc$  E')
  })

  test
  .stdout()
  .do(() => {
    addChecLogo({id: 'whoami', argv: []})
  })
  .it('Shows logo when command is provided without help arguments', ctx => {
    expect(ctx.stdout).not.to.contain('C  $cc$  E')
  })
})
