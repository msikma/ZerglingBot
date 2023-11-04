// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')
const logger = require('@d-fischer/logger')
const Discord = require('discord.js')
const {ApiClient} = require('@twurple/api')
const {RefreshingAuthProvider, exchangeCode} = require('@twurple/auth')
const {PubSubClient} = require('@twurple/pubsub')
const {ChatClient} = require('@twurple/chat')
const {createStreamInterface} = require('./lib/stream')
const {unpackMeta} = require('./lib/chat')
const {createChatTTS, pickTTSConfig} = require('./lib/tts')
const {createCronManager} = require('./lib/cron')
const {openObsWebsocket} = require('./lib/obs')
const {createDiscordLogger} = require('./lib/discord')
const {getProgramLock} = require('./util/lock')
const {getProgramData} = require('./util/program')
const {ensureDir} = require('./util/fs')
const {executeCommandTriggers, executeRedemptionTriggers, isRewardRedemption} = require('./lib/actions')
const {log, logInfo, logWarn, makeToolLogger, setDateInclusion, addExternalLogger} = require('./util/log')
const {getConfig, getToken, storeToken} = require('./util/config')
const {checkForRestart, removeRestartFile} = require('./util/restart')
const triggerCommands = require('./actions/commands')
const triggerRedemptions = require('./actions/redemptions')
const cronTasks = require('./lib/cron/tasks')

/**
 * Twitch chat bot that responds to user input.
 * 
 * Connects to the channel and starts listening for user input.
 */
