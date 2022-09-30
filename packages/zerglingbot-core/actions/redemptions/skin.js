// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {log} = require('../../util/log')
const {getRandomPercentage, getRandomFromArrayWithoutLast} = require('../../util/prng')
const {getStoredSkin, setRandomSkin, getRandomSkin, getSkinPool, searchSkinPool} = require('../../lib/winamp')

/**
 * Returns a randomly picked skin.
 */
const getSkinRandomly = async (basedir, file) => {
  const options = {regularSkins: true, genericSkins: getRandomPercentage(0.2)}

  // Pick a random skin (with the exception of the last pick) and save it to the target file.
  const stored = await getStoredSkin(file)
  const random = await getRandomSkin(stored, options, basedir)

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
  const stored = await getStoredSkin(file)
  const random = getRandomFromArrayWithoutLast(results, stored, (item, lastItem) => item.item[0] === lastItem)

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
const getResultFeedback = (result, skinObj, searchTerm) => {
  const items = []
  let hasSkinName = false

  if (result.amount != null) {
    // If there were no results, alert the user we're picking a random one instead.
    if (result.amount === 0) {
      items.push(`Found 0 search results for "${searchTerm}". Picking a random skin instead: ${skinObj.name}.`)
      hasSkinName = true
    }
    // If we found multiple results while searching for the user's search term,
    // alert the user how many results there were.
    else if (result.amount !== 1) {
      items.push(`!Found ${result.amount} search result${result.amount !== 1 ? 's' : ''} for "${searchTerm}".`)
    }
  }
  
  if (!hasSkinName) {
    items.push(`Changed Winamp skin to: ${skinObj.name}.`)
  }

  return items
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
  help: `Changes the current Winamp skin.`,
  action: async ({apiClient, eventInterface}, type, msg, config, msgObject) => {
    // Base directory in which we keep skins.
    const basedir = config.skin_base_dir
    // Path to the filename where we'll store the current skin we want.
    const file = config.skin_target_file

    const result = await getNewSkin(basedir, file, type, msg?.trim())
    const skinObj = await setRandomSkin(result.skin, basedir, file)
    const feedbackItems = getResultFeedback(result, skinObj, msg?.trim())

    eventInterface.postFeedbackItems(feedbackItems, msgObject.channelId)

    log`Updated Winamp skin to {blue ${skinObj.name}}`
  }
}

module.exports = {
  skin
}
