// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {createPredictionFileSync, unpackStreamData, unpackUserData, unpackOutcomeData, unpackPredictionData} = require('./data')
const {createStreamInfoListenerBroadcaster} = require('./instance/stream-info')
const {createChatterMetadataListenerBroadcaster} = require('./instance/chatter-metadata')
const {createWebampDataCachedStore} = require('./instance/webamp-data')
const {createNpDataCachedStore} = require('./instance/np-data')
const {createListenerBroadcasterFactory} = require('./factory/listener-broadcaster')
const {createCachedStoreFactory} = require('./factory/cached-store')
const {initAutoCrop} = require('./features/autocrop')
const {setAsyncInterval} = require('../../util/async')
const {getRandomFromArray} = require('../../util/prng')
const {logWarn, logError} = require('../../util/log')

// Combining Grapheme Joiner (CGJ) (U+034F)
const invisiblePrefix = '\u034F'

/**
 * Returns true if a prediction is closed, false if it's ongoing.
 */
const isClosed = predictionStatus => {
  return ['RESOLVED', 'CANCELED'].includes(predictionStatus)
}

/**
 * Returns true if a prediction has stopped taking votes and is awaiting resolution.
 */
const isLocked = predictionStatus => {
  return ['LOCKED'].includes(predictionStatus)
}

/**
 * Returns true if a prediction is actively taking votes.
 */
const isActive = predictionStatus => {
  return ['ACTIVE'].includes(predictionStatus)
}

/**
 * Creates the stream event interface.
 * 
 * This is the primary interface for higher level functions that relate to Twitch in some way.
 * All functions here do something that directly affects the Twitch interface around the stream.
 */
