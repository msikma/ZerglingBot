// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const tempy = require('tempy')
const rmfr = require('rmfr')
const fs = require('fs').promises
const path = require('path')
const {getMetadataCommand} = require('./cmd')
const {execToJSON} = require('../../util/exec')

/**
 * Uses ffmpeg to get some metadata about an utterance.
 * 
 * This, most importantly, includes the duration of the audio file.
 */
const getUtteranceMetadata = async (audioData, buffer, {pathFFProbe}) => {
  // Write the buffer to a temporary file.
  const workDir = tempy.directory()
  const filename = `audio.${audioData.type}`
  const filepath = path.join(workDir, filename)
  await fs.writeFile(filepath, buffer, null)

  // Run ffprobe on the temporary file to get its metadata.
  const [getMetaCmd] = getMetadataCommand(filename, pathFFProbe)
  const metaCmd = getMetaCmd(workDir)
  const data = await execToJSON(metaCmd[0], 'utf8')

  // Compose a return value.
  const stream = data.streams[0]
  const format = data.format
  const value = {
    format_name: format.format_name,
    format_long_name: format.format_long_name,
    duration: format.duration,
    size: format.size,
    codec_name: stream.codec_name,
    codec_long_name: stream.codec_long_name,
    codec_type: stream.codec_type,
    sample_rate: stream.sample_rate,
    channels: stream.channels,
    channel_layout: stream.channel_layout,
    tags: stream.tags
  }

  // Clean up.
  await rmfr(workDir)

  return value
}

module.exports = {
  getUtteranceMetadata
}
