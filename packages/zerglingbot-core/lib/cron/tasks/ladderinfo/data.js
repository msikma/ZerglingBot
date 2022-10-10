// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {exec} = require('../../../../util/exec')

/** Exit code returned if StarCraft is not running. */
const STARCRAFT_NOT_RUNNING = 18

/**
 * Attempts to parse JSON data from a string, and returns null if it fails.
 */
const tryParse = data => {
  try {
    return JSON.parse(data)
  }
  catch (err) {
    return null
  }
}

/**
 * Runs bnetdata and returns an object with the results.
 * 
 * If StarCraft is not running, this fails silently with 'isRunning' set to false.
 */
const getPlayerData = async (playerID, binPaths) => {
  let data = {}
  try {
    data = await exec([...binPaths, '--get-player', playerID, '--nfu'], 'utf8')
  }
  catch (err) {
    return {
      success: false,
      error: data.stderr
    }
  }

  // Attempt to parse both the stdout and the stderr.
  const dataOut = tryParse(data.stdout)
  const dataErr = tryParse(data.stderr)

  const isRunning = data.code !== STARCRAFT_NOT_RUNNING

  if (!isRunning) {
    return {
      success: true,
      isRunning
    }
  }
  if (dataErr) {
    return {
      success: false,
      isRunning,
      error: dataErr.error
    }
  }
  return {
    success: true,
    isRunning,
    data: dataOut
  }
}

module.exports = {
  getPlayerData
}
