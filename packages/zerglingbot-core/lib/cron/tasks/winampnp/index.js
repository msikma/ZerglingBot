// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
const path = require('path')
const {processDscData} = require('../../../winamp/np')

/** Task state. */
const state = {
  lastContent: {}
}

/** Files we should watch for changes. */
const watchFiles = ['is_playing.txt', 'song.txt']

/** Returns file data. */
const getFileData = (filepath) => {
  return fs.readFile(filepath, 'utf8')
}

/**
 * Returns whether the files have updated (and updates the cache).
 */
const haveFilesUpdated = async (winampDataPath) => {
  let hasChanged = false
  for (const file of watchFiles) {
    const data = await getFileData(path.join(winampDataPath, file))
    let lastContent = state.lastContent[file]
    if (!lastContent) lastContent = null
    if (lastContent === data) {
      continue
    }
    lastContent = data
    hasChanged = true
  }
  return hasChanged
}

/**
 * Retrieves information from the Starcraft API and stores it as JSON files.
 */
const runTaskWinampNP = ({dataPath, taskConfig}) => async (log) => {
  if (await haveFilesUpdated(taskConfig.data_path)) {
    await processDscData(taskConfig.data_path, taskConfig.music_path, dataPath, taskConfig.bin_ffprobe)
  }
}

module.exports = {
  taskLadderInfo: {
    name: 'winampnp',
    task: runTaskWinampNP,
    delay: 250
  }
}
