// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/** Finds a specific trigger object by a trigger string. */
const findTrigger = (triggerItems, trigger) => triggerItems.find(item => item.triggers.includes(trigger))

const reply = {
  name: 'reply',
  triggers: (userTrigger, actionConfig, getAllTriggers = false, getFirstOnly = false) => {
    if (getAllTriggers) {
      // Return all triggers (potentially just the first one, if using !help).
      return (actionConfig?.triggers ?? []).map(item => getFirstOnly ? item?.triggers[0] : item?.triggers).flat().filter(item => item)
    }
    const trigger = findTrigger(actionConfig?.triggers ?? [], userTrigger)
    return trigger?.triggers ?? []
  },
  takes: [],
  help: (userTrigger, actionConfig) => {
    const trigger = findTrigger(actionConfig?.triggers ?? [], userTrigger)
    return trigger?.help ?? 'No help found.'
  },
  action: async ({eventInterface, target}, args, actionConfig, commands, userTrigger) => {
    const trigger = findTrigger(actionConfig.triggers, userTrigger)
    return eventInterface.postToChannelID(`${trigger.reply}`, true)
  }
}

module.exports = {
  reply
}
