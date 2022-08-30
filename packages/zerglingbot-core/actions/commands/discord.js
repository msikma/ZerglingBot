// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const discord = {
  name: 'discord',
  triggers: ['discord'],
  takes: [],
  help: `Shows a link to the Discord server.`,
  action: async ({chatClient, target}, args, actionConfig) => {
    return chatClient.say(target, `!Join us on Discord: ${actionConfig.invite_link}`)
  }
}

module.exports = {
  discord
}
