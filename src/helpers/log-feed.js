const Pusher = require('pusher-js')
const config = require('../helpers/config')

module.exports = class LogFeed {
  constructor() {
    this.socket = null
    this.channel = null
  }

  getConfiguration() {
    const credentials = config.get('notifications')

    if (!credentials) {
      throw new Error('Could not locate required credentials to subscribe to a log feed')
    }

    const {key, token} = credentials
    return {key, token}
  }

  onLog(listener) {
    this.getChannel().bind('log', ({log}) => listener(log))
  }

  getChannel() {
    if (!this.channel) {
      const {key, token} = this.getConfiguration()
      this.socket = new Pusher(key, {cluster: 'us3'})
      this.channel = this.socket.subscribe(`api.logs.${token}`)
    }

    return this.channel
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}
