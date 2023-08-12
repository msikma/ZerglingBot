// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const pick = require('lodash.pick')

// TODO: regular import.
let BwRank = null

/** Returns a zero-padded month for a date string or object. */
const getMonth = date => String(new Date(date).getUTCMonth() + 1).padStart(2, '0')

/** Collects the data relevant for the rank file. */
const collectRankData = (data) => {
  const profile = data.profiles[data.activeProfile]
  return {
    ...pick(data, ['auroraId', 'battleTag', 'countryCode']),
    ...pick(profile, ['toon', 'toonGatewayRegion', 'rankTier', 'rankMmr', 'lastActivity', 'gameWins', 'gameLosses', 'gameDisconnects', 'leaderboardId', 'leaderboardRank'])
  }
}

/**
 * Returns match data from a player data response.
 */
const collectMatchData = (data, date = new Date()) => {
  const profile = data.profiles[data.activeProfile]
  const currentMonth = getMonth(date)
  const monthMatches = profile.latestMatches.filter(match => getMonth(match.matchTimestamp) === currentMonth)
  return Object.fromEntries(monthMatches.map(match => [new Date(match.matchTimestamp).toISOString(), match]))
}

/**
 * Runs bwdata and returns an object with the results.
 * 
 * If StarCraft is not running, this fails silently with 'isRunning' set to false.
 */
const getPlayerData = async (playerID, playerRegion) => {
  if (BwRank == null) {
    BwRank = (await import('bwrank')).default
  }
  try {
    const bwRank = await BwRank()
    const data = await bwRank.getPlayerProfiles(playerID, playerRegion)
    return {
      success: true,
      isRunning: true,
      data
    }
  }
  catch (err) {
    if (err === 'not_running') {
      return {
        success: true,
        isRunning: false
      }
    }
    else {
      return {
        success: false,
        isRunning: false,
        error: String(err)
      }
    }
  }
}

module.exports = {
  collectRankData,
  collectMatchData,
  getMonth,
  getPlayerData
}
