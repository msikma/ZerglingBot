// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const realm = 'np_data'

const createNpDataCachedStore = (state) => {
  const cs = state._createCachedStore({realm})

  state.npData = cs
  state.initListeners.push(cs.initListener)
}

module.exports = {
  createNpDataCachedStore
}
