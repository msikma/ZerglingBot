// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Modifiers for our internal settings to external.
 * 
 * See <https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/SpeechSynthesisProgrammingGuide/FineTuning/FineTuning.html>.
 */
const settingNormalizers = {
  rate: 180,
  volm: 1
}

/**
 * Returns a single tag with its value normalized.
 */
const getTag = (type, value = 1, rel = false) => {
  const normalizedValue = value * (settingNormalizers[type] ?? 1)
  return `[[${type} ${rel ? '+' : ''}${normalizedValue}]]`
}

/**
 * Returns a text utterance that includes all settings in the form of tags.
 */
const getUtterancePrompt = (text, settings) => {
  const header = [getTag('volm', settings.volume), getTag('rate', settings.rate), getTag('pbas', settings.pitch, true)].join('')
  return `[[rset 0]] ${header} ${text}`
}

/**
 * Parses a single voice line and returns metadata.
 * 
 * Throws an error if the voice line does not conform to the expected format.
 */
const parseVoiceLine = line => {
  // Split line into a section containing the name and language, and the example sentence.
  const [header, example] = line.split(/#\s/)
  
  // Safest way to split: by 3 characters of whitespace or more.
  const items = header.trim().split(/(\s{3,})/)
  if (items.length !== 3) {
    throw new Error(`could not parse line: "${line}", "${items}"/"${example}"`)
  }

  // Split language by main and subcategory.
  const language = items[2].trim().split(/[_-]/)

  return {
    name: items[0].trim(),
    language,
    example: example.trim()
  }
}

module.exports = {
  getUtterancePrompt,
  parseVoiceLine
}
