// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')
const fs = require('fs').promises

/** Name of the restart file. */
const restartFile = 'restart.json'

/**
 * Returns the path to the restart file.
 */
const getRestartFilepath = (configDir) => {
  return path.join(configDir, restartFile)
}

/**
 * Reads and returns the contents of the restart file.
 * 
 * If the file does not exist or can't be read, null is returned instead.
 */
const readRestartFile = async (configDir) => {
  try {
    const data = await fs.readFile(getRestartFilepath(configDir), 'utf8')
    return JSON.parse(data)
  }
  catch {
    return null
  }
}

/**
 * Removes the restart file.
 */
const removeRestartFile = async (configDir) => {
  try {
    await fs.unlink(getRestartFilepath(configDir))
  }
  catch {
  }
  return true
}

/**
 * Checks if a restart is required.
 * 
 * Returns whether the restart is required, and if so, the date when it was requested.
 */
const checkForRestart = async (configDir) => {
  const data = await readRestartFile(configDir)
  if (data == null) return [false, null]
  if (data.date != null) return [true, new Date(data.date)]
}

module.exports = {
  removeRestartFile,
  checkForRestart
}
