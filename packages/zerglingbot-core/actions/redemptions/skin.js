// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {log} = require('../../util/log')
const {getRandomPercentage, getRandomFromArrayWithoutLast} = require('../../util/prng')
const {getRandomSkin, getSkinName, getSkinPool, searchSkinPool} = require('../../lib/winamp')

// The skin we'll use if no skin has been set at all.
const DEFAULT_SKIN = `[base-2.91.wsz`

/**
 * Returns a randomly picked skin.
 */
const getSkinRandomly = async (basedir, file) => {
  const options = {regularSkins: true, genericSkins: getRandomPercentage(0.2)}

  // Pick a random skin (with the exception of the last pick) and save it to the target file.
  const random = await getRandomSkin(file, options, basedir)

  return {
    skin: random
  }
}

/**
 * Returns a skin by searching for its term.
 */
const getSkinBySearchTerm = async (basedir, file, searchTerm) => {
  const pool = await getSkinPool({}, basedir)
  const results = searchSkinPool(pool, searchTerm)

  // If we can't find any skin by this name, return a random one.
  if (!results.length) {
    log`No Winamp skin results for term {red ${searchTerm}}`
    return {
      ...(await getSkinRandomly(basedir, file)),
      amount: 0
    }
  }

  // Pick a random skin from the list of results, except for the last pick.
  const random = getRandomFromArrayWithoutLast(results, file, (item, lastItem) => item.item[0] === lastItem)

  log`Searched Winamp skins for term {red ${searchTerm}} and found {green ${results.length}} result${results.length !== 1 ? 's' : ''} - result score: {yellow ${random.score.toFixed(1)}}`

  return {
    skin: random.item[0],
    amount: results.length
  }
}

/**
 * Returns a new skin to set Winamp to.
 * 
 * Either returns a completely random skin or searches for one by a search term.
 */
const getNewSkin = async (basedir, file, type, searchTerm) => {
  if (type === 'randomizeWinampSkin') {
    return getSkinRandomly(basedir, file)
  }
  if (type === 'pickWinampSkin') {
    return getSkinBySearchTerm(basedir, file, searchTerm)
  }
}

/**
 * Returns a feedback string to the user as a result of their redemption.
 */
const getResultFeedback = (result, skinName, searchTerm) => {
  const items = []
  let hasSkinName = false

  if (result.amount != null) {
    // If there were no results, alert the user we're picking a random one instead.
    if (result.amount === 0) {
      items.push([`Found 0 search results for "${searchTerm}". Picking a random skin instead: ${skinName}.`, false])
      hasSkinName = true
    }
    // If we found multiple results while searching for the user's search term,
    // alert the user how many results there were.
    else if (result.amount !== 1) {
      items.push([`Found ${result.amount} search result${result.amount !== 1 ? 's' : ''} for "${searchTerm}".`, true])
    }
  }
  
  if (!hasSkinName) {
    items.push([`Changed Winamp skin to: ${skinName}.`, false])
  }

  return items
}

/**
 * Returns the number of skins in the database.
 */
const getNumberOfSkins = async (basedir) => {
  const pool = await getSkinPool({}, basedir)
  return pool.length
}

/**
 * Redemption for changing the Winamp skin.
 * 
 * This gets called for both the random redemption and the search term redemption.
 */
const skin = {
  name: 'skin',
  rewardIDs: {
    // Randomize Winamp Skin
    'dbbc46cc-ba90-4e0b-b2e0-1a8b8be49fb6': 'randomizeWinampSkin',
    // Pick Winamp Skin
    '596fc4ce-c6bf-4cd2-841e-29e73681d777': 'pickWinampSkin'
  },
  help: async ({config}) => `Changes the current Winamp skin. Number of skins in the database: ${await getNumberOfSkins(config.skin_base_dir)}.`,
  action: async ({apiClient, streamInterface}, type, msg, config, msgObject) => {
    // Base directory in which we keep skins.
    const basedir = config.skin_base_dir

    // When setting a new skin, we always need to know the current skin first.
    // That way we can avoid setting the same skin that we already have.
    const currentData = await streamInterface.webampData.getData()
    const currentSkin = currentData?.skinfn ?? DEFAULT_SKIN
    
    // Find a new skin; either a fully random one, or based on the search query.
    const result = await getNewSkin(basedir, currentSkin, type, msg?.trim())
    const skinName = getSkinName(result.skin)

    // Save the skin and update the player.
    await streamInterface.webampData.setSkin(result.skin)
    await streamInterface.webampData.broadcastNewSkin()

    // Post feedback to the user who requested the change.
    for (const item of getResultFeedback(result, skinName, msg?.trim())) {
      await streamInterface.postToChannelID(item[0], item[1])
    }

    log`Updated Winamp skin to {blue ${skinName}}`
  }
}

module.exports = {
  skin
}
