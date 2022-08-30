// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')
const {find8Dot3Path} = require('./8dot3')
const {getRawSongTags} = require('./ffmpeg')
const {convertTags} = require('./tags')

/**
 * Determines the type of song, if any.
 * 
 * This is something specific to the Dada78641 setup.
 * If not needed, "generic" can be returned here instead.
 */
function getSongType(filepath) {
  const fp = path.parse(filepath)
  const segments = fp.dir.split(path.sep)

  if (segments.includes('Game music covers')) {
    return 'game_cover'
  }
  if (segments.includes('Game music')) {
    return 'game'
  }

  // Generic type; will not derive system/game data from the tags.
  return 'generic'
}

/**
 * Converts a Windows path into a Unix path.
 * 
 * If there is no candidate Unix path, this returns null.
 */
async function getRealPath(windowsPath, musicPath) {
  try {
    return await find8Dot3Path(windowsPath, musicPath, null, true)
  }
  catch (err) {
    // If we can't find the path, just return null and we'll skip this one.
    return null
  }
}

/**
 * Returns extended info for a song file.
 * 
 * This first obtains the real path of the song, and then runs ffmpeg to obtain more info.
 */
async function getExtendedInfo(windowsPath, musicPath, ffprobeBin) {
  // Get the real path by converting the Windows path.
  // This may fail because these old Windows paths don't support UTF-8.
  // If it doesn't work, we cannot get extended info.
  const realPath = await getRealPath(windowsPath, musicPath)
  if (!realPath) {
    return {}
  }

  // See if we can determine the type of song: game music, a game music cover, or a generic track.
  const songType = getSongType(realPath)

  // Extract tags from the song and convert them to a common format.
  const rawTags = await getRawSongTags(realPath, ffprobeBin)
  const songTags = convertTags(rawTags, songType)

  return {
    ...songTags,
    filename: path.basename(realPath),
    filepath: realPath
  }
}

module.exports = {
  getExtendedInfo
}