const createStreamInterface = async ({chatClient, apiClient, obsClient, discordClient, config, dataPath}) => {
  const state = {
    broadcasterUsername: config.app.broadcaster_username,
    botUsername: config.app.bot_username,

    // Currently running prediction.
    predictionData: {
      isInitialized: false,
      currentID: null,
      objects: {}
    },

    chatClient,
    apiClient,
    obsClient,
    discordClient,

    config,
    dataPath,

    // Public interface for various parts of the stream interface.
    webampData: null,

    // Listener functions that must be called once during startup.
    initListeners: []
  }

  // Ensure we have usernames and user IDs for the broadcaster and the bot account.
  state.broadcasterUser = await apiClient.users.getUserByName(state.broadcasterUsername)
  state.botUser = await apiClient.users.getUserByName(state.botUsername)

  // Create our data factories so we can easily communicate data with widgets.
  const {broadcastLbRealmData, createListenerBroadcaster} = createListenerBroadcasterFactory({obsClient})
  const {broadcastCsRealmData, createCachedStore} = createCachedStoreFactory({obsClient, dataPath})
  state._createListenerBroadcaster = createListenerBroadcaster
  state._createCachedStore = createCachedStore
  state.broadcastLbRealmData = broadcastLbRealmData
  state.broadcastCsRealmData = broadcastCsRealmData

  /** Stream info ListenerBroadcaster. */
  createStreamInfoListenerBroadcaster(state)
  /** Chatter metadata ListenerBroadcaster. */
  createChatterMetadataListenerBroadcaster(state)

  /** Webamp data CachedStore instance. */
  createWebampDataCachedStore(state)
  /** Now Playing data CachedStore instance. */
  createNpDataCachedStore(state)
  
  /** Auto crop functionality. */
  initAutoCrop(state)

  /**
   * Initiates the code that updates prediction status.
   */
  state._initPredictionSync = async () => {
    if (state.predictionData.isInitialized) {
      return
    }

    // Open the prediction JSON file. Ensure a copy of it exists.
    const predictionFileSync = await createPredictionFileSync(dataPath)

    // If we've not opened a prediction yet, try to see if we have one already.
    if (state.predictionData.currentID === null) {
      const currentPredictions = await apiClient.predictions.getPredictions(state.broadcasterUser.id, {limit: 1})
      const lastPrediction = currentPredictions.data[0]

      // Check if the current prediction is ongoing or not.
      state.predictionData.currentID = lastPrediction.id
      state.predictionData.objects[lastPrediction.id] = unpackPredictionData(lastPrediction)
    }

    // Start updating the status.
    const updateInterval = setAsyncInterval(async () => {
      // Skip if no prediction is currently active.
      if (state.predictionData.currentID === null) {
        return
      }

      // Retrieve the latest status.
      const cachedData = state.predictionData.objects[state.predictionData.currentID]
      const currentData = unpackPredictionData(await apiClient.predictions.getPredictionById(state.broadcasterUser.id, state.predictionData.currentID))
      predictionFileSync.setData(currentData, true)
      predictionFileSync.setCustomData(cachedData._data, true)
      await predictionFileSync.updateContent()

      if (isActive(currentData.status)) {
        updateInterval.setDelay(125)
      }
      if (isLocked(currentData.status) || isClosed(currentData.status)) {
        updateInterval.setDelay(500)
      }
      if (isClosed(currentData.status)) {
        state.predictionData.currentID = null
      }
    }, 125)

    // Listen for prediction test messages coming from the admin interface.
    obsClient.addListener('CustomEvent', async ev => {
      if (ev.realm !== 'prediction_test') return
      if (ev.action === 'start') {
        await state.makeWinLosePrediction({...(ev.data ?? {})}, 5)
      }
      if (ev.action === 'resolve') {
        await state.resolveWinLosePrediction(ev.result)
      }
    })
  }

  /**
   * Returns whether any active win/lose prediction exists to our knowledge.
   */
  state._hasActiveWinLosePrediction = () => {
    const currID = state.predictionData.currentID
    if (currID === null) {
      return [false, null]
    }
    const curr = state.predictionData.objects[currID]
    if (!curr._data.isWinLosePrediction) {
      return [false, null]
    }
    return [!isClosed(curr.status), currID]
  }

  /**
   * Cancels any active win/lose predictions.
   */
  state._cancelActivePrediction = async () => {
    const [hasActive, activeID] = state._hasActiveWinLosePrediction()
    if (!hasActive) {
      return
    }
    await apiClient.predictions.cancelPrediction(state.broadcasterUser.id, activeID)
  }

  /**
   * Creates a win/lose prediction for a StarCraft match.
   * 
   * See <https://twurple.js.org/reference/api/classes/HelixPredictionApi.html#createPrediction>.
   */
  state.makeWinLosePrediction = async (data = {}, lockSeconds = 10) => {
    // Check if an existing win/lose prediction exists. Cancel it if so.
    await state._cancelActivePrediction()

    // Create a new prediction object.
    try {
      const predictionObject = await apiClient.predictions.createPrediction(state.broadcasterUser.id, {
        autoLockAfter: lockSeconds,
        outcomes: ['Win', 'Lose'],
        title: 'WIN or LOSE?'
      })

      state.predictionData.currentID = predictionObject.id
      state.predictionData.objects[predictionObject.id] = unpackPredictionData(predictionObject, {...data, isWinLosePrediction: true})
    }
    catch (err) {
      // There's already a prediction ongoing. Silently fail.
      if (err._statusCode === 400) {
        logError('Error trying to start a win/lose prediction:', err)
      }
    }
  }

  /**
   * Resolves a win/lose prediction.
   */
  state.resolveWinLosePrediction = async (outcome) => {
    if (!['win', 'lose', 'unknown', 'none'].includes(outcome)) {
      throw new Error(`Prediction outcome invalid: "${outcome}" (must be one of win, lose, unknown, none)`)
    }
    // If the outcome is 'unknown' (e.g. the match ended in a draw due to a disconnection), do nothing.
    // We'll need to handle the outcome manually.
    if (outcome === 'unknown') {
      return
    }
    // If 'none' is the outcome, it means the match ended without a winner.
    // In this case we cancel the prediction entirely and everybody gets their points refunded.
    if (outcome === 'none') {
      return state._cancelActivePrediction()
    }
    // Note: 'win' is always the first possibility, 'lose' the second.
    const predictionID = state.predictionData.currentID
    const predictionObject = state.predictionData.objects[predictionID]
    if (isClosed(predictionObject.status)) {
      // This prediction has already been closed. Silently fail.
      return
    }
    const outcomeN = outcome === 'win' ? 0 : 1
    const outcomeObject = predictionObject.outcomes[outcomeN]
    return apiClient.predictions.resolvePrediction(state.broadcasterUser.id, predictionObject.id, outcomeObject.id)
  }

  /**
   * Retrieves chat announcements from Discord.
   * 
   * On Discord, in the #stream-announcements channel (or whatever channel configured),
   * messages in the form of "[30] here's an announcement" will be posted to the Twitch chat.
   * The number in brackets is the number of seconds we'll wait between posting it.
   */
  state.getChatAnnouncements = async () => {
    const channelID = config.discord.system.announcements_channel
    const channel = await discordClient.channels.fetch(channelID)
    const messageObjects = await channel.messages.fetch({limit: 20, cache: false})
    const messages = [...messageObjects.values()]
      .map(message => {
        try {
          const match = message.content.match(/^\[([0-9x]+)\](.+?)$/)
          const value = match[1].trim()
          const delay = value === 'x' ? null : Number(value) * 1000
          const isEnabled = delay !== null
          const content = match[2].trim()
          const created = new Date(message.createdTimestamp)
          const edited = message.editedTimestamp ? new Date(message.editedTimestamp) : null
          return {
            id: message.id,
            message: content,
            color: null,
            edited,
            timestamp: edited ?? created,
            content,
            delay,
            isEnabled
          }
        }
        catch (err) {
          logWarn('Invalid announcement chat message:', message.content)
          return null
        }
      })
      .filter(message => message)
    
    return messages
  }

  /**
   * Posts an announcement to the chat.
   * 
   * The message must be a string, and the color must be a valid Twitch announcement color
   * or 'random' or null. If it's 'random', one of the valid colors is picked,
   * and if it's null, a regular text message is sent instead of an announcement.
   */
  state.makeAnnouncement = async ({message, color}) => {
    // If we're not using a color, send a regular text message instead.
    if (color == null) {
      return state.postToChannelID(message, true)
    }

    // Ensure we're using a valid color.
    const validColors = ['blue', 'green', 'orange', 'purple', 'primary']
    let messageColor = color
    
    if (messageColor === 'random') {
      // Pick a random color.
      messageColor = getRandomFromArray(validColors)
    }
    if (!validColors.includes(messageColor)) {
      // An invalid color was passed somehow. Revert to 'primary' as fallback.
      messageColor = 'primary'
      logWarn(`Invalid announcement color:`, messageColor)
    }

    return apiClient.chat.sendAnnouncement(state.broadcasterUser, state.broadcasterUser, {message, color: messageColor})
  }

  /**
   * Posts feedback lines to the default channel chat.
   * 
   * If 'quiet' is true, an exclamation point is prepended to make the line not show up on stream.
   */
  state.postToChannelID = (message, quiet = false, channelID = null) => {
    // The channel is returned as an ID. Convert it to the channel name.
    // TODO: resolve using: <https://twurple.js.org/reference/api/classes/HelixUserApi.html#getUserById>
    const channel = config.chat.channels[channelID ?? config.chat.default_channel]
    return chatClient.say(channel, `${quiet ? `${invisiblePrefix}` : ''}${message}`)
  }

  /**
   * Posts feedback lines to the default channel chat.
   */
  state.postFeedbackItems = (feedbackItems, quiet = false, channelID = null) => {
    return Promise.all(feedbackItems.map(item => state.postToChannelID(item, quiet, channelID)))
  }

  /**
   * Initializes all listeners that broadcast data in response to a signal.
   */
  state._initBroadcastListeners = () => {
    for (const initFunction of state.initListeners) {
      initFunction()
    }
  }

  // Initialize the prediction worker.
  state._initPredictionSync()
  // Initialize all listeners that broadcast information.
  state._initBroadcastListeners()

  return state
}

module.exports = {
  createStreamInterface
}
