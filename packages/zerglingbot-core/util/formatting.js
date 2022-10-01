// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {isPlainObject, isError} = require('./types')
const {inspectObject} = require('./inspect')

/**
 * Wraps an object in a printable Markdown code block.
 */
const wrapObject = obj => (
  wrapInJSCode(inspectObject(obj, {colorize: false}))
)

/**
 * Wraps an object for logging on Discord.
 */
const wrapForLogging = obj => {
  if (isPlainObject(obj) || isError(obj)) {
    return `\n${wrapInJSCode(inspectObject(obj, {colorize: false, compact: false}))}`
  }
  return String(obj)
}

/**
 * Wraps a string in Markdown JS code blocks.
 * 
 * Useful for posting the contents of an inspectObject() to Discord.
 */
const wrapInJSCode = str => (
  `\`\`\`js\n${str}\n\`\`\``
)

/**
 * Wraps an error stack.
 */
const wrapStack = stack => (
  `\`\`\`\n${stack}\n\`\`\``
)

/**
 * Wraps a string in a preformatted text block.
 */
const wrapInPre = str => (
  `\`\`\`\n${str}\n\`\`\``
)

/**
 * Wraps a string in a monospace block (without linebreak).
 */
const wrapInMono = str => (
  `\`${str}\``
)

module.exports = {
  wrapObject,
  wrapForLogging,
  wrapInJSCode,
  wrapStack,
  wrapInPre,
  wrapInMono
}
