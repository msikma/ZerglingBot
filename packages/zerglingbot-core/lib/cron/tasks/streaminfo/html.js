// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const cheerio = require('cheerio')
const fetch = require('node-fetch')

/**
 * Finds the video object in the stream's homepage.
 */
function findVideoObject($) {
  const scripts = $('script').get()
    .map(script => {
      const $script = $(script)
      const content = $script.text()
      try {
        const data = JSON.parse(content)
        if (!data) {
          return null
        }
        if (!data || data?.[0]?.['@type'] !== 'VideoObject') {
          return null
        }
        return data[0]
      }
      catch {
        return null
      }
    })
    .filter(script => script)

  return scripts?.[0]
}

/**
 * Parses the stream info for a Cheerio object of the stream's homepage.
 */
function parseStreamInfo($, username) {
  const videoObject = findVideoObject($)
  const lastUpdate = new Date()
  if (!videoObject) {
    return {
      username,
      lastUpdate,
      isLive: false
    }
  }
  return {
    username,
    lastUpdate,
    description: videoObject.description,
    displayName: videoObject.name.replace(' - Twitch', ''),
    thumbnailURL: videoObject.thumbnailUrl.slice(-1)[0],
    startDate: videoObject.publication.startDate,
    isLive: videoObject.publication.isLiveBroadcast
  }
}

/**
 * Returns stream info for a given username.
 * 
 * This retrieves the stream's homepage (e.g. "https://www.twitch.tv/username")
 * and extracts data from it.
 */
async function getStreamInfo(username) {
  const res = await fetch(`https://www.twitch.tv/${username}`)
  const html = await res.text()
  const $ = cheerio.load(html, {xmlMode: true})
  return parseStreamInfo($, username)
}

module.exports = {
  getStreamInfo
}
