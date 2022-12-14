// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const markdownEscape = require('markdown-escape')

/** Default language, if none of the checker functions apply. */
const textDefaultLang = 'en'

/**
 * Detects the indentation for a single line.
 */
const detectIndent = line => {
  const ws = line.match(/^(\s+)/)
  return ws?.[1]?.length ?? 0
}

/**
 * Removes indentation from a string and then trims it.
 */
const removeIndent = str => {
  if (!str.includes('\n')) return str.trim()

  // First we must remove any lines that are just whitespace, without trimming off the initial indent.
  // We can already trim off the end of the string including linebreaks.
  const lines = str.trimEnd().split('\n')

  // Remove only the initial lines that are pure whitespace.
  let trimmedFirst = false
  const trimmedLines = lines.filter(line => {
    if (!trimmedFirst && line.trim() === '') {
      return false
    }
    trimmedFirst = true
    return true
  })
  
  // Now detect the indentation lengths.
  const lineIndents = trimmedLines.map(line => detectIndent(line))

  // We'll remove the shortest indent length from all lines.
  const indent = Math.min(...lineIndents)
  return trimmedLines.map(line => line.slice(indent)).join('\n').trimEnd()
}

/**
 * Removes extra empty lines by trimming every line, then removing the empty strings.
 * 
 * If 'leaveGap' is true, this will compress multiple empty lines down to a single empty line.
 */
const removeEmptyLines = (str, leaveGap = false) => {
  if (leaveGap) {
    const split = str.split('\n').map(l => l.trim())
    const lines = split.reduce((acc, curr) => [...acc, ...(curr === acc[acc.length - 1] ? [] : [curr])], [])
    return lines.join('\n')
  }
  else {
    return str.split('\n').map(l => l.trim()).filter(l => l !== '').join('\n')
  }
}

/**
 * Separates images from Markdown so they can be handled separately.
 */
const separateMarkdownImages = (md, leavePlaceholder = false) => {
  // Matches images, e.g.: ![alt text](https://i.imgur.com/asdf.jpg title text)
  // Or: ![alt text](https://i.imgur.com/asdf.jpg)
  const imgRe = /!\[(.+?)\]\(([^ ]+)( (.+?))?\)/g
  const images = []
  let match
  while ((match = imgRe.exec(md)) !== null) {
    images.push({ alt: match[1], url: match[2], title: match[4] })
  }
  return {
    images,
    text: removeEmptyLines(md.replace(imgRe, leavePlaceholder ? '[image]' : ''), true)
  }
}

/**
 * Cuts a long description down to a specific length, going by paragraphs.
 * Reduces the length of a description.
 */
const limitStringParagraph = (maxLength = 700, errorRatio = 100) => (desc) => {
  // Low and high end.
  const low = maxLength - errorRatio
  const high = maxLength + errorRatio

  // If str is already within tolerance, leave it.
  if (desc.length < high) {
    return desc
  }
  // Split into paragraphs, then keep removing one until we reach the tolerance point.
  // If we accidentally go too low, making a description that is too short,
  // we'll instead add a paragraph back on and cull the description with an ellipsis.
  const bits = desc.split('\n\n')
  if (bits.length === 1) {
    return limitStringSentence(maxLength)(bits[0])
  }
  let item
  while ((item = bits.pop()) != null) {
    const remainder = bits.join('\n\n')
    if (remainder.length < high && remainder.length > low) {
      // Perfect.
      return `${remainder}\n\n[...]`
    }
    if (remainder.length < high && remainder.length < low) {
      // Too small. TODO: cut off words one at a time instead?
      return `${[remainder, item].join('\n\n').substr(0, maxLength)} [...]`
    }
  }
}

/**
 * Cuts a long description down to a specific length, removing whole sentences.
 * Returns a function for a given value to cut the text down to.
 */
const limitStringSentence = (maxLength = 700) => (desc) => {
  if (desc.length < maxLength) return desc

  // Limit to our target string length.
  const limitedChars = desc.slice(0, maxLength)

  // Cut off the last line so we don't end on a half-sentence.
  const limitedLines = limitedChars
    .split('\n')
    .slice(0, -1)
    .join('\n')
    .trim()

  return `${limitedLines}\n[...]`
}

/**
 * Limits a string to a specific length. Adds ellipsis if it exceeds.
 * Returns a function for a given value to cut the string down to.
 */
const limitString = limit => str => {
  if (str.length > limit) {
    return `${str.substr(0, limit - 3)}...`
  }
  return str
}

/**
 * Prefixes a string with a bullet character.
 */
const bulletizeString = (str, {type = 'normal'} = {}) => {
  const bullets = {
    normal: '•'
  }
  return `${bullets[type]} ${str.trim()}`
}

/**
 * Prefixes an array of strings with bullet characters.
 */
const bulletizeList = (arr, {type = 'normal'} = {}) => {
  return arr.map(str => bulletizeString(str, {type})).join('\n')
}

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

/** List of text checkers by primary language. */
const textCheckers = {
  en: textIsEnglish,
  ja: textIsJapanese,
  ko: textIsKorean
}

module.exports = {
  bulletizeList,
  escapeMarkdown: markdownEscape,
  getTextLanguage,
  limitString,
  limitStringParagraph,
  limitStringSentence,
  removeEmptyLines,
  removeIndent,
  separateMarkdownImages,
  textCheckers,
  textDefaultLang,
  textIsEnglish,
  textIsJapanese,
  textIsKorean,
  ucFirst,
  zeroPad
}
