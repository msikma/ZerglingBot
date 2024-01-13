// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fetch = require('node-fetch')
const {countBytes} = require('../../util/misc')

// Fake user agent used to ensure our requests get honored.
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'

/**
 * Returns an utterance request object.
 */
const getUtteranceReq = async (text, voice, url) => {
  const body = new URLSearchParams({text, voice})
  return fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body
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
