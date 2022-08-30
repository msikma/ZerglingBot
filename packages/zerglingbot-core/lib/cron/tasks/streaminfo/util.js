// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises

/**
 * Saves the stream info to the target file.
 */
async function saveStreamInfo(filepath, data) {
  return fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8')
}

/**
 * Retrieves previously saved data.
 * 
 * If no data is present, an empty object is returned.
 */
async function getStoredStreamInfo(filepath) {
  if (!filepath) return {}
  try {
    const data = await fs.readFile(filepath, 'utf8')
    return JSON.parse(data)
  }
  catch {
    return {}
  }
}

module.exports = {
  getStoredStreamInfo,
  saveStreamInfo
}
