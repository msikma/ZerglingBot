// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const OBSWebSocket = require('obs-websocket-js')
const {sleep} = require('../../util/misc')
const {log, logInfo, logWarn, logError} = require('../../util/log')

/**
 * Opens websocket connection to OBS.
 * 
 * If the connection is dropped (e.g. OBS quits), this will attempt to reconnect.
 * 
 * For documentation, see: <https://github.com/obsproject/obs-websocket/blob/4.x-compat/docs/generated/protocol.md>
 */
function openObsWebsocket(address, password) {
  const obs = new OBSWebSocket()
  const state = {
    isReconnecting: false,
    isConnecting: false,
    client: obs
  }

  async function connect(reconnectLoop = false) {
    while (true) {
      // Try reconnecting continuously after the initial connection.
      if (reconnectLoop) {
        if (obs._connected) {
          await sleep(1000)
          state.isReconnecting = false
          continue
        }
        if (!state.isReconnecting) {
          logError`OBS: Lost connection - reconnecting`
          state.isReconnecting = true
        }
      }
      // Connect using our credentials; retry if it's not working.
      try {
        await obs.connect({address, password})
      }
      catch (err) {
        if (!state.isConnecting) {
          logError`OBS: Can't connect to websocket - retrying`
          if (err.code !== 'CONNECTION_ERROR') {
            logError(`OBS`, err)
          }
          state.isConnecting = true
        }
        await sleep(1000)
        continue
      }
      state.isReconnecting = false
      state.isConnecting = false
    
      const addr = address.split(':')
      logInfo`Connected to OBS via {green ${addr[0]}}:{yellow ${addr[1]}}`
    
      if (reconnectLoop) {
        continue
      }

      // If we're not in the reconnect loop, resolve.
      return obs
    }
  }

  async function init() {
    await connect()
    connect(true)
  }

  return {
    ...state,
    init
  }
}

module.exports = {
  openObsWebsocket
}
