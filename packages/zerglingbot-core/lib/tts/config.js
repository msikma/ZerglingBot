// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Returns only the parts of the config that are relevant for the TTS module.
 */
const pickTTSConfig = config => {
  const tts = config.tts
  return {
    // Whether to use only local TTS audio generation. If false, remote sources are used upon request.
    useOnlyLocal: tts.use_only_local,
    // If remote TTS generation fails, use the following voice category for local TTS generation.
    localFallbackCategory: tts.local_fallback_category,
    // For local TTS generation, use the following category (except for fallback generation).
    localCategory: tts.local_category,
    // Picks a specific voice name for remote TTS generation.
    remoteVoiceName: tts.remote_voice_name
  }
}

module.exports = {
  pickTTSConfig
}
