// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const discord = {
  name: 'discord',
  triggers: ['discord'],
  takes: [],
  help: `Shows a link to the Discord server.`,
  action: async ({eventInterface, target}, args, actionConfig) => {
    return eventInterface.postToChannelID(`Join us on Discord: ${actionConfig.invite_link}`, true)
  }
}

module.exports = {
  discord
}