function ZerglingBot({pathConfig, pathCache, pathFFMPEG, pathFFProbe, pathSay, pathNode, includeDates = false, noRemoteLogging = false} = {}) {
  const state = {
    // Reference to the OBS websocket client.
    obsSocket: null,
    obsClient: null,

    // Reference to our primary interaction interface.
    streamInterface: null,

    // Reference to the Twitch chat client.
    chatClient: null,
    chatAuthProvider: null,
    chatState: {
      hasConnectedBefore: false
    },

    // Reference to the Twitch API client.
    apiClient: null,
    apiAuthProvider: null,
    apiData: {
      user: null
    },

    // Reference to the Discord API client.
    discordClient: null,
    discordData: {
      server: null,
      logChannel: null,
      logErrorChannel: null
    },

    // Data about the bot itself.
    programData: {
    },

    // Special tools for the stream.
    streamTools: {
      chatTTS: null
    },

    // The config and cache files (in ~/.config/ and ~/.cache/).
    config: {},
    configPath: null,
    cachePath: null,

    // Paths to command line tools.
    paths: {
      pathFFMPEG: null,
      pathFFProbe: null,
      pathSay: null,
      pathNode: null
    },

    // Reference to the cron manager which handles periodic tasks.
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
    await getProgramLock(pathCache)

    // Set whether we need to include the date in log calls (when running as a daemon).
    setDateInclusion(includeDates)

    state.programData = await getProgramData()
    state.config = await getConfig(pathConfig)
    state.configPath = await ensureDir(pathConfig)
    state.cachePath = await ensureDir(pathCache)
    state.dataPath = await ensureDir(path.join(pathCache, 'data'))
    state.paths.pathFFMPEG = pathFFMPEG
    state.paths.pathFFProbe = pathFFProbe
    state.paths.pathSay = pathSay
    state.paths.pathNode = pathNode

    logInfo`Starting ZerglingBot`

    await initTwitch()
    await initDiscord()
    await initLogger()
    await initChat()
    await initOBS()
    await initInterface()
    await initPubSub()
    await initCronManager()
    await initTTS()

    state.heartbeat = setInterval(onHeartbeat, 1000)

    state.isInitialized = true
  }

  /**
   * Creates a refreshing auth provider that syncs with a local file.
   */
  async function createAuthProvider(authCode, name) {
    const appCredentials = state.config.app.credentials
    const storedToken = await getToken(state.configPath, name)

    // Check to see if we have a token already. If not, create a new one using the auth code.
    // Note that the auth code can only be used to generate a token once.
    // If it's lost, the authorization code grant flow needs to be manually redone.
    if (!storedToken.accessToken) {
      await storeToken(state.configPath, name, await exchangeCode(appCredentials.client_id, appCredentials.client_secret, authCode, appCredentials.redirect_uri))
    }

    const refreshConfig = {
      clientId: appCredentials.client_id,
      clientSecret: appCredentials.client_secret,
      onRefresh: newToken => storeToken(state.configPath, name, newToken)
    }
    const authProvider = new RefreshingAuthProvider(refreshConfig, await getToken(state.configPath, name))
    
    return authProvider
  }

  /**
   * Creates a logger tool for Twitch services.
   */
  function createLogger(name, color) {
    const toolLogger = makeToolLogger(name, null, color)
    return {
      custom: {
        log: (level, message) => {
          if (level === logger.LogLevel.INFO) {
            toolLogger.log(message)
          }
          if (level === logger.LogLevel.WARNING) {
            toolLogger.logWarn(message)
          }
          if (level <= logger.LogLevel.ERROR) {
            toolLogger.logError(message)
          }
        }
      }
    }
  }

  /**
   * Initializes the cron manager.
   * 
   * This runs periodic tasks that usually deal directly with OBS.
   */
  async function initCronManager() {
    const mgr = createCronManager(state)
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
    const obs = openObsWebsocket(obsCredentials)
    obs.connect()
    state.obsSocket = obs
    state.obsClient = obs.obs
  }

  /**
   * Initializes the TTS interface.
   */
  async function initTTS() {
    const configTTS = pickTTSConfig(state.config)
    const chatTTS = await createChatTTS(state.obsClient, state.streamInterface, {...configTTS, pathFFMPEG, pathSay})
    chatTTS.setUserBlocklist([state.config.app.bot_username])
    state.streamTools.chatTTS = chatTTS
  }

  /**
   * Initializes the Twitch API.
   */
  async function initTwitch() {
    const authProvider = await createAuthProvider(state.config.twitch.auth_code, 'api')
    const apiClient = new ApiClient({authProvider, logger: createLogger('api', 'magenta')})
    const config = state.config.twitch

    state.apiAuthProvider = authProvider
    state.apiClient = apiClient
    state.apiData.user = await apiClient.users.getUserByName(config.username)

    logInfo`Connected to Twitch API as user {green ${state.apiData.user.name}}#{yellow ${state.apiData.user.id}}`
  }

  /**
   * Initializes the Discord API.
   */
  function initDiscord() {
    const config = state.config.discord
    const discordData = state.discordData
    const discordClient = new Discord.Client({intents: [
      Discord.GatewayIntentBits.GuildEmojisAndStickers,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.GuildMessageReactions,
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.MessageContent
    ]})

    state.discordClient = discordClient

    // Use a Promise to wrap the 'ready' event.
    return new Promise(async (resolve, reject) => {
      // Try to login using our token.
      discordClient.once('ready', async () => {
        // Retrieve basic information about our environment.
        discordData.server = await discordClient.guilds.fetch(config.system.server)
        discordData.logChannel = await discordData.server.channels.fetch(config.system.log_channel)
        discordData.logErrorChannel = await discordData.server.channels.fetch(config.system.log_error_channel)
        
        logInfo`Connected to Discord API as user {green ${discordClient.user.username}}#{yellow ${discordClient.user.discriminator}}`

        return resolve()
      })

      await discordClient.login(config.credentials.token)
    })
  }

  /**
   * Initializes the external logger.
   * 
   * This sends log content to Discord.
   */
  async function initLogger() {
    if (noRemoteLogging) {
      // Don't log to Discord when testing locally (using --no-logging).
      return
    }
    const discordLogger = await createDiscordLogger(state.discordClient, state.discordData, state.config.discord, state.programData)
    await discordLogger.logStartupMessage()
    addExternalLogger(discordLogger, discordLogger.type)
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
      log`User {green ${userName}}#{yellow ${userId}} has redeemed {blue ${rewardTitle}}${message ? ': ' : ''}{red ${message ?? ''}} for {green ${rewardCost}} points`
      const [hasRedemption, id, redemption] = executeRedemptionTriggers(msg, triggerRedemptions, getActionContext(), state.config?.actions ?? {})
    })
  }

  /**
   * Connects to the chatroom and starts listening for messages.
   */
  async function initChat() {
    const authProvider = await createAuthProvider(state.config.chat.auth_code, 'chat')
    const config = state.config.chat
    const channels = Object.values(config.channels)
    const chatClient = new ChatClient({authProvider, channels, logger: createLogger('chat', 'yellow')})

    // 
    chatClient.onConnect(onChatConnected)
    chatClient.onMessage(onChatMessage)
    
    await chatClient.connect()

    state.chatAuthProvider = authProvider
    state.chatClient = chatClient
  }

  /**
   * Creates the event interface, which contains our high level code for API interaction.
   */
  async function initInterface() {
    const streamInterface = await createStreamInterface({
      chatClient: state.chatClient,
      obsClient: state.obsClient,
      discordClient: state.discordClient,
      apiClient: state.apiClient,
      dataPath: state.dataPath,
      config: state.config
    })
    state.streamInterface = streamInterface
  }

  /**
   * Unloads the bot.
   */
  async function destroy() {
    clearInterval(state.heartbeat)
    await state.chatClient.quit()
    return
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
   * Returns items for use in chat actions and redemptions.
   */
  function getActionContext() {
    return {
      chatClient: state.chatClient,
      discordClient: state.discordClient,
      streamInterface: state.streamInterface,
      apiClient: state.apiClient,
      config: state.config,
      dataPath: state.dataPath
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
   *   - meta:     metadata about the message
   */
  function onChatMessage(target, user, msg, metaObject) {
    // Ignore messages from the bot itself.
    if (state.config.chat.nickname === user) {
      return
    }

    // Unpack the metadata. This serves as the context for triggers.
    const meta = unpackMeta(metaObject)

    // Ignore messages that redeem a reward, as we handle those with the PubSub interface.
    if (isRewardRedemption(meta)) {
      return
    }
    
    // Run any command triggers that might exist in the message.
    const actionContext = {
      ...getActionContext(),
      target,
      context: meta
    }
    const [hasTrigger, trigger, command] = executeCommandTriggers(msg, triggerCommands, actionContext, state.config?.actions ?? {})
    if (hasTrigger && !command) {
      log`Attempted to use unknown trigger: {cyan !${trigger}}`
    }
  }

  /**
   * Handler that gets called once on connecting to the chatroom.
   */
  function onChatConnected() {
    logInfo`${state.chatState.hasConnectedBefore ? 'Reconnected' : 'Connected'} to Twitch chat as user {green ${state.config.chat.nickname}}`
    state.chatState.hasConnectedBefore = true
  }

  return {
    init,
    destroy
  }
}

module.exports = {
  ZerglingBot
}
