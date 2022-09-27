// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const voiceTypes = {
  // Novelty voices from Classic Mac OS.
  novelty: {
    voices: [
      {
        name: 'Bad News',
        altName: 'BadNews'
      },
      {
        name: 'Albert',
        settings: {volume: 1, rate: 1, pitch: 0}
      },
      'Bahh',
      {
        name: 'Bells',
        settings: {rate: 1.25}
      },
      'Boing',
      'Bubbles',
      'Deranged',
      'Cellos',
      {
        name: 'Good News',
        altName: 'GoodNews'
      },
      'Trinoids',
      'Hysterical',
      'Zarvox',
      'Whisper',
      {
        name: 'Pipe Organ',
        altName: 'Organ'
      }
    ],
    gender: 'none',
    category: 'novelty',
    settings: {volume: 1, rate: 1, pitch: 0}
  },

  // Generation 1 voices from Classic Mac OS
  genOneMale: {
    voices: [
      'Bruce',
      'Fred',
      'Junior',
      'Ralph'
    ],
    gender: 'male',
    category: 'genOne',
    settings: {volume: 1, rate: 1, pitch: 0}
  },
  genOneFemale: {
    voices: [
      'Agnes',
      'Vicki',
      'Victoria',
      'Princess',
      'Kathy'
    ],
    gender: 'female',
    category: 'genOne',
    settings: {volume: 1, rate: 1, pitch: 0}
  },

  // Generation 2 voices from modern macOS
  genTwoMale: {
    voices: [
      'Alex',
      'Tom',
      'Daniel',
      'Oliver',
      'Lee',
      'Otoya'
    ],
    gender: 'male',
    category: 'genTwo',
    settings: {volume: 0.8, rate: 1, pitch: 0}
  },
  genTwoFemale: {
    voices: [
      'Allison',
      'Ava',
      'Samantha',
      'Susan',
      'Kate',
      'Serena',
      'Tessa',
      'Fiona',
      'Moira',
      'Veena',
      'Karen',
      'Kyoko',
      'Yuna'
    ],
    gender: 'female',
    category: 'genTwo',
    settings: {volume: 0.8, rate: 1, pitch: 0}
  },
}

module.exports = voiceTypes
