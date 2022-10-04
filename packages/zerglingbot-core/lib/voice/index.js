// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

module.exports = {
  ...require('./exec'),
  voiceTypesLocal: require('./local/voice-types'),
  voiceTypesRemote: require('./remote/voice-types'),
  ...require('./utter'),
  ...require('./meta'),
  ...require('./voices')
}
