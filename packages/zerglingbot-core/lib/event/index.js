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
const createEventInterface = async ({chatClient, apiClient, config}) => {
  const state = {
    broadcasterUsername: config.app.broadcaster_username,
    botUsername: config.app.bot_username
  }

  // Ensure we have usernames and user IDs for the broadcaster and the bot account.
  state.broadcasterUser = await apiClient.users.getUserByName(state.broadcasterUsername)
  state.botUser = await apiClient.users.getUserByName(state.botUsername)

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
      return state.postToChannelID(message)
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
   */
  state.postToChannelID = (message, channelID = null) => {
    // The channel is returned as an ID. Convert it to the channel name.
    // TODO: resolve using: <https://twurple.js.org/reference/api/classes/HelixUserApi.html#getUserById>
    const channel = config.chat.channels[channelID ?? config.chat.default_channel]
    return chatClient.say(channel, message)
  }

  /**
   * Posts feedback lines to the default channel chat.
   */
  state.postFeedbackItems = (feedbackItems, channelID = null) => {
    return Promise.all(feedbackItems.map(item => state.postToChannelID(item, channelID)))
  }

  return state
}

module.exports = {
  createEventInterface
}
