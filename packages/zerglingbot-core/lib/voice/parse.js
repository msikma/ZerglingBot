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
  
  // Headers always contain a language code; this is either like en_US or like ar_001.
  const items = header.trim().match(/^(.+?) ([a-z]{2}_([A-Z]{2}|[0-9]{3}))$/)
  if (!items) {
    throw new Error(`could not parse line: "${line}", "${items}"/"${example}"`)
  }
  // Voice names can have language information inside quotation marks, e.g. "Reed (Portuguese (Brazil))".
  const name = items[1].trim().match(/^(.+?)(\((.+?)\))?$/)

  // Split language by main and subcategory.
  const language = items[2].trim().split(/[_-]/)

  return {
    name: name[1].trim(),
    locale: name[3] ? name[3].trim() : null,
    language,
    example: example.trim()
  }
}

module.exports = {
  getUtterancePrompt,
  parseVoiceLine
}
