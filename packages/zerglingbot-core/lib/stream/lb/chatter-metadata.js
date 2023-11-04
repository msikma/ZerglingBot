// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {readChatterMetadata} = require('../../data/metadata')

const realm = 'chatter_metadata'

const createChatterMetadataListenerBroadcaster = (state) => {
  const lb = state._createListenerBroadcaster({
    realm,
    getData: () => readChatterMetadata(state.dataPath)
  })

  state.initListeners.push(lb.initListener)
}

module.exports = {
  createChatterMetadataListenerBroadcaster
}
