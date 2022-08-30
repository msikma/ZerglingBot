// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
const path = require('path')
const isEqual = require('lodash.isequal')
const {ensureDir} = require('../../../../util/fs')

/** Returns a zero-padded month for a date string or object. */
const getMonth = date => String(new Date(date).getUTCMonth() + 1).padStart(2, '0')

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
 * Returns rank data from a player data response.
 */
const filterRankData = (data) => {
  return {
    ...data.rank,
    name: data.name,
    race: data.race
  }
}

/**
 * Returns match data from a player data response.
 */
const filterMatchData = (data, date = new Date()) => {
  const currentMonth = getMonth(date)
  const monthMatches = data.matches.filter(match => getMonth(match.match.date) === currentMonth)
  return Object.fromEntries(monthMatches.map(match => [new Date(match.match.date).toISOString(), match]))
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

  if (latestUpdated != null && (newUpdated === latestUpdated || newValue === oldValue)) {
    return
  }

  const newContent = {...oldData, [newUpdated]: newData}
  return fs.writeFile(filepath, JSON.stringify(newContent, null, 2), 'utf8')
}

/**
 * Writes historical data files for recordkeeping.
 */
const writeHistoryFiles = async (pathHistory, data) => {
  const date = new Date()
  const year = String(date.getUTCFullYear())
  const month = getMonth(date)
  
  const pathYear = path.join(pathHistory, year)
  const fnBase = path.join(pathYear, month)
  const rankFn = `${fnBase}_rank.json`
  const matchesFn = `${fnBase}_matches.json`

  await ensureDir(pathYear)
  await mergeRankData(rankFn, data, filterRankData(data), data => data?.points, data => data?.updated ? new Date(data.updated).toISOString() : null)
  await mergeMatchesData(matchesFn, data, filterMatchData(data))
}

module.exports = {
  writeHistoryFiles
}
