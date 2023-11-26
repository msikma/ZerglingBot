// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license


const {rawDataSymbol} = require('@twurple/common')
const path = require('path')
const isEqual = require('lodash.isequal')
const {fileJsonSync} = require('../../util/fs')
const {unpackTwurpleData} = require('../../util/twurple')

/**
 * Unpacks public data from HelixPredictor objects.
 * 
 * <https://twurple.js.org/reference/api/classes/HelixPredictor.html>
 */
const unpackPredictorData = obj => (
  unpackTwurpleData([
    'channelPointsUsed',
    'channelPointsWon',
    'userDisplayName',
    'userId',
    'userName'
  ], obj)
)

/**
 * Unpacks public data from HelixStream objects.
 * 
 * <https://twurple.js.org/reference/api/classes/HelixStream.html>
 */
const unpackStreamData = obj => (
  unpackTwurpleData([
    'gameId',
    'gameName',
    'id',
    'isMature',
    'language',
    'startDate',
    'tags',
    'thumbnailUrl',
    'title',
    'type',
    'userDisplayName',
    'userId',
    'userName',
    'viewers'
  ], obj)
)

/**
 * Unpacks public data from HelixUser objects.
 * 
 * <https://twurple.js.org/reference/api/classes/HelixUser.html>
 */
const unpackUserData = obj => (
  unpackTwurpleData([
    'broadcasterType',
    'creationDate',
    'description',
    'displayName',
    'id',
    'name',
    'offlinePlaceholderUrl',
    'profilePictureUrl',
    'type'
  ], obj)
)

/**
 * Unpacks public data from HelixPredictionOutcome objects.
 * 
 * <https://twurple.js.org/reference/api/classes/HelixPredictionOutcome.html>
 */
const unpackOutcomeData = obj => {
  const metaKeys = [
    // One of "BLUE" | "PINK".
    'color',
    'id',
    'title',
    'totalChannelPoints',
    'users'
  ]
  const data = unpackTwurpleData(metaKeys, obj)

  data.topPredictors = obj.topPredictors.map(predictor => unpackPredictorData(predictor))

  return data
}

/**
 * Unpacks public data from HelixPrediction objects.
 * 
 * <https://twurple.js.org/reference/api/classes/HelixPrediction.html>
 */
const unpackPredictionData = (predictionObject, data = null) => {
  // FIXME: somehow Twurple doesn't expose the winning ID.
  // We're temporarily grabbing it from their raw data. Change when this is fixed.
  const rawData = predictionObject[rawDataSymbol]
  const winningID = rawData.winning_outcome_id
  const predictionData = {
    _data: data,
    id: predictionObject.id,
    status: predictionObject.status,
    winningID,
    creationDate: predictionObject.creationDate,
    lockDate: predictionObject.lockDate,
    endDate: predictionObject.endDate,
    outcomes: (predictionObject.outcomes ?? []).map(outcomeObject => unpackOutcomeData(outcomeObject)),
    title: predictionObject.title
  }
  if (data === null) {
    delete predictionData._data
  }
  return predictionData
}

/**
 * Creates an interface for updating the predictions file.
 * 
 * This keeps the current prediction data in sync with the JSON file that drives the interface.
 */
const createPredictionFileSync = async (pathData) => {
  const filepath = path.join(pathData, `prediction.json`)

  const fsync = fileJsonSync(filepath)
  const data = await fsync.readContent()

  /** Current prediction state. */
  const state = {
    data: {
      ...data,
      // One of "ACTIVE" | "RESOLVED" | "CANCELED" | "LOCKED" | null.
      status: data.status ?? null,
      title: null,
      creationDate: null,
      lockDate: null,
      endDate: null,
      winningID: null,
      _data: {},
      outcomes: []
    },
    latestData: {}
  }
  // Keep a copy of the previous data to 
  state.latestData = {...state.data}
  
  /** Writes current state to the file. */
  const updateContent = async (force = false) => {
    // Don't update if nothing changed.
    if (!force && isEqual(state.latestData, state.data)) {
      return
    }
    await fsync.updateContent({...state.data, lastUpdated: new Date()})
    state.latestData = {...state.data}
  }

  /** Sets an extra bit of custom data. */
  const setCustomData = (data, noUpdate = false) => {
    state.data._data = data
    if (noUpdate) return
    return updateContent()
  }

  const setData = (data, noUpdate = false) => {
    state.data = {...state.data, ...data}
    if (noUpdate) return
    return updateContent()
  }

  return {
    getState: () => state.data,
    setCustomData,
    setData,
    updateContent
  }
}

module.exports = {
  unpackUserData,
  unpackStreamData,
  unpackOutcomeData,
  unpackPredictionData,
  unpackPredictorData,
  createPredictionFileSync
}
