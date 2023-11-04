// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Unpacks public data from Twurple objects.
 */
const unpackTwurpleData = (keys = [], obj = {}) => {
  const data = {}
  for (const key of keys) {
    data[key] = obj[key]
  }
  return data
}

module.exports = {
  unpackTwurpleData
}
