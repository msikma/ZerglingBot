// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs/promises')
const path = require('path')
const {createCache} = require('./util/cache')

/**
 * Factory that creates a CachedStore (CS) generator.
 * 
 * These are used to store and load data using a persistent cache.
 * All changes are written in order.
 */
const createCachedStoreFactory = ({obsClient, dataPath}) => {
  const csState = {
    cachedStores: {}
  }

  /**
   * Runs the broadcast function for a given CS by name.
   */
  const broadcastCsRealmData = (realm) => {
    const cs = csState.cachedStores[realm]
    return cs.broadcastData()
  }

  /**
   * Creates a CachedStore.
   */
  const createCachedStore = ({realm, file = null, cacheTime = 2500}) => {
    if (csState.cachedStores[realm]) {
      throw new Error(`Attempted to initialize a CachedStore that already exists: "${realm}"`)
    }

    // Path to the cache file.
    const filepath = path.join(dataPath, file ? file : `${realm}.json`)

    const state = {
      isInitialized: false,
      latestData: null,
      latestUpdate: null
    }

    // Number of data updates in the queue.
    let _queueItems = []
    // Whether we're currently processing the queue.
    let _queueIsProcessing = false

    /**
     * Runs all storage updates currently in the queue.
     */
    const _processQueue = async () => {
      if (_queueIsProcessing) {
        return
      }
      while (_queueItems.length) {
        _queueIsProcessing = true
        const task = _queueItems.shift()
        await _storeQueuedData(...task)
      }
      _queueIsProcessing = false
    }

    /**
     * Queues a new storage update to be performed and triggers the queue.
     */
    const _queueUpdate = (data, overwrite) => {
      const now = Number(new Date())
      _queueItems.push([now, data, overwrite])
      _processQueue()
    }

    /**
     * Saves new data to the cache file.
     */
    const _storeQueuedData = async (now, newData, overwrite) => {
      const oldData = overwrite ? (await getData()) : {}
      const data = {...oldData, ...newData}
      state.latestData = data
      state.latestUpdate = now
      return fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8')
    }

    /**
     * Retrieves data from the cache file.
     */
    const getData = async () => {
      try {
        const data = await fs.readFile(filepath, 'utf8')
        return JSON.parse(data)
      }
      catch (err) {
        if (err.code === 'ENOENT') {
          return {}
        }
        throw err
      }
    }

    /** Runs getData() unless the existing data is still fresh. */
    const getDataCached = createCache(state, cacheTime, getData)

    /**
     * Stores new data to the cache file.
     */
    const storeData = async (newData, overwrite = true) => {
      _queueUpdate(newData, overwrite)
    }

    /**
     * Broadcasts our data.
     */
    const broadcastData = async (force = null) => {
      const data = await getDataCached(force)
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
        if (ev.action === 'storeData') {
          storeData(ev.payload, ev.overwrite ?? true)
        }
      })
    }

    const cs = {
      getData: getDataCached,
      _getData: getData,
      storeData,
      broadcastData,
      initListener
    }

    csState.cachedStores[realm] = cs
  
    return cs
  }

  return {
    broadcastCsRealmData,
    createCachedStore
  }
}

module.exports = {
  createCachedStoreFactory
}
