// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {log} = require('../../util/log')
const {setChatterMetadata} = require('../../lib/data')

/**
 * Returns a race object from a message, and whether this is a valid race.
 * 
 * If the given message does not contain a valid race string,
 * the user should have their points returned.
 */
function getRaceFromMessage(msg = '') {
  if (msg == null) {
    return [null, false]
  }
  const msgTrimmed = String(msg).trim().toLowerCase()
  if (!msgTrimmed) {
    return [null, false]
  }

  if (['t', 'terran'].includes(msgTrimmed)) {
    return [{slug: 'terran', name: 'Terran'}, true]
  }
  if (['p', 'protoss'].includes(msgTrimmed)) {
    return [{slug: 'protoss', name: 'Protoss'}, true]
  }
  if (['z', 'zerg'].includes(msgTrimmed)) {
    return [{slug: 'zerg', name: 'Zerg'}, true]
  }
  if (['r', 'random'].includes(msgTrimmed)) {
    return [{slug: 'random', name: 'random'}, true]
  }
  if (['none', '-'].includes(msgTrimmed)) {
    return [{slug: 'none', name: 'none (removed badge)'}, true]
  }

  return [null, false]
}

/**
 * Redemption for changing the user's StarCraft race in the chat.
 */
const sc_race = {
  name: 'sc_race',
  rewardIDs: {
    // Set My StarCraft Race
    'a2bab21e-2abe-4bd5-8a2f-3d87d0981726': 'changeRaceInChat'
  },
  help: async ({config}) => `Sets a user's race icon in chat.`,
  action: async ({apiClient, streamInterface, dataPath}, type, msg, config, msgObject) => {
    const username = msgObject.userName
    const [race, isValid] = getRaceFromMessage(msg)
    if (!isValid) {
      await streamInterface.postToChannelID(`Could not set your StarCraft race, ${username}. Pick one of T, P, Z, Random or None.`, true)
      return log`Could not set race for {red ${username}}; value was {blue ${msg}}`
    }
    await setChatterMetadata(dataPath, username, {tags: {sc_race: race.slug}})
    await streamInterface.postToChannelID(`Updated StarCraft race for ${username} to ${race.name}.`, true)
    await streamInterface.broadcastChatterMetadata()
    log`Updated race for {red ${username}} to {blue ${race.name}}`
  }
}

module.exports = {
  sc_race
}
