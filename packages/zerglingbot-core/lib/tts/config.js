// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Returns only the parts of the config that are relevant for the TTS module.
 */
const pickTTSConfig = config => {
  const tts = config.tts
  return {
    useOnlyLocal: tts.use_only_local,
    localCategory: tts.local_category,
    filterTo: tts.filter_to
  }
}

module.exports = {
  pickTTSConfig
}
