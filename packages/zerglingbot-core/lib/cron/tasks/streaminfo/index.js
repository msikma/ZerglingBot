// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')
const {getStreamInfo} = require('./html')
const {getStoredStreamInfo, saveStreamInfo} = require('./util')

/** Task state. */
const state = {
  lastInfo: {}
}

/** Labels for logging data updates. */
const labels = {
  description: 'stream description',
  displayName: 'display name',
  isLive: 'live status'
}

/**
 * Scrapes the stream's information and stores it to a data file.
 */
const runTaskStreamInfo = ({dataPath, config}) => async (log) => {
  const filepath = path.join(dataPath, 'streaminfo.json')
  const oldData = await getStoredStreamInfo(filepath)
  const newData = await getStreamInfo(config.twitch.username)
  const data = {...oldData, ...newData}
  if (Object.keys(state.lastInfo).length !== 0) {
    for (const [key, label] of Object.entries(labels)) {
      if (data[key] !== state.lastInfo[key]) {
        log(`Changed ${label}:`, data[key])
      }
    }
  }
  state.lastInfo = data
  await saveStreamInfo(filepath, data)
}

module.exports = {
  taskStreamInfo: {
    name: 'streaminfo',
    task: runTaskStreamInfo,
    delay: 5000
  }
}
