// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const OBSWebSocket = require('obs-websocket-js').default
const {sleep} = require('../../util/misc')
const {makeToolLogger} = require('../../util/log')
const {getErrorString} = require('../../util/error')

// Error code for when the websocket is not found.
const OBS_WS_NOT_FOUND = 1006

/**
 * Opens websocket connection to OBS.
 * 
 * If the connection is dropped (e.g. OBS quits), this will attempt to reconnect.
 * 
 * For documentation, see: <https://github.com/obsproject/obs-websocket/blob/4.x-compat/docs/generated/protocol.md>
 */
function openObsWebsocket(credentials) {
  const {log, logInfo, logWarn, logError} = makeToolLogger('obs', null, 'green')
  const obs = new OBSWebSocket()

  const state = {
    // An object containing {address, password}.
    credentials,
    // Whether we're currently connected to OBS.
    isConnected: false,
    // What's currently happening.
    status: 'connecting',
    // Last error that occurred.
    lastError: null,
    // Promise that resolves after the initial connection is made.
    initialConnection: null,
    // Whether we've ever made the initial connection.
    hasConnectedOnce: false,
    // Amount of time to wait before reconnecting.
    throttleDuration: 1000
  }

  /** Promise placeholder, to resolve initialConnection once we've connected to OBS for the first time. */
  const firstConnectionPromise = new Promise(resolve => {
    state.initialConnection = resolve
  })

  /** Returns the current status of the connection. */
  const getStatus = () => {
    if (!state.credentials.address) {
      return {error: true, message: 'Please enter credentials to connect.', code: 'no_credentials', title: 'No credentials'}
    }
    if (state.isConnected) {
      return {error: false, code: 'connected', title: 'Connected'}
    }
    if (state.status === 'connecting') {
      return {error: false, code: 'connecting', title: 'Connecting'}
    }
    if (state.status === 'reconnecting') {
      return {error: false, code: 'reconnecting', title: 'Reconnecting'}
    }
  }

  /** Check to see if we're still connected. */
  const checkConnected = async () => {
    try {
      // To check if we're connected, do the smallest possible request.
      await obs.callBatch([{requestType: 'Sleep', requestData: {sleepMillis: 0}}])
      return true
    }
    catch (err) {
      return false
    }
  }

  async function connect() {
    log`Connecting to ${new URL(state.credentials.address).host}`
    while (true) {
      await sleep(state.throttleDuration)

      // If we're connected, check to see if the connection is still working.
      if (state.isConnected) {
        if (await checkConnected()) {
          continue
        }
        else {
          logError`Lost connection: reconnecting`
          state.isConnected = false
          state.status = 'reconnecting'
        }
      }

      try {
        await obs.connect(state.credentials.address, state.credentials.password, {rpcVersion: 1})
        state.isConnected = true
        state.status = 'connected'
        if (state.hasConnectedOnce) {
          log`Connection restored`
        }
        if (!state.hasConnectedOnce) {
          log`Connection to OBS established`
          state.hasConnectedOnce = true
          state.initialConnection()
        }
        continue
      }
      catch (err) {
        // Only log the warn if it's an error different from the regular connection error.
        // The OBS_WS_NOT_FOUND is always seen once per cycle if OBS is shut down.
        // Also, only log the error once if it doesn't change.
        if (!(err.code === OBS_WS_NOT_FOUND || String(state.lastError) === String(err))) {
          logWarn`Could not connect: '${getErrorString(err)}'`
        }
        state.isConnected = false
        state.status = 'connecting'
        state.lastError = err
        continue
      }
    }
  }

  return {
    obs,
    state,
    firstConnectionPromise,
    getStatus,
    connect
  }
}

module.exports = {
  openObsWebsocket
}
