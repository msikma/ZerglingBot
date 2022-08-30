// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
const path = require('path')
const {getPlayerData} = require('./data')
const {writeHistoryFiles} = require('./history')

/** Task state. */
const state = {
  lastInfo: {}
}

/** Writes the StarCraft status file. */
const writeStatusFile = (filepath, isRunning) => {
  return fs.writeFile(filepath, JSON.stringify({isRunning, lastUpdate: new Date()}, null, 2), 'utf8')
}

/** Writes the player data file. */
const writePlayerFile = (filepath, data) => {
  return fs.writeFile(filepath, JSON.stringify({...data, lastUpdate: new Date()}, null, 2), 'utf8')
}

/** Writes the rank data file. */
const writeRankFile = (filepath, data) => {
  return fs.writeFile(filepath, JSON.stringify({...data.rank, lastUpdate: new Date()}, null, 2), 'utf8')
}

/**
 * Retrieves information from the Starcraft API and stores it as JSON files.
 */
const runTaskLadderInfo = ({dataPath, taskConfig}) => async (log) => {
  // Several filenames containing various different pieces of information.
  const fileStatus = path.join(dataPath, 'sc_status.json')
  const filePlayer = path.join(dataPath, 'sc_user.json')
  const fileRank = path.join(dataPath, 'sc_rank.json')

  // Path to the historical data.
  const pathHistory = path.join(dataPath, 'sc_history')

  // Run bnetdata and retrieve the player's information.
  const res = await getPlayerData(taskConfig.player_id, taskConfig.bin_bnetdata)

  // Pass on the error if something went wrong somehow.
  if (!res.success) {
    throw new Error(`${res.error}`.trim())
  }
  
  // Write the status file (whether StarCraft is running).
  await writeStatusFile(fileStatus, res.isRunning)

  // If StarCraft is not running, just exit right after writing the status file.
  if (!res.isRunning) {
    return
  }

  if (state.lastInfo?.rank?.points !== res.data?.rank?.points) {
    log('MMR updated:', res.data.rank.points, `${res.data.rank.letter} rank (pos. ${res.data.rank.rank})`)
  }
  state.lastInfo = res.data

  // Write a file containing the full player info and one with just the rank info.
  await writePlayerFile(filePlayer, res.data)
  await writeRankFile(fileRank, res.data)

  // Now write historic data files for recordkeeping.
  await writeHistoryFiles(pathHistory, res.data)
}

module.exports = {
  taskLadderInfo: {
    name: 'ladderinfo',
    task: runTaskLadderInfo,
    delay: 5000
  }
}
