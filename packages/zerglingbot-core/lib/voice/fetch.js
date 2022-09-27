// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fetch = require('node-fetch')
const {countBytes} = require('../../util/misc')

/**
 * Returns an utterance request object.
 */
const getUtteranceReq = async (text, voice, url) => {
  return fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text, voice})
  })
}

/**
 * Downloads a remote URL and returns it as buffer.
 */
const getRemoteFile = async (url) => {
  const res = await fetch(url)
  return res.buffer()
}

/**
 * Returns an object containing the URL to an utterance file.
 * 
 * Note that only 'text' and 'voiceName' can be set here.
 */
const getRemoteUtteranceObject = async (text, voice, service, settings = {}, format = 'mp3') => {
  const bytes = countBytes(text)
  try {
    const res = await getUtteranceReq(text, voice.name, service.url)
    const json = await res.json()
    if (json.error) {
      throw json
    }
    return {
      success: !!json.success,
      url: json.speak_url,
      bytes,
      settings,
      format
    }
  }
  catch (err) {
    return {
      success: false,
      error: err?.error ?? null,
      bytes
    }
  }
}

/**
 * Fetches an utterance and returns it as buffer.
 */
const getRemoteUtteranceBuffer = async (text, voice, service, settings = {}, format = 'mp3') => {
  const utterance = await getRemoteUtteranceObject(text, voice, service, settings, format)
  if (!utterance.success) {
    throw utterance
  }
  return getRemoteFile(utterance.url)
}

module.exports = {
  getRemoteUtteranceBuffer
}
