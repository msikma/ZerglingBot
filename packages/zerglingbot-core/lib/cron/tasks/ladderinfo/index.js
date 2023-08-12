// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
const path = require('path')
const {getPlayerData, collectRankData} = require('./data')
const {writeHistoryFiles} = require('./history')

/** Task state. */
const state = {
  lastInfo: {},
  lastUpdate: null,
  // sc_status.json
  status: {},
  // sc_user.json
  player: {},
  // sc_rank.json
  rank: {}
}

/** Writes the StarCraft status file. */
const writeStatusFile = (filepath) => {
  return fs.writeFile(filepath, JSON.stringify({...state.status, lastUpdate: state.lastUpdate}, null, 2), 'utf8')
}

/** Writes the player data file. */
const writePlayerFile = (filepath) => {
  return fs.writeFile(filepath, JSON.stringify({...state.player, lastUpdate: state.lastUpdate}, null, 2), 'utf8')
}

/** Writes the rank data file. */
const writeRankFile = (filepath) => {
  return fs.writeFile(filepath, JSON.stringify({...state.rank, lastUpdate: state.lastUpdate}, null, 2), 'utf8')
}

/** Saves data to the state; this data can be stored to a file directly. */
const collectData = (success, data, isRunning) => {
  const lastUpdate = new Date()

  state.lastUpdate = lastUpdate
  state.status = {isRunning}
  if (data && success) {
    state.player = {...data}
    state.rank = collectRankData(data)
  }
}

/**
 * Retrieves information from the Starcraft API and stores it as JSON files.
 */
const runTaskLadderInfo = ({dataPath, paths, taskConfig, obsClient}) => async (log) => {
  // TODO: make this configurable. Task always fails once while starting/stopping SC.
  const silentlyFail = true
  
  // Several filenames containing various different pieces of information.
  const fileStatus = path.join(dataPath, 'sc_status.json')
  const filePlayer = path.join(dataPath, 'sc_user.json')
  const fileRank = path.join(dataPath, 'sc_rank.json')

  // Path to the historical data.
  const pathHistory = path.join(dataPath, 'sc_history')

  // Run bnetdata and retrieve the player's information.
  const res = await getPlayerData(taskConfig.player_id, taskConfig.player_region)

  // Store all information to the current state.
  collectData(res.success, res.data ?? {}, res.isRunning)
  
  // Write the status file (whether StarCraft is running).
  await writeStatusFile(fileStatus)

  // Pass on the error if something went wrong somehow.
  if (!res.success) {
    // TODO
    if (silentlyFail) {
      return
    }
    throw new Error(`${message}`.trim())
  }

  // If StarCraft is not running, just exit right after writing the status file.
  if (!res.isRunning) {
    return
  }

  if (state.lastInfo?.rank?.rankMmr !== res.data?.rank?.rankMmr) {
    log('MMR updated:', res.data.rank.rankMmr, `${res.data.rank.rankTier} rank (pos. ${res.data.rank.leaderboardRank})`)
  }
  state.lastInfo = res.data

  // Omit writing files if there was no data (e.g. when StarCraft was closing down during the call).
  if (res.data === null) {
    return
  }

  // Write a file containing the full player info and one with just the rank info.
  await writePlayerFile(filePlayer)
  await writeRankFile(fileRank)

  // Write historic data files for recordkeeping.
  await writeHistoryFiles(pathHistory, res.data)
}

module.exports = {
  taskLadderInfo: {
    name: 'ladderinfo',
    task: runTaskLadderInfo,
    delay: 5000
  }
}
