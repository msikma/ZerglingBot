// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {createCache} = require('./util/cache')

/**
 * Factory that creates a ListenerBroadcaster (lb) generator.
 * 
 * ListenerBroadcasters are used by widgets so they can easily request data periodically.
 * They send a CustomEvent asking for some data, and in response this broadcasts an appropriate event.
 * 
 * Each object will listen for a CustomEvent with {action: 'requestData'} and with a given 'realm' value,
 * and then return a CustomEvent with {action: 'broadcastData'} and the 'payload' in response.
 */
const createListenerBroadcasterFactory = ({obsClient}) => {
  const lbState = {
    listenerBroadcasters: {}
  }

  /**
   * Runs the broadcast function for a given LB by name.
   */
  const broadcastLbRealmData = (realm) => {
    const lb = lbState.listenerBroadcasters[realm]
    return lb.broadcastData()
  }

  /**
   * Creates a ListenerBroadcaster.
   */
  const createListenerBroadcaster = ({realm, getData, cacheTime = 30000}) => {
    if (lbState.listenerBroadcasters[realm]) {
      throw new Error(`Attempted to initialize a ListenerBroadcaster that already exists: "${realm}"`)
    }

    const state = {
      isInitialized: false,
      latestData: null,
      latestUpdate: null
    }

    /** Runs getData() unless the existing data is still fresh. */
    const getDataCached = createCache(state, cacheTime, getData)
  
    /**
     * Broadcasts our data.
     */
    const broadcastData = async () => {
      const data = await getDataCached()
      return obsClient.call('BroadcastCustomEvent', {eventData: {realm, action: 'broadcastData', payload: data}})
    }
  
    /**
     * Listens for requests and broadcasts our data in response.
     */
    const initListener = async () => {
      if (state.isInitialized) return
      state.isInitialized = true
      obsClient.addListener('CustomEvent', async ev => {
        if (ev.realm !== realm) return
        if (ev.action === 'requestData') {
          broadcastData()
        }
      })
    }

    const lb = {
      broadcastData,
      initListener
    }

    lbState.listenerBroadcasters[realm] = lb
  
    return lb
  }

  return {
    broadcastLbRealmData,
    createListenerBroadcaster
  }
}

module.exports = {
  createListenerBroadcasterFactory
}
