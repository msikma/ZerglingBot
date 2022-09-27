// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const voiceTypes = {
  // Amazon Polly
  pollyMale: {
    voices: [
      'Brian', // The famous one.
      'Russell',
      // 'Joey',
      'Justin',
      // 'Matthew'
    ],
    service: 'polly',
    gender: 'male',
    category: 'polly',
    settings: {volume: 0.8, rate: 1, pitch: 0}
  },
  pollyFemale: {
    voices: [
      'Joanna',
      'Kendra',
      'Kimberly'
    ],
    service: 'polly',
    gender: 'female',
    category: 'polly',
    settings: {volume: 0.8, rate: 1, pitch: 0}
  },
}

/**
 * These voice types can be implemented later, but they cannot be used through the StreamLabs proxy.
 */
const unusableVoiceTypes = {
  // CereProc
  cereprocNovelty: {
    voices: [
      'Demon',
      'Pixie',
      'Robot',
      'Goblin',
      'Ghost'
    ],
    service: 'cereProc',
    gender: 'none',
    category: 'cereproc',
    settings: {volume: 0.8, rate: 1, pitch: 0}
  },
  // TikTok
  tiktokNovelty: {
    voices: [
      'Rocket'
    ],
    service: 'tikTok',
    gender: 'none',
    category: 'tiktok',
    settings: {volume: 0.8, rate: 1, pitch: 0}
  },
}

module.exports = voiceTypes
