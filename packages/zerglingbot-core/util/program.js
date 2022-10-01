// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
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

/**
 * Returns basic program information for use in logging.
 */
const getProgramData = async () => {
  const pkgPath = path.resolve(__dirname, '..', 'package.json')
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'))
  const name = 'ZerglingBot'
  return {
    name,
    versionedName: `${name} v${pkg.version}`,
    version: pkg.version,
    homepage: pkg.homepage,
    repository: pkg.repository
  }
}

module.exports = {
  getProgramData,
  progKill,
  progError,
  progName
}
