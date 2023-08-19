// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Returns scene sources with a given key-value pair in its label.
 * 
 * This allows for searching for e.g. sources with [[DOSBox:Delphi]] and [[DOSBox:Tulip]].
 * 
 * Requires sources to be present on the scene objects.
 */
const filterSceneSourcesByKey = (scenes, key) => {
  const items = {}
  const sources = scenes.map(scene => (scene.sources || []).map(source => ({...source, _scene: scene}))).flat()
  sources.forEach(source => {
    const matches = source.sourceName.match(new RegExp(`\\[\\[${key}:(.+?)\]\]`))
    if (!matches) return
    const value = matches[1]
    if (!items[value]) items[value] = []
    items[value].push(source)
  })
  return items
}

module.exports = {
  filterSceneSourcesByKey
}
