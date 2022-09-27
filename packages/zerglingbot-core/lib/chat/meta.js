// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Unpacks public data from TwitchPrivateMessage and ChatUser objects.
 * 
 * <https://twurple.js.org/reference/chat/classes/TwitchPrivateMessage.html>
 * <https://twurple.js.org/reference/chat/classes/ChatUser.html>
 */
const unpackMeta = metaObject => {
  const messageKeys = ['bits', 'channelId', 'date', 'emoteOffsets', 'id', 'isCheer', 'isHighlight', 'isRedemption', 'userInfo']
  const messageMaps = ['emoteOffsets']
  const userKeys = ['badgeInfo', 'badges', 'color', 'displayName', 'isBroadcaster', 'isFounder', 'isMod', 'isSubscriber', 'isVip', 'userId', 'userName', 'userType']
  const userMaps = ['badgeInfo', 'badges']

  const data = {}
  for (const key of messageKeys) {
    data[key] = metaObject[key]
  }
  for (const key of messageMaps) {
    data[key] = Object.fromEntries(data[key])
  }
  data.userInfo = {}
  for (const key of userKeys) {
    data.userInfo[key] = metaObject.userInfo[key]
  }
  for (const key of userMaps) {
    data.userInfo[key] = Object.fromEntries(data.userInfo[key])
  }

  return data
}

module.exports = {
  unpackMeta
}
