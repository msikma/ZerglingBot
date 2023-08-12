// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')
const lockfile = require('proper-lockfile')

// Options passed on to proper-lockfile.
const lockOptions = {
  stale: 10000,
  update: 2000
}

/**
 * Obtains a lock for the program based on the location of the cache file.
 */
const getProgramLock = async (pathCache) => {
  return lockDirectory(pathCache)
}

/**
 * Locks a given directory and returns a release function.
 * 
 * This is used to ensure that only one process is currently working with a given directory,
 * and can be used to ensure that a program is only running one instance.
 * 
 * If a given directory is already locked, this will throw an ELOCKED error.
 * 
 * The release function does not necessarily need to be manually called;
 * the lock will be released on program exit automatically.
 */
const lockDirectory = async (dirpath, userOpts = {}) => {
  const pathResolved = path.resolve(dirpath)
  const opts = {...lockOptions, lockfilePath: `${pathResolved}/__dir.lock`, ...userOpts}
  const releaseFn = lockfile.lock(dirpath, opts)
  return releaseFn
}

module.exports = {
  lockDirectory,
  getProgramLock
}
