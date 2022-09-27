// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getVoiceList, getEligibleVoices, pickVoice} = require('./voices')
const {getRemoteUtteranceBuffer} = require('./fetch')
const {getUtteranceBuffer} = require('./exec')

/**
 * Creates an utterance and returns it as buffer.
 * 
 * The return value includes two items: information about the voice used, and the buffer itself.
 * 
 * If a remote voice is requested, the local voice will be returned if there's an issue.
 */
const utterMessage = async (message, seed, options) => {
  if (options.useLocal) {
    return utterMessageLocal(message, seed, options)
  }
  try {
    const utterance = await utterMessageRemote(message, seed, options)
    return utterance
  }
  catch {
    return utterMessageLocal(message, seed, options)
  }
}

/**
 * Creates an utterance remotely.
 */
const utterMessageRemote = async (message, seed, options) => {
  const voices = await getVoiceList(options)
  const eligible = getEligibleVoices(message, null, null, voices)
  const voice = pickVoice(eligible, seed, true)
  const buffer = await getRemoteUtteranceBuffer(message, voice, voice.service, voice.settings)

  return [
    voice,
    {
      type: 'mp3',
      encoding: options.toBase64 ? 'base64' : 'binary',
      buffer: options.toBase64 ? buffer.toString('base64') : buffer
    }
  ]
}

/**
 * Creates an utterance locally.
 */
const utterMessageLocal = async (message, seed, options) => {
  const voices = await getVoiceList(options)
  const eligible = getEligibleVoices(message, null, null, voices)
  const voice = pickVoice(eligible, seed, true)
  const buffer = await getUtteranceBuffer(message, voice, voice.settings, options.binPaths)

  return [
    voice,
    {
      type: 'opus',
      encoding: options.toBase64 ? 'base64' : 'binary',
      buffer: options.toBase64 ? buffer.toString('base64') : buffer
    }
  ]
}

module.exports = {
  utterMessage
}
