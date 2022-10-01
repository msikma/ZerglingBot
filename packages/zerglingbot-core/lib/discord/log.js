// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const Discord = require('discord.js')
const {createMessageEmbed} = require('./embed')
const {ucFirst} = require('../../util/text')
const {isString, isNumber, isPlainObject, isError} = require('../../util/types')
const {omitEmpty} = require('../../util/data')
const {wrapForLogging} = require('../../util/formatting')
const {inspectObjectPlainText} = require('../../util/inspect')

/**
 * Log levels and their shortcut labels.
 * 
 *     color     The color used for any embed in the log message
 *     useEmbed  Forces all log text, even plaintext, to be wrapped in an embed
 *     isError   Whether the log should be sent to the error log channel instead of the regular log channel
 */
const logLevels = {
  logError: {color: '#ff034a', isError: true, useEmbed: true},
  logWarn: {color: '#ffaa02', useEmbed: true},
  logInfo: {color: '#00aff4', useEmbed: false},
  logRegular: {color: '#424555', useEmbed: false}
}

/**
 * Creates a standard Discord logger.
 * 
 * This allows us to easily pipe log content to the Discord logging channels.
 */
const createDiscordLogger = async (discordClient, discordData, config, programData) => {
  // Initialize the logger functions.
  const logFunctions = createLogFunctions({}, discordData.logChannel, discordData.logErrorChannel)

  /**
   * Logs a startup message containing the current runtime information.
   */
  const logStartupMessage = async () => {
    const embed = new Discord.EmbedBuilder()
    embed.setTitle('ZerglingBot is starting up')
    embed.setDescription(`Logged in as [${discordClient.user.username}#${discordClient.user.discriminator}](${programData.homepage}).`)
    embed.addFields({name: 'Version', value: programData.version, inline: true})
    //embed.addField('Commit', `[${hydraBot.env.envRepo.version}](${hydraBot.env.packageData.homepage})`, true)
    //embed.addField('Server', hydraBot.env.envPlatform.hostname, true)
    //embed.addField('Last commit', getFormattedDate(hydraBot.env.envRepo.lastCommit), false)
    embed.setFooter({text: programData.versionedName, iconURL: config.bot.footer_icon})
    embed.setTimestamp()
    await logFunctions.logInfo([{embeds: [embed]}], {isRaw: true})
  }
  
  /** Passes a single log object on to Discord. */
  const log = (obj) => {
    const fn = logFunctions[`log${ucFirst(obj.levelName ?? 'regular')}`] ?? logFunctions.logRegular
    const opts = {prefix: obj.prefix ?? null}
    const merged = obj.message.map(segment => wrapForLogging(segment)).join(' ').trim()
    fn([merged], {logOptions: opts})
  }

  return {
    log,
    logStartupMessage,
    logFunctions,
    type: 'discord-external'
  }
}

/**
 * Creates logging functions for Discord for a specific command (or the system).
 */
const createLogFunctions = (callerManifest, logChannel, logErrorChannel) => {
  const levelFactory = logLevelFactory(callerManifest, logChannel, logErrorChannel)
  const logFunctions = {}
  for (const [name, level] of Object.entries(logLevels)) {
    logFunctions[name] = levelFactory(level)
  }
  return logFunctions
}

/**
 * Returns whether an object is embeddable in a Discord message.
 */
const isEmbeddableObject = obj => {
  return isPlainObject(obj) || isError(obj)
}

/**
 * Returns a prefix string (used by cron tasks).
 */
const getPrefixString = prefix => {
  if (!prefix) {
    return ''
  }
  const items = []
  if (prefix.name) items.push(`${prefix.name}`)
  if (prefix.subName) items.push(`${prefix.subName}`)
  return `\`[${items.join(' ')}]\` `
}

/**
 * Turns a log segment into a string.
 */
