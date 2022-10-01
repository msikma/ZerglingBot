// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getRandomFromArray} = require('../../util/prng')
const {logWarn} = require('../../util/log')

/**
 * Creates the stream event interface.
 * 
 * This is the primary interface for higher level functions that relate to Twitch in some way.
 * All functions here do something that directly affects the Twitch interface around the stream.
 */
const createEventInterface = async ({chatClient, apiClient, discordClient, config}) => {
  const state = {
    broadcasterUsername: config.app.broadcaster_username,
    botUsername: config.app.bot_username
  }

  // Ensure we have usernames and user IDs for the broadcaster and the bot account.
  state.broadcasterUser = await apiClient.users.getUserByName(state.broadcasterUsername)
  state.botUser = await apiClient.users.getUserByName(state.botUsername)

  /**
   * Creates a win/lose prediction for a StarCraft match.
   * 
   * See <https://twurple.js.org/reference/api/classes/HelixPredictionApi.html#createPrediction>.
   */
  state.makeWinLosePrediction = async () => {

    //const b = await apiClient.predictions.getPredictions(state.broadcasterUser.id)
    const pred = await apiClient.predictions.createPrediction(state.broadcasterUser.id, {
      autoLockAfter: 10,
      outcomes: ['Win', 'Lose'],
      title: 'Win/lose prediction'
    })
    console.log('PRED', pred)
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
    return chatClient.say(channel, `${quiet ? '!' : ''}${message}`)
  }

  /**
   * Posts feedback lines to the default channel chat.
   */
  state.postFeedbackItems = (feedbackItems, channelID = null) => {
    return Promise.all(feedbackItems.map(item => state.postToChannelID(item, false, channelID)))
  }

  return state
}

module.exports = {
  createEventInterface
}
