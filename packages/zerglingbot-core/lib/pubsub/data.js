// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {unpackTwurpleData} = require('../../util/twurple.js')

/**
 * Unpacks public data from PubSubRedemptionMessage objects.
 * 
 * <https://twurple.js.org/reference/pubsub/classes/PubSubRedemptionMessage.html>
 */
const unpackRedemptionData = metaObject => (
  unpackTwurpleData([
    'channelId',
    'defaultImage',
    'id',
    'message',
    'redemptionDate',
    'rewardCost',
    'rewardId',
    'rewardImage',
    'rewardIsQueued',
    'rewardPrompt',
    'rewardTitle',
    'status',
    'userDisplayName',
    'userId',
    'userName'
  ], metaObject)
)

module.exports = {
  unpackRedemptionData
}
