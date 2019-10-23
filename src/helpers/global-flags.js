const {flags} = require('@oclif/command')

module.exports = {
  domain: flags.string({
    hidden: true,
    description: 'The base URL for the Chec API',
    default: 'chec.io',
  }),
}
