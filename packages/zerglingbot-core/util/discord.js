// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Returns a HammerTime timestamp for a given date.
 * 
 * The 'type' must be one of the following:
 * 
 *   d: 04/02/2024
 *   D: April 2, 2024
 *   t: 10:41 AM
 *   T: 10:41:00 AM
 *   f: April 2, 2024 10:41 AM
 *   F: Tuesday, April 2, 2024 10:41 AM
 *   R: 4 minutes ago
 */
const getHammerTime = (dateObj = new Date(), type = 'f') => {
  const unixTime = Math.floor(Number(dateObj) / 1000)
  return `<t:${unixTime}:${type}>`
}

module.exports = {
  getHammerTime
}
