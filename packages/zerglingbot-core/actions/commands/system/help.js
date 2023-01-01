// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const kebabCase = require('lodash.kebabcase')
const {isFunction} = require('../../../util/types')
const {getCommandTriggerList} = require('../../../lib/actions')

/**
 * Returns a usage information string for a given command object.
 */
const getUsage = (cmd, userTrigger, actionConfig, getOverview = false) => {
  const triggers = getCommandTriggerList(cmd.triggers, userTrigger, actionConfig, getOverview, getOverview)
  
  const takesWildcard = cmd.takes === '*'
  const takesNothing = Array.isArray(cmd.takes) && cmd.takes.length === 0

  const takes = takesNothing ? '' : takesWildcard ? ' [message]' : ` [${cmd.takes.map(take => kebabCase(take)).join(' ')}]`

  return triggers.map(trigger => `!${trigger}${takes}`)
}

/**
 * Converts an action's help item to a string.
 */
const getHelpString = (helpItem, trigger, actionConfig) => {
  if (isFunction(helpItem)) {
    return helpItem(trigger, actionConfig)
  }
  return helpItem.toString()
}

/**
 * Returns a help string for a specific command.
 */
const getHelp = async (cmd, trigger, actionConfig) => {
  const usage = getUsage(cmd, trigger, actionConfig)
  const help = cmd.help

  return `${usage}: ${await getHelpString(help, trigger, actionConfig)}`
}

/**
 * Returns a cleaned up version of the user's referenced command.
 */
const getUserCommand = commandName => {
  return commandName.trim().replace(/^!(.+?)/, '$1')
}

/**
 * Returns all triggers for a given command.
 */
const getCommandTriggers = (cmd, config) => {
  const triggers = getCommandTriggerList(cmd.triggers, null, config.actions[cmd.name], true, false)
  return triggers
}

/**
 * Returns the appropriate command that the user referred to when using !help.
 */
const getApplicableCommand = (cmdName, commands, config) => {
  for (const cmd of Object.values(commands)) {
    const triggers = getCommandTriggers(cmd, config)
    if (triggers.includes(cmdName)) {
      return cmd
    }
  }
  return commands[cmdName]
}

const help = {
  name: 'help',
  triggers: ['help', 'commands'],
  takes: ['commandName'],
  help: 'Displays a list of commands, or more info about a specific command.',
  isSystemCommand: true,
  isHidden: false,
  action: async ({eventInterface, target, config}, args, actionConfig, commands, trigger) => {
    const cmdName = getUserCommand(args.commandName)

    if (!cmdName) {
      // Display a list of all commands.
      const usableCommands = Object.values(commands).filter(cmd => cmd.isHidden !== true)
      const commandsString = usableCommands.map(cmd => getUsage(cmd, trigger, config.actions[cmd.name] || {}, true)).flat().join(', ')

      return eventInterface.postToChannelID(`Available commands: ${commandsString}`, true)
    }
    else {
      // Display info about a specific command.
      const command = getApplicableCommand(cmdName, commands, config)
      if (!command) {
        return eventInterface.postToChannelID(`Command not found: "${cmdName}"`, true)
      }

      return eventInterface.postToChannelID(`${await getHelp(command, cmdName, config.actions[command.name])}`, true)
    }
  }
}

module.exports = {
  help
}
