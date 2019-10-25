const jsonHelper = require('../../src/helpers/json')
const chai = require('chai')

const {expect} = chai

describe('json', () => {
  describe('prettify', () => {
    it('pretty prints input json', () => {
      const inputJson = '{"foo":"bar","bar":[1,2,3]}'
      const expected = '{' +
        '\n  "foo": "bar",' +
        '\n  "bar": [' +
        '\n    1,' +
        '\n    2,' +
        '\n    3' +
        '\n  ]' +
        '\n}'

      expect(jsonHelper.prettify(inputJson)).to.equal(expected)
    })
  })
})
