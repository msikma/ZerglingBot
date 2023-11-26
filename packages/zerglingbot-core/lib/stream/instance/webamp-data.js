// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const realm = 'webamp_data'

const createWebampDataCachedStore = (state) => {
  const cs = state._createCachedStore({realm})

  /** Sets a new skin. */
  cs.setSkin = skinfn => {
    return cs.storeData({skinfn})
  }

  /** Broadcasts the latest skin - used after setSkin(). */
  cs.broadcastNewSkin = () => {
    return cs.broadcastData('cache')
  }

  // todo: split off into npData
  state.webampData = cs
  state.initListeners.push(cs.initListener)
}

module.exports = {
  createWebampDataCachedStore
}
