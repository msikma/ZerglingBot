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

/**
 * Returns a simple interface for updating JSON files.
 */
const fileJsonSync = (filepath, fallbackData = {}) => {
  const readContent = async () => {
    try {
      const data = await fs.readFile(filepath, 'utf8')
      return JSON.parse(data)
    }
    catch (err) {
      // Return the fallback data if the file does not exist or isn't JSON.
      if (err.code === 'ENOENT' || err.name === 'SyntaxError') {
        return fallbackData
      }
      throw err
    }
  }
  const mergeContent = newData => {
    const data = readContent()
    return updateContent({...data, ...newData})
  }
  const updateContent = newData => {
    return fs.writeFile(filepath, JSON.stringify(newData, null, 2), 'utf8')
  }
  return {
    filepath,
    readContent,
    updateContent,
    mergeContent
  }
}

module.exports = {
  ensureDir,
  fileJsonSync,
  fileExists
}
