// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {execToJSON} = require('../../../util/exec')
const {fileExists} = require('../../../util/fs')


/**
 * Returns tag information from ffmpeg (actually ffprobe).
 */
async function getJsonFFMPEG(filename, ffprobeBin) {
  return execToJSON([ffprobeBin, `-show_format`, `-show_streams`, `-print_format`, `json`, filename])
}

/**
 * Returns tag information for a file if it exists.
 */
async function getTagsFromFFMPEG(filename, ffprobeBin) {
  if (!await fileExists(filename)) {
    return {}
  }
  return getJsonFFMPEG(filename, ffprobeBin)
}

/**
 * Returns tags extracted using ffmpeg.
 */
function getRawSongTags(filepath, ffprobeBin) {
  return getTagsFromFFMPEG(filepath, ffprobeBin)
}

module.exports = {
  getRawSongTags
}
