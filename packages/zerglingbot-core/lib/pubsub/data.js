// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Unpacks public data from PubSubRedemptionMessage objects.
 * 
 * <https://twurple.js.org/reference/pubsub/classes/PubSubRedemptionMessage.html>
 */
const unpackRedemptionData = metaObject => {
  const metaKeys = ['channelId', 'defaultImage', 'id', 'message', 'redemptionDate', 'rewardCost', 'rewardId', 'rewardImage', 'rewardIsQueued', 'rewardPrompt', 'rewardTitle', 'status', 'userDisplayName', 'userId', 'userName']

  const data = {}
  for (const key of metaKeys) {
    data[key] = metaObject[key]
  }

  return data
}

module.exports = {
  unpackRedemptionData
}
