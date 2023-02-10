// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
const path = require('path')

/**
 * Returns the content of the chatter metadata file.
 */
const readChatterMetadata = async (dataPath) => {
  const filepath = path.join(dataPath, `chatter_metadata.json`)
  const data = JSON.parse(await fs.readFile(filepath, 'utf8'))
  return data
}

/**
 * Writes new content to the chatter metadata file.
 */
const writeChatterMetadata = async (dataPath, fileData) => {
  const filepath = path.join(dataPath, `chatter_metadata.json`)
  return fs.writeFile(filepath, JSON.stringify(fileData, null, 2))
}

/**
 * Sets the metadata for one specific chatter.
 * 
 * This reads and writes the metadata, meaning whatever data was cached
 * will now be out of date.
 */
const setChatterMetadata = async (dataPath, username, data = {}) => {
  const oldData = await readChatterMetadata(dataPath)

  // Merge in the defaults in case this user doesn't have metadata yet.
  // Then add in whatever new data we're adding.
  const userData = {tags: {}, ...oldData.chatterMetadata[username] ?? {}}
  for (const [key, value] of Object.entries(data)) {
    userData[key] = {...userData[key] ?? {}, ...value}
  }
  userData.lastUpdated = new Date()

  // Integrate the new data with the existing data and write it.
  const newData = {
    ...oldData,
    chatterMetadata: {
      ...oldData.chatterMetadata,
      [username]: userData
    }
  }
  return writeChatterMetadata(dataPath, newData)
}

module.exports = {
  readChatterMetadata,
  writeChatterMetadata,
  setChatterMetadata
}
