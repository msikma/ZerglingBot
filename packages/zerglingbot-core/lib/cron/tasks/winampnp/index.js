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
    if (!state.lastContent[file]) state.lastContent[file] = null
    if (state.lastContent[file] === data) {
      continue
    }
    state.lastContent[file] = data
    hasChanged = true
  }
  return hasChanged
}

/**
 * Retrieves information from the Starcraft API and stores it as JSON files.
 */
const runTaskWinampNP = ({dataPath, taskConfig, paths}) => async (log) => {
  if (await haveFilesUpdated(taskConfig.data_path)) {
    await processDscData(taskConfig.data_path, taskConfig.music_path, dataPath, paths.pathFFProbe)
  }
}

module.exports = {
  taskWinampNP: {
    name: 'winampnp',
    task: runTaskWinampNP,
    delay: 250
  }
}
