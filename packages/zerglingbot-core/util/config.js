// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
const path = require('path')
const {ensureDir} = require('./fs')

/**
 * Returns the content of the config file.
 */
const getConfig = async configDir => {
  await ensureDir(configDir)
  const content = await fs.readFile(path.join(configDir, 'config.json'), 'utf8')
  return JSON.parse(content)
}

/**
 * Returns the content of the token file.
 * 
 * If the token file does not exist, an empty object is returned.
 */
const getToken = async (configDir, tokenName) => {
  try {
    const content = JSON.parse(await fs.readFile(path.join(configDir, `token${tokenName ? `_${tokenName}` : ''}.json`), 'utf8'))
    return content
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return {}
    }
    throw err
  }
}

/**
 * Stores the latest token to the token file.
 */
const storeToken = async (configDir, tokenName, tokenData) => {
  const token = await getToken(configDir)
  return fs.writeFile(path.join(configDir, `token${tokenName ? `_${tokenName}` : ''}.json`), JSON.stringify({...token, ...tokenData}, null, 2), 'utf8')
}

module.exports = {
  getConfig,
  getToken,
  storeToken
}
