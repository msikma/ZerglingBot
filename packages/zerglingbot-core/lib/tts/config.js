// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Returns only the parts of the config that are relevant for the TTS module.
 */
const pickTTSConfig = config => {
  const tts = config.tts
  return {
    useLocal: tts.use_local,
    filterTo: tts.filter_to
  }
}

module.exports = {
  pickTTSConfig
}
