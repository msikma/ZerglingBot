// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getVoiceList, getEligibleVoices, pickVoice} = require('./voices')
const {getUtteranceBuffer} = require('./exec')

/**
 * Creates an utterance and returns it as buffer.
 * 
 * The return value includes two items: information about the voice used, and the buffer itself.
 */
const utterMessage = async (message, seed, binPaths, toBase64 = false) => {
  const voices = await getVoiceList()
  const eligible = getEligibleVoices(message, null, null, voices)
  const voice = pickVoice(eligible, seed, true)
  const buffer = await getUtteranceBuffer(message, voice, voice.settings, binPaths)

  return [
    voice,
    {
      type: 'opus',
      encoding: toBase64 ? 'base64' : 'binary',
      buffer: toBase64 ? buffer.toString('base64') : buffer
    }
  ]
}

module.exports = {
  utterMessage
}
