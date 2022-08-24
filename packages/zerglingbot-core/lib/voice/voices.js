// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getRandomFromArrayBySeed, getRandomFromArray} = require('../../util/prng')
const {isString} = require('../../util/types')
const {getTextLanguage} = require('../../util/text')
const {voiceTypes} = require('./voice-types')
const {getAvailableVoices} = require('./exec')

/** Removes undecorated voices from the list. */
const removeUndecorated = voices => voices.filter(voice => voice.undecorated !== true)

/**
 * Returns a voice definition object from a voice type definition.
 * 
 * A voice type definition is either just a plain string, or an object.
 * If it's a plain string, it's interpreted as the "name" value.
 */
const getVoiceDef = voiceValue => {
  if (isString(voiceValue)) {
    return {name: voiceValue, settings: {}}
  }
  return {...voiceValue, settings: voiceValue.settings ?? {}}
}

/**
 * Returns a "decorated" voice, meaning with metadata included.
 */
const getDecoratedVoice = (voice, voiceTypes) => {
  for (const [group, data] of Object.entries(voiceTypes)) {
    const baseSettings = data.settings
    for (const voiceValue of data.voices) {
      const voiceDef = getVoiceDef(voiceValue)
      const voiceSettings = {...baseSettings, ...voiceDef.settings}

      if (voiceDef.name !== voice.name) {
        continue
      }

      return {
        ...voice,
        ...voiceDef,
        group,
        gender: data.gender,
        category: data.category,
        settings: voiceSettings
      }
    }
  }

  return {
    ...voice,
    undecorated: true
  }
}

/**
 * Picks one specific voice for an utterance by seed.
 */
const pickVoice = (voices, seed, useSeed = true) => {
  if (useSeed) {
    return getRandomFromArrayBySeed(voices, seed)
  }
  return getRandomFromArray(voices)
}

/**
 * Filters the voice list to only eligible voices that can utter a given text.
 * 
 * This checks all voices for the correct language and gender.
 * 
 * If 'null' or 'undefined' is passed as gender or category, any will apply.
 */
const getEligibleVoices = (text, gender, category, voices) => {
  const lang = getTextLanguage(text)

  return voices.filter(voice => {
    const isSameLanguage = voice.language[0] === lang
    const isSameGender = gender == null || gender === voice.gender
    const isSameCategory = category == null || category === voice.category
    return isSameLanguage && isSameGender && isSameCategory
  })
}

/**
 * Returns a categorized list of available voices.
 */
const getVoiceList = async () => {
  const voices = await getAvailableVoices()
  return removeUndecorated(voices.map(voice => getDecoratedVoice(voice, voiceTypes)))
}

module.exports = {
  getVoiceList,
  getEligibleVoices,
  pickVoice
}
