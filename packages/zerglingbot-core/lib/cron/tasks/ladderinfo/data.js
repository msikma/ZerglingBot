// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {exec} = require('../../../../util/exec')

/** Exit code returned if StarCraft is not running. */
const STARCRAFT_NOT_RUNNING = 18

/**
 * Runs bnetdata and returns an object with the results.
 * 
 * If StarCraft is not running, this fails silently with 'isRunning' set to false.
 */
const getPlayerData = async (playerID, binPaths) => {
  let data = {}
  try {
    data = await exec([...binPaths, '--get-player', playerID], 'utf8')
  }
  catch (err) {
    return {
      success: false,
      error: data.stderr
    }
  }
  const isRunning = data.code !== STARCRAFT_NOT_RUNNING
  if (!isRunning) {
    return {
      success: true,
      isRunning
    }
  }
  return {
    success: true,
    isRunning,
    data: JSON.parse(data.stdout)
  }
}

module.exports = {
  getPlayerData
}
