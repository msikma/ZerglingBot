// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs/promises')
const path = require('path')
const {createCache} = require('./util/cache')

/**
 * Factory that creates a CachedStore (CS) generator.
 * 
 * These are used to store and load data using a persistent cache.
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
   * Creates a ListenerBroadcaster.
   */
  const createCachedStore = ({realm, file, cacheTime = 2500}) => {
    if (csState.cachedStores[realm]) {
      throw new Error(`Attempted to initialize a CachedStore that already exists: "${realm}"`)
    }

    // Path to the cache file.
    const filepath = path.join(dataPath, file)

    const state = {
      isInitialized: false,
      lastData: null,
      lastUpdate: null
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
      const oldData = await getData()
      const data = overwrite ? {...oldData, ...newData} : newData
      return fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8')
    }

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
        if (ev.action === 'storeData') {
          storeData(ev.payload, ev.overwrite ?? true)
        }
      })
    }

    const cs = {
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
