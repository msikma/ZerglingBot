// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
const path = require('path')
const isEqual = require('lodash.isequal')
const {collectRankData, collectMatchData, getMonth} = require('./data')
const {ensureDir} = require('../../../../util/fs')

/**
 * Retrieves previously saved data.
 * 
 * If the previous data does not exist, return an empty object.
 */
const getFileData = async (filepath) => {
  try {
    return JSON.parse(await fs.readFile(filepath, 'utf8'))
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return {}
    }
    throw err
  }
}

/**
 * Merges the new and old match data together and saves it.
 */
const mergeMatchesData = async (filepath, allData, newMatches) => {
  const oldMatches = await getFileData(filepath)
  const matchesMerged = {...oldMatches, ...newMatches}
  const newContent = Object.fromEntries(Object.entries(matchesMerged).sort((a, b) => a < b ? 1 : -1))
  const oldKeys = Object.keys(oldMatches).sort()
  const newKeys = Object.keys(newContent).sort()
  if (isEqual(oldKeys, newKeys)) {
    return
  }
  return fs.writeFile(filepath, JSON.stringify(newContent, null, 2), 'utf8')
}

/**
 * Returns the latest item from an object of timestamped keys.
 */
const getLatestItem = (data) => {
  const dates = Object.keys(data)
  if (dates.length === 0) {
    return [null, {}]
  }
  const datesSorted = dates.sort((a, b) => a < b ? 1 : -1)
  return [datesSorted[0], data[datesSorted[0]]]
}

/**
 * Merges the new and old rank data together and saves it.
 * 
 * If the rank hasn't changed since last time, the file will not be updated.
 */
const mergeRankData = async (filepath, allData, newData, fnCheck, fnUpdated) => {
  const oldData = await getFileData(filepath)
  const [latestUpdated, latestOldData] = getLatestItem(oldData)
  const newUpdated = fnUpdated(allData)
  const newValue = fnCheck(newData)
  const oldValue = fnCheck(latestOldData)

  if ((newUpdated == null) || (latestUpdated != null && (newUpdated === latestUpdated || newValue === oldValue))) {
    return
  }

  const newContent = {...oldData, [newUpdated]: newData}
  return fs.writeFile(filepath, JSON.stringify(newContent, null, 2), 'utf8')
}

/**
 * Performs the actual merging and saving of data into new history files.
 * 
 * This is used to write both the monthly history files, and the yearly history files.
 */
const writeTimestampedHistoryFiles = async (fnBase, data) => {
  const rankFn = `${fnBase}_rank.json`
  const matchesFn = `${fnBase}_matches.json`

  const rankData = collectRankData(data)
  const matchData = collectMatchData(data)

  await mergeRankData(rankFn, data, rankData, data => data?.rankMmr, data => data?.profiles[data?.activeProfile]?.lastActivity ? new Date(data.profiles[data.activeProfile].lastActivity).toISOString() : null)
  await mergeMatchesData(matchesFn, data, matchData)
}

/**
 * Writes historical data files for recordkeeping.
 */
const writeHistoryFiles = async (pathHistory, data) => {
  const date = new Date()
  const year = String(date.getUTCFullYear())
  const month = getMonth(date)
  
  const pathYear = path.join(pathHistory, year)
  // Monthly base name, e.g. 'sc_history/2023/02_'
  const fnBaseMonth = path.join(pathYear, month)
  // Yearly base name, e.g. 'sc_history/2023/2023_'
  const fnBaseYear = path.join(pathYear, year)

  await ensureDir(pathYear)
  await writeTimestampedHistoryFiles(fnBaseMonth, data)
  await writeTimestampedHistoryFiles(fnBaseYear, data)
}

module.exports = {
  writeHistoryFiles
}
