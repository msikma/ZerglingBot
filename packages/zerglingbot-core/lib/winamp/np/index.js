// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')
const fs = require('fs').promises
const {getNowPlayingData} = require('./data')
const {ensureDir} = require('../../../util/fs')
const {zeroPad} = require('../../../util/text')

/**
 * Saves the new Now Playing data to a JSON file.
 */
async function saveNowPlayingData(data, outFilePath) {
  // Don't save new data is it's null - this means we don't need to update.
  if (data == null) {
    return
  }
  
  return fs.writeFile(outFilePath, JSON.stringify(data, null, 2), 'utf8')
}

/**
 * Saves historic Now Playing data.
 */
async function saveHistoricData(data, outBasedir) {
  // Don't save new data is it's null - this means we don't need to update.
  if (data == null) {
    return
  }
  
  const file = path.join(outBasedir, `${new Date().getUTCFullYear()}_${zeroPad(new Date().getUTCMonth() + 1)}_playlist.json`)
  const oldData = await getHistoricData(file)
  const newData = {...data, ...oldData}
  
  return fs.writeFile(file, JSON.stringify(newData, null, 2), 'utf8')
}

/**
 * Retrieves historic Now Playing data.
 */
async function getHistoricData(filepath) {
  try {
    const data = await JSON.parse(await fs.readFile(filepath, 'utf8'))
    return data
  }
  catch (err) {
    return {}
  }
}

/**
 * Returns existing Now Playing data.
 */
async function getExistingData(outFilePath) {
  try {
    const data = await fs.readFile(outFilePath, 'utf8')
    return JSON.parse(data)
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return {
        isCurrentlyPlaying: null,
        songs: []
      }
    }
    throw err
  }
}

/**
 * Splits off historic data if there's too much in the file.
 * 
 * Once the file gets past 50 songs, this will reduce it to 10 and split the remainder.
 */
function splitHistoricData(data, limit = 50, limitTo = 10) {
  // Do nothing unless there's 50 songs or more in the data.
  if (data.songs.length < limit) {
    return [data, null]
  }

  const newSongs = data.songs.slice(0, limitTo)
  const oldSongs = data.songs.slice(limitTo)

  return [{...data, songs: newSongs}, Object.fromEntries(oldSongs.map(song => [song.startTime, song]))]
}

/**
 * Processes all Dada Skin Changer data and stores the result to a JSON file.
 * 
 * This first obtains all information provided by Dada Skin Changer, and then processes it further.
 * The data returned includes things like ID3 tags extracted using ffmpeg.
 */
async function getDscNowPlayingData(dscPath, musicPath, outPath, outFilePath, historyPath, ffprobeBin) {
  await ensureDir(outPath)
  await ensureDir(historyPath)

  // Retrieve information about the currently playing file (and playing status).
  const [isCurrentlyPlaying, currentSong] = await getNowPlayingData(dscPath, musicPath, ffprobeBin)

  // Load up the old data so we can merge the two together.
  const oldData = await getExistingData(outFilePath)

  // If this is the same song as the last one, don't update the file.
  // That just means no new song has started playing since we last checked.
  const songChanged = oldData.songs?.[0]?.filepath !== currentSong.filepath
  const statusChanged = isCurrentlyPlaying !== oldData.isCurrentlyPlaying
  if (!songChanged && !statusChanged) {
    return [null, null]
  }
  
  // Merge the current song into the object.
  const newData = {
    ...oldData,
    isCurrentlyPlaying,
    songs: songChanged ? [{...currentSong, startTime: new Date().toISOString()}, ...oldData.songs] : oldData.songs
  }

  // Split off old songs if there's too much in the file.
  // The 'currentData' will be in the same format as 'newData' - the usual, expected data format.
  // The 'historicData' will instead be an object of only songs, with the keys indicating the start time.
  const [currentData, historicData] = splitHistoricData(newData)

  return [currentData, historicData]
}

/**
 * Processes all Dada Skin Changer data and stores the result to a JSON file.
 * 
 * If something goes wrong, this throws and simply prints the error to stdout.
 */
async function processDscData(dscPath, musicPath, outPath, ffprobeBin) {
  const outFilePath = path.join(outPath, 'now_playing.json')
  const historyPath = path.join(outPath, 'np_history')

  const [currentData, historicData] = await getDscNowPlayingData(dscPath, musicPath, outPath, outFilePath, historyPath, ffprobeBin)
  await saveNowPlayingData(currentData, outFilePath)
  await saveHistoricData(historicData, historyPath)
}

module.exports = {
  processDscData
}