const toLoggableString = (obj, logOptions, n) => {
  let content
  if (isString(obj) || isNumber(obj)) {
    content = obj.toString()
  }
  else {
    content = inspectObjectPlainText(obj)
  }
  return `${n === 0 ? getPrefixString(logOptions.prefix) : ''}${content}`
}

/**
 * Turns a log segment into a MessageEmbed.
 */
const toLoggableEmbed = (obj, logLevel, logOptions, callerData, isPlainString, n) => {
  const embed = createMessageEmbed(obj, logLevel, callerData, isPlainString)
  embed.setColor(logLevel.color)
  if (logOptions.prefix) {
    embed.setDescription(`${n === 0 ? getPrefixString(logOptions.prefix) : ''}${embed.data.description}`)
  }
  return embed
}

/**
 * Returns an array of object and text groupings.
 * 
 * This is done because we can only log one text message and up to 10 embeds per line,
 * so if a log call contains multiple of those we need to send multiple lines.
 * 
 * If 'useEmbeds' is true, all regular text becomes an embed.
 * 
 * Note that text always comes before an embed on Discord, so if an embeddable log segment
 * comes before a piece of text, the text is pushed to the next group.
 */
const makeMessageGroups = (logSegments, logLevel, logOptions, callerData, maxEmbeds = 10) => {
  let group = {}
  const groups = []
  const pushGroup = () => {
    if (group.content?.length > 0 || group.embeds?.length > 0) {
      groups.push(group)
    }
    group = {content: [], embeds: []}
  }

  pushGroup()

  for (let n = 0; n < logSegments.length; ++n) {
    const item = logSegments[n]
    const isEmbeddable = isEmbeddableObject(item)
    const isPlainString = isString(item)
    if (isEmbeddable || (isPlainString && logLevel.useEmbed)) {
      if (group.embeds.length > maxEmbeds) {
        pushGroup()
      }
      group.embeds.push(toLoggableEmbed(item, logLevel, logOptions, callerData, isPlainString, n))
    }
    else {
      if (group.embeds.length > 0) {
        pushGroup()
      }
      group.content.push(toLoggableString(item, logOptions, n))
    }
  }

  pushGroup()

  // Merge content strings to a single item. Remove either if they have no items.
  return groups.map(group => omitEmpty(group)).map(group => {
    if (group.content) group.content = group.content.join(' ')
    return group
  })
}

/**
 * Sets default values for a single MessageEmbed.
 */
const setLogEmbedDefaults = (logLevel, embed) => {
  if (embed.color != null) {
    return embed
  }
  embed.setColor(logLevel.color)
  return embed
}

/**
 * Sets default values for any MessageEmbeds the user wants to log to Discord.
 */
const setLogSegmentDefaults = (logLevel, message) => {
  if (!message.embeds?.length) return message
  message.embeds = message.embeds.map(embed => setLogEmbedDefaults(logLevel, embed))
  return message
}

/**
 * Generates a logging factory for Discord.
 * 
 * Once generated, the factory can then be called with a log level object to produce a logger.
 */
const logLevelFactory = (callerManifest, logChannel, logErrorChannel) => logLevel => (logSegments, {isRaw, logOptions}) => {
  const targetChannels = logLevel.isError ? [logChannel, logErrorChannel] : [logChannel]
  if (isRaw) {
    // A raw message is not processed in any way, except we do enforce a default color to any embed objects.
    // Other than this, nothing is done to the message and it's passed on directly.
    for (const logSegment of logSegments) {
      targetChannels.forEach(targetChannel => targetChannel.send(setLogSegmentDefaults(logLevel, logSegment)))
    }
  }
  else {
    // Otherwise, generate message groups based on how much we need to log, then do them one by one.
    const messageGroups = makeMessageGroups(logSegments, logLevel, logOptions, callerManifest)
    for (const group of messageGroups) {
      targetChannels.forEach(targetChannel => targetChannel.send(group))
    }
  }
}

module.exports = {
  createLogFunctions,
  createDiscordLogger,
  logLevels
}
