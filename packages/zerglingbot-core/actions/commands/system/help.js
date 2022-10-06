// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const kebabCase = require('lodash.kebabcase')
const {isFunction} = require('../../../util/types')

/**
 * Returns a usage information string for a given command object.
 */
const getUsage = cmd => {
  const mainTrigger = cmd.triggers[0]
  
  const takesWildcard = cmd.takes === '*'
  const takesNothing = Array.isArray(cmd.takes) && cmd.takes.length === 0

  const takes = takesNothing ? '' : takesWildcard ? ' [message]' : ` [${cmd.takes.map(take => kebabCase(take)).join(' ')}]`

  return `!${mainTrigger}${takes}`
}

/**
 * Converts an action's help item to a string.
 */
const getHelpString = (helpItem, context) => {
  if (isFunction(helpItem)) {
    return helpItem(context)
  }
  return helpItem.toString()
}

/**
 * Returns a help string for a specific command.
 */
const getHelp = async (cmd, context) => {
  const usage = getUsage(cmd)
  const help = cmd.help

  return `${usage}: ${await getHelpString(help, context)}`
}

/**
 * Returns a cleaned up version of the user's referenced command.
 */
const getUserCommand = commandName => {
  return commandName.trim().replace(/^!(.+?)/, '$1')
}

const help = {
  name: 'help',
  triggers: ['help', 'commands'],
  takes: ['commandName'],
  help: 'Displays a list of commands, or more info about a specific command.',
  isSystemCommand: true,
  isHidden: false,
  action: async ({eventInterface, target, config}, args, actionConfig, commands) => {
    const cmdName = getUserCommand(args.commandName)

    if (!cmdName) {
      // Display a list of all commands.
      const usableCommands = Object.values(commands).filter(cmd => cmd.isHidden !== true)
      const commandsString = usableCommands.map(cmd => getUsage(cmd)).join(', ')

      return eventInterface.postToChannelID(`Available commands: ${commandsString}`, true)
    }
    else {
      // Display info about a specific command.
      const command = commands[cmdName]
      if (!command) {
        return eventInterface.postToChannelID(`Command not found: "${cmdName}"`, true)
      }

      return eventInterface.postToChannelID(`${await getHelp(command, {config})}`, true)
    }
  }
}

module.exports = {
  help
}
