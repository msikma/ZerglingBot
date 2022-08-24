// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/** Sleeps for a given number of milliseconds. */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

module.exports = {
  sleep
}
