// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/** Sleeps for a given number of milliseconds. */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** Counts the number of bytes used by a string. */
const countBytes = str => encodeURI(str).split(/%..|./).length - 1

module.exports = {
  sleep,
  countBytes
}
