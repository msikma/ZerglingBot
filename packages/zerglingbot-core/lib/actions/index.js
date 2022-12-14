// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const escapeRegex = require('escape-string-regexp')
const {unpackRedemptionData} = require('../pubsub')
const {isFunction} = require('../../util/types')
const {log} = require('../../util/log')

/**
 * Executes any relevant command triggers for a given incoming message.
 */
const executeCommandTriggers = (text, recognizedCmds, context, actionConfig, cmdChar = '!') => {
  const [trigger, remainder] = getCommandTrigger(text, cmdChar)

  const command = findCommand(trigger, recognizedCmds, actionConfig)
  if (command) {
    log`Matched command trigger: {green ${command.name}} (trigger: {red ${cmdChar}${trigger}})`
    command.action(context, sliceRemainder(command, remainder), actionConfig[command.name] ?? {}, recognizedCmds, trigger)
  }

  return [trigger !== null, trigger, command]
}

/**
 * Executes any relevant redemption triggers for a given incoming message.
 */
const executeRedemptionTriggers = (msg, recognizedRedemptions, context, actionConfig) => {
  const id = getRedemptionID(msg)

  const redemption = findRedemption(id, recognizedRedemptions)
  if (redemption) {
    log`Matched redemption trigger: {green ${redemption.name}} (type: {red ${redemption.type}})`
    redemption.action(context, redemption.type, msg.message, actionConfig[redemption.name], unpackRedemptionData(msg))
  }

  return [redemption !== null, id, redemption]
}

/**
 * Returns the redemption ID for a given mesage.
 */
const getRedemptionID = msg => {
  return msg.rewardId
}

/**
 * Slices however many arguments a command needs.
 */
const sliceRemainder = (command, remainder) => {
  // If the command only takes '*', we pass the whole remainder.
  if (command.takes === '*') {
    return {remainder}
  }

  // If an array is provided, we create a command.
  const words = remainder.split(/(\s+)/)
  const args = {remainder: null}

  for (let n = 0; n < command.takes.length; ++n) {
    const take = command.takes[n]
    const idx = n * 2
    args[take] = words[idx]
    args.remainder = words.slice(idx + 2).join('')
  }

  return args
}

/**
 * Finds a trigger in the list of recognized commands.
 */
const findRedemption = (reqID, recognizedRedemptions) => {
  for (const redemption of Object.values(recognizedRedemptions)) {
    for (const [id, type] of Object.entries(redemption.rewardIDs)) {
      if (reqID !== id) {
        continue
      }
      return {
        ...redemption,
        type
      }
    }
  }
  return null
}

/**
 * Returns all triggers for a specific command.
 */
const getCommandTriggerList = (triggers, userTrigger, actionConfig, getAllTriggers = false, getFirstOnly = false) => {
  if (isFunction(triggers)) {
    return triggers(userTrigger, actionConfig, getAllTriggers, getFirstOnly)
  }
  else {
    return getFirstOnly ? [triggers[0]] : triggers
  }
}

/**
 * Finds a trigger in the list of recognized commands.
 */
const findCommand = (trigger, recognizedCmds, actionConfig) => {
  for (const cmd of Object.values(recognizedCmds)) {
    // If this action takes a function to determine triggers, run it to get the list.
    const triggers = getCommandTriggerList(cmd.triggers, trigger, actionConfig[cmd.name])
    if (!triggers.includes(trigger)) {
      continue
    }
    return cmd
  }
  return null
}

/**
 * Returns any command word that occurs at the start of a string.
 */
const getCommandTrigger = (text, cmdChar = '!') => {
  const results = text.trim().match(new RegExp(`^(${escapeRegex(cmdChar)}.+?)(\\s|$)`))
  const trigger = results?.[1]
  return trigger ? [trigger.slice(1), text.slice(trigger.length + cmdChar.length)] : [null, '']
}

/**
 * Returns whether a message context is a reward redemption or not.
 */
const isRewardRedemption = meta => {
  return meta.isRedemption
}

module.exports = {
  getCommandTriggerList,
  executeCommandTriggers,
  executeRedemptionTriggers,
  isRewardRedemption,
  findCommand,
  getCommandTrigger
}
