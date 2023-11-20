// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {unpackStreamData, unpackUserData} = require('../data')

const realm = 'stream_info'

const createStreamInfoListenerBroadcaster = (state) => {
  const lb = state._createListenerBroadcaster({
    realm,
    getData: async () => {
      const userObj = await state.apiClient.users.getUserByName(state.config.twitch.username)
      const user = unpackUserData(userObj)
      const streamObj = await userObj.getStream()
      const stream = unpackStreamData(streamObj)
      return {
        user,
        stream
      }
    }
  })

  state.initListeners.push(lb.initListener)
}

module.exports = {
  createStreamInfoListenerBroadcaster
}
