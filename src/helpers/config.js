const fs = require('fs')
const _get = require('lodash.get')
const defaultConfigDirectory = require('os').homedir()

class Config {
  constructor(configFilename = '.checrc', configDirectory = defaultConfigDirectory) {
    this.config = null
    this.configDirectory = fs.realpathSync(configDirectory)
    this.configFilename = configFilename
  }

  /**
   * Indicates config is supported by checking that a dotfile is writable
   *
   * @return {boolean} Whether logging in is supported
   */
  supported() {
    try {
      // Check access
      fs.accessSync(this.configDirectory)
      // "Touch" the file
      fs.closeSync(fs.openSync(this.configPath(), 'a'))
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Load all the stored config
   *
   * @return {object} The stored config
   */
  load() {
    if (!this.config) {
      this.config = {}
      let file
      try {
        file = fs.readFileSync(this.configPath())
      } catch (error) {
        return {}
      }
      if (file.length === 0) {
        return this.config
      }
      try {
        this.config = JSON.parse(file)
      } catch (error) {
        // Blank out corrupted config
        fs.writeFileSync(this.configPath(), '')
      }
    }

    return this.config
  }

  /**
   * Return the saved config item for the given key
   *
   * @param {string} path The key to get. This can be given in dot/array notation
   * @returns {*} The configuration stored under the given key
   */
  get(path) {
    return _get(this.load(), path)
  }

  /**
   * Remove an item from config by providing the key of the config item
   *
   * @param {string} key The config key to remove
   * @returns {*} The config item that was removed
   */
  remove(key) {
    const {[key]: discarded, ...existing} = this.load()

    this.save(existing)

    return discarded
  }

  /**
   * Set multiple config keys by providing an object of keyed attributes
   *
   * @param {object} attributes An object with keyed attributes to save
   * @returns {object} The new saved config
   */
  set(attributes) {
    this.save({
      ...this.load(),
      ...attributes,
    })

    return this.load()
  }

  /**
   * Overwrite and save the given config
   *
   * @param {object} config The config object to save
   */
  save(config) {
    this.config = config
    fs.writeFileSync(this.configPath(), JSON.stringify(this.config))
  }

  /**
   * Get the configured path for stored config
   *
   * @returns {string} The config file path
   */
  configPath() {
    return `${this.configDirectory}${require('path').sep}${this.configFilename}`
  }

  /**
   * Clear cached config
   */
  clearCache() {
    this.config = null
  }
}

module.exports = new Config()
module.exports.makeConfig = (name, directory = defaultConfigDirectory) => new Config(name, directory)
