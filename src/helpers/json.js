module.exports = {
  /**
   * Pretty prints the input JSON string
   *
   * @param {string} jsonString Regular JSON
   * @returns {string} Pretty JSON
   */
  prettify(jsonString) {
    return JSON.stringify(JSON.parse(jsonString), null, 2)
  },
}
