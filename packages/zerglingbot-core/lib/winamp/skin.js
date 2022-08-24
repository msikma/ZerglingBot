// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const fs = require('fs').promises
const path = require('path')
const fg = require('fast-glob')
const {search} = require('fast-fuzzy')
const {getRandomFromArrayWithoutLast} = require('../../util/prng')

/**
 * Searches the skin pool for a specific match.
 * 
 * Fuzzy searching is used, but if there are many matches this function will prefer exact matches.
 * 
 * If no matches are found at first, the search becomes more lenient.
 */
const searchSkinPool = (pool, searchTerm, lenient = false) => {
  const options = {keySelector: item => item[1], returnMatchData: true}
  let results = search(searchTerm, pool, {...options, threshold: 0.9})
  if (results.length === 0 && lenient) {
    results = search(searchTerm, pool, {...options, threshold: 0.6})
  }
  return results
}

/**
 * Returns a proper name for a skin filename.
 */
const getSkinName = filename => {
  const parsed = path.parse(filename)
  const clean = parsed.name.startsWith('[') ? parsed.name.slice(1) : parsed.name
  return clean.replace(/_/g, ' ').trim()
}

/**
 * Returns the full skin pool for randomly picking a skin.
 */
const getSkinPool = async ({regularSkins = true, genericSkins = true} = {}, basedir) => {
  const files = await fg(['*.wsz', '*.zip'], {cwd: basedir})

  // Filter to list of only the skins we're interested in.
  const pool = files.filter(f => (regularSkins && !f.startsWith('[')) || (genericSkins && f.startsWith('[')))

  if (pool.length === 0) return [null, null]
  if (pool.length === 1) return [pool[0], getSkinName(pool[0])]

  return pool.map(file => [file, getSkinName(file)])
}

/**
 * Returns a randomly chosen skin (except for whatever skin was previously chosen).
 * 
 * If no skins are found at all, 'null' is returned. If only one skin is found,
 * it's returned even if it's identical to the previously chosen skin.
 */
const getRandomSkin = async (lastSkin, {regularSkins = true, genericSkins = true} = {}, basedir) => {
  const pool = await getSkinPool({regularSkins, genericSkins}, basedir)
  const files = pool.map(item => item[0])
  return getRandomFromArrayWithoutLast(files, lastSkin)
}

/**
 * Saves a chosen skin filename to the target file and returns an object with information about it.
 */
const setRandomSkin = async (skin, basedir, target) => {
  // Store the randomly chosen skin name so that Winamp will update,
  // assuming the listener program is running.
  await fs.writeFile(target, `${skin}`, 'utf8')

  return {
    filename: skin,
    name: getSkinName(skin)
  }
}

/**
 * Returns the content of the skin target file, i.e. the last stored skin.
 * 
 * If the file does not exist or does not contain anything, 'null' is returned instead.
 */
const getStoredSkin = async (target) => {
  try {
    const content = await fs.readFile(target, 'utf8')
    const lines = content.trim().split(/\r?\n/)
    return lines[0] === '' ? null : lines[0].trim()
  }
  catch {
    return null
  }
}

module.exports = {
  getRandomSkin,
  getSkinPool,
  getStoredSkin,
  searchSkinPool,
  setRandomSkin
}
