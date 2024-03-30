// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/** Async function that returns an empty object, used as placeholder. */
const asyncNoop = async () => ({})

/**
 * Returns a function that loads data either from cache or from the source, and updates the state.
 */
const createCache = (state, cacheTime, getData = asyncNoop) => {
  return async (force) => {
    const now = Number(new Date())
    const forceCache = force === 'cache'
    const forceFresh = force === 'fresh'
    if ((state.latestUpdate + cacheTime > now || forceCache) && !forceFresh) {
      // Use cached info if it hasn't been that long since the last update.
      return state.latestData
    }
    else {
      // Else, get fresh data.
      let data
      try {
        data = await getData()
      }
      catch (err) {
        // TODO: log.
        // Silently fail for now.
        console.error(err)
        return
      }
      state.latestData = data
      state.latestUpdate = now
      return data
    }
  }
}

module.exports = {
  createCache
}
