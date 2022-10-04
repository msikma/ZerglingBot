// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')

/**
 * Returns a command for converting a .wav file to a compressed format.
 */
const getConversionCommand = (fnSrc, format, bitrate, binPath = 'ffmpeg') => {
  if (format !== 'opus') {
    throw new Error(`unsupported output format: ${format}`)
  }
  const fnDst = `${path.parse(fnSrc).name}.${format}`
  const cmd = workDir => {
    const fnSrcGlobal = path.join(workDir, fnSrc)
    const fnDstGlobal = path.join(workDir, fnDst)
    return [
      [binPath, `-i`, `${fnSrcGlobal}`, `-ab`, `${bitrate}`, `${fnDstGlobal}`],
      `${fnDstGlobal}`
    ]
  }

  return [cmd, fnDst]
}

/**
 * Returns a command for obtaining metadata about an audio file.
 */
const getMetadataCommand = (fnSrc, binPath = 'ffprobe') => {
  const cmd = workDir => {
    return [
      [binPath, `-show_format`, `-show_streams`, `-print_format`, `json`, path.join(workDir, `${fnSrc}`)],
    ]
  }

  return [cmd]
}

/**
 * Returns a command for generating a .wav file of an utterance.
 */
const getUtteranceCommand = (prompt, voice, binPath = 'say') => {
  const fnDst = `utterance.wav`
  const cmd = workDir => {
    const fnDstGlobal = path.join(workDir, fnDst)
    return [
      [binPath, `--data-format=LEF32@48000`, `--voice`, `${voice}`, `-o`, `${fnDstGlobal}`, `${prompt}`],
      `${fnDstGlobal}`
    ]
  }

  return [cmd, fnDst]
}

/**
 * Returns the command for generating the voice list.
 */
const getVoicesCommand = () => {
  return ['say', '-v', '?']
}

module.exports = {
  getMetadataCommand,
  getVoicesCommand,
  getUtteranceCommand,
  getConversionCommand
}
