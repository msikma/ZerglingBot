// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
const path = require('path')

/**
 * Returns a formatted string representing a song.
 * 
 *   {
 *     "title": "Tifa's Theme (Piano Cover)",
 *     "artist": "Arkton",
 *     "year": "2007",
 *     "genre": "Video game cover",
 *     "startTime": "2022-06-19T20:39:20.000Z",
 *     "songLength": 284097,
 *     "filename": "/Users/msikma/Files/Music/Music/Game music covers/Arkton - Final Fantasy VII - Tifa's Theme (Piano Cover).m4a",
 *     "songLengthFormatted": "4:44"
 *   }
 */
const formatSong = song => {
  return `${song.artist} - ${song.title} (${song.songLengthFormatted}${song.year ? `, ${song.year}` : ''})`
}

/**
 * Returns 'now playing' data.
 */
const getNowPlaying = async (target) => {
  const content = JSON.parse(await fs.readFile(target, 'utf8'))
  const latestSong = content.songs[0]
  return {
    ...content,
    latestSong
  }
}

const song = {
  name: 'song',
  triggers: ['song', 'nowplaying'],
  takes: [],
  help: `Shows the song that's currently playing.`,
  action: async ({chatClient, eventInterface, dataPath, target}, args, actionConfig) => {
    const npFile = path.join(dataPath, 'now_playing.json')
    const np = await getNowPlaying(npFile)
    if (!np.isCurrentlyPlaying) {
      return eventInterface.postToChannelID(`Not currently playing a song.`, true)
    }
    return eventInterface.postToChannelID(`Now playing: ${formatSong(np.latestSong)}`, true)
  }
}

module.exports = {
  song
}
