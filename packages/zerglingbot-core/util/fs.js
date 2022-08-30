// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
const constants = require('fs').constants

/**
 * Ensures that a directory exists.
 */
const ensureDir = async dir => {
  return fs.mkdir(dir, {recursive: true})
}

/**
 * Returns whether a file exists or not.
 */
async function fileExists(filepath) {
  try {
    return await fs.access(filepath, constants.F_OK) == null
  }
  catch {
    return false
  }
}

module.exports = {
  ensureDir,
  fileExists
}
