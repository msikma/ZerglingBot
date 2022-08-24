// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/** Returns true if a piece of text is Japanese. */
const textIsJapanese = text => {
  return !!text.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/)
}

/** Returns true if a piece of text is Korean. */
const textIsKorean = text => {
  return !!text.match(/[\u3131-\uD79D]/)
}

/** Returns true if a piece of text is neither Japanese nor Korean. */
const textIsEnglish = text => {
  return !textIsJapanese(text) && !textIsKorean(text)
}

/** List of text checkers by primary language. */
const textCheckers = {
  en: textIsEnglish,
  ja: textIsJapanese,
  ko: textIsKorean
}

/** Default language, if none of the checker functions apply. */
const textDefaultLang = 'en'

/**
 * Returns the language a text is in.
 * 
 * Currently only supports 'en', 'ja' and 'ko'.
 */
const getTextLanguage = text => {
  for (const [lang, checker] of Object.entries(textCheckers)) {
    if (checker(text)) {
      return lang
    }
  }
  return textDefaultLang
}

/** Zero-pads a number. */
const zeroPad = number => {
  return String(number).padStart(2, '0')
}

/** Returns a string with the first letter in uppercase. */
const ucFirst = string => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

module.exports = {
  getTextLanguage,
  textCheckers,
  textDefaultLang,
  textIsEnglish,
  textIsJapanese,
  textIsKorean,
  ucFirst,
  zeroPad
}
