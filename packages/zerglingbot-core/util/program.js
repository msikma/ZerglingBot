// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')

/** Returns the current program name. */
const progName = () => {
  return path.basename(process.argv[1])
}

/** Formats a program error string. */
const progError = (error) => {
  return `${progName()}: error: ${error}`
}

/** Exits the program with a given exit code. */
const progKill = (exitCode = 0) => {
  process.exit(exitCode)
}

module.exports = {
  progKill,
  progError,
  progName
}
