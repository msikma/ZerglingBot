// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const realm = 'webamp_data'

const createWebampCachedStore = (state) => {
  const cs = state._createCachedStore({
    realm,
    file: 'webamp_data.json'
  })

  state.initListeners.push(cs.initListener)
}

module.exports = {
  createWebampCachedStore
}
