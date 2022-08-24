// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const tmi = require('tmi.js')
const {ApiClient} = require('@twurple/api')
const {RefreshingAuthProvider, exchangeCode} = require('@twurple/auth')
const {PubSubClient} = require('@twurple/pubsub')
const {createChatTTS} = require('./lib/tts')
const {createCronManager} = require('./lib/cron')
const {openObsWebsocket} = require('./lib/obs')
const {getProgramLock} = require('./util/lock')
const {log, logInfo, logWarn, setDateInclusion} = require('./util/log')
const {getConfig, getToken, storeToken} = require('./util/config')
const {executeCommandTriggers, executeRedemptionTriggers, isRewardRedemption} = require('./util/actions')
const {checkForRestart, removeRestartFile} = require('./util/restart')
const triggerCommands = require('./actions/commands')
const triggerRedemptions = require('./actions/redemptions')
const cronTasks = require('./lib/cron/tasks')

/**
 * Twitch chat bot that responds to user input.
 * 
 * Connects to the channel and starts listening for user input.
 */
function ZerglingBot({pathConfig, pathFFMPEG, pathSay, includeDates = false} = {}) {
  const state = {
    // Reference to the OBS websocket client.
    obsClient: null,
    // Reference to the tmi.js client.
    chatClient: null,
    // Reference to the Twitch API client.
    apiClient: null,
    apiAuthProvider: null,
    apiData: {
      user: null
    },

    // Special tools for the stream.
    streamTools: {
      chatTTS: null
    },

    // The contents of the config file.
    config: {},
    configPath: null,

    // Paths to command line tools.
    paths: {
      pathFFMPEG: null,
      pathSay: null
    },

    // Reference to cron manager which handles periodic tasks.
    cronManager: null,

    // Interval reference used to run code periodically.
    heartbeat: null,

    // Whether the bot has successfully authenticated and connected.
    isInitialized: false
  }

  /**
   * Initializes the bot and connects to the channel.
   */
  async function init() {
    if (state.isInitialized) {
      return
    }
    
    // Ensure only one instance is running.
    await getProgramLock(pathConfig)

    // Set whether we need to include the date in log calls (when running as a daemon).
    setDateInclusion(includeDates)

    state.config = await getConfig(pathConfig)
    state.configPath = pathConfig
    state.paths.pathFFMPEG = pathFFMPEG
    state.paths.pathSay = pathSay

    await initChat()
    await initTwitch()
    await initPubSub()
    await initOBS()
    await initCronManager()
    
    state.streamTools.chatTTS = await createChatTTS(state.obsClient, state.chatClient, pathFFMPEG, pathSay)

    state.heartbeat = setInterval(onHeartbeat, 1000)

    state.isInitialized = true
  }

  /**
   * Initializes the connection to OBS.
   * 
   * If OBS is not available, this will retry until it finds it.
   */
  async function initCronManager() {
    const mgr = createCronManager(state.obsClient)
    await mgr.init(cronTasks)
    state.cronManager = mgr
  }

  /**
   * Initializes the connection to OBS.
   * 
   * If OBS is not available, this will retry until it finds it.
   */
  async function initOBS() {
    const obsCredentials = state.config.obs
    const obs = openObsWebsocket(obsCredentials.address, obsCredentials.password)
    await obs.init()
    state.obsClient = obs.client
  }

  /**
   * Initializes the Twitch API.
   */
  async function initTwitch() {
    const appCredentials = state.config.app
    const config = state.config.twitch

    const storedToken = await getToken(state.configPath)

    // Check to see if we have a token already. If not, create a new one using the auth code.
    // Note that the auth code can only be used to generate a token once.
    // If it's lost, the authorization code grant flow needs to be manually redone.
    if (!storedToken.accessToken) {
      await storeToken(state.configPath, await exchangeCode(appCredentials.client_id, appCredentials.client_secret, config.auth_code, appCredentials.redirect_uri))
    }

    const refreshConfig = {
      clientId: appCredentials.client_id,
      clientSecret: appCredentials.client_secret,
      onRefresh: newToken => storeToken(state.configPath, newToken)
    }

    const authProvider = new RefreshingAuthProvider(refreshConfig, await getToken(state.configPath))
    const apiClient = new ApiClient({authProvider})

    state.apiAuthProvider = authProvider
    state.apiClient = apiClient
    state.apiData.user = await apiClient.users.getUserByName(config.username)

    logInfo`Connected to Twitch API as user {green ${state.apiData.user.name}}#{yellow ${state.apiData.user.id}}`
  }

  /**
   * Initializes the PubSub interface and starts listening for messages.
   * 
   * See documentation: <https://twurple.js.org/reference/pubsub/classes/PubSubClient.html>
   */
  async function initPubSub() {
    const pubSubClient = new PubSubClient()
    const userListener = await pubSubClient.registerUserListener(state.apiAuthProvider)

    // Listen for reward redemptions.
    await pubSubClient.onRedemption(userListener, msg => {
      const {userName, userId, rewardTitle, message, rewardCost} = msg
      log`User {green ${userName}}#{yellow ${userId}} has redeemed {blue ${rewardTitle}}${message ? ': ' : ''}{red ${message ?? ''}} for {green ${rewardCost}} points`;
      const [hasRedemption, id, redemption] = executeRedemptionTriggers(msg, triggerRedemptions, {chatClient: state.chatClient, apiClient: state.apiClient}, state.config?.actions ?? {})
    })
  }

  /**
   * Connects to the chatroom and starts listening for messages.
   */
  async function initChat() {
    const config = state.config.chat

    state.chatClient = new tmi.client({
      identity: {
        username: config.auth_username,
        password: `oauth:${config.token.access_token}`
      },
      channels: Object.values(config.channels)
    })

    state.chatClient.on('message', onChatMessage)
    state.chatClient.on('connected', onChatConnected)
    state.chatClient.connect()

    /** Helper function for turning a channel ID into a channel name. */
    // TODO: resolve using: <https://twurple.js.org/reference/api/classes/HelixUserApi.html#getUserById>
    state.chatClient.resolveChannel = id => {
      return config.channels[id] ?? null
    }
    /** Helper function for pushing a message to the default channel. */
    state.chatClient.sayToDefaultChannel = (...args) => {
      return state.chatClient.say(Object.values(config.channels)[0], ...args)
    }

    return true
  }

  /**
   * Unloads the bot.
   */
  async function destroy() {
    clearInterval(state.heartbeat)
    return state.chatClient.disconnect()
  }

  /**
   * Runs every second.
   */
  async function onHeartbeat() {
    const [needsRestart, reqDate] = await checkForRestart(state.configPath)
    if (needsRestart) {
      await removeRestartFile(state.configPath)
      logWarn`Restart requested at: {magenta ${reqDate.toString()}}`
      await destroy()
      logWarn`Exiting program`
      // TODO: do this more gracefully.
      process.exit(0)
    }
  }

  /**
   * Handler for new incoming chat messages.
   * 
   * Takes the following information about the message:
   * 
   *   - target:   active channel, e.g. "#dada78641"
   *   - context:  object of message additional information
   *   - msg:      full message
   *   - self:     whether this is a message by the bot itself
   */
  function onChatMessage(target, context, msg, self) {
    // Ignore messages from the bot itself.
    if (self) {
      return
    }

    // Ignore messages that redeem a reward, as we handle those with the PubSub interface.
    if (isRewardRedemption(context)) {
      return
    }

    // Run any command triggers that might exist in the message.
    const [hasTrigger, trigger, command] = executeCommandTriggers(msg, triggerCommands, {chatClient: state.chatClient, apiClient: state.apiClient, target, context}, state.config?.actions ?? {})
    if (hasTrigger && !command) {
      log`Attempted to use unknown trigger: {cyan !${trigger}}`
    }
  }

  /**
   * Handler that gets called once on connecting to the chatroom.
   */
  function onChatConnected(addr, port) {
    logInfo`Connected to Twitch Chat via {green ${addr}}:{yellow ${port}}`
  }

  return {
    init,
    destroy
  }
}

module.exports = {
  ZerglingBot
}
