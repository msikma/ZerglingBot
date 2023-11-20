// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/** Async function that returns an empty object, used as placeholder. */
const asyncNoop = async () => ({})

/**
 * Returns a function that loads data either from cache or from the source, and updates the state.
 */
const createCache = (state, cacheTime, getData = asyncNoop) => {
  return async () => {
    const now = Number(new Date())
    if (state.lastUpdate + cacheTime > now) {
      // Use cached info if it hasn't been that long since the last update.
      return state.lastData
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
        console.log(err)
        return
      }
      state.lastData = data
      state.lastUpdate = now
      return data
    }
  }
}

module.exports = {
  createCache
}
