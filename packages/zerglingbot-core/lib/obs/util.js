// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {filterSceneSourcesByKey} = require('./data')

/**
 * Returns a list of all scenes, optionally filtered by a name.
 */
const getAllScenes = async (obs, addSources = false, addSettings = false) => {
  const scenes = (await obs.call('GetSceneList')).scenes
  if (addSources) {
    return addSceneSources(obs, scenes, addSettings)
  }
  return scenes
}

/**
 * Returns a list of all scenes, optionally filtered by a name.
 */
const getAllScenesWithLabel = async (obs, labelName = null, addSources = false, addSettings = false) => {
  let scenes = await getAllScenes(obs)
  if (labelName) {
    scenes = scenes.filter(scene => scene.sceneName.match(new RegExp(`\\[\\[${labelName}\\]\\]`)))
  }
  if (addSources) {
    return addSceneSources(obs, scenes, addSettings)
  }
  return scenes
}

/**
 * For every scene, disable all sources that match key, and enable all sources that match key and value.
 */
const toggleSourcesByKey = async (obs, scenes, key, value) => {
  const sources = filterSceneSourcesByKey(scenes, key)

  // TODO: if reinstating the code below, cut from here.
  const calls = []
  for (const [sourceValue, sceneSources] of Object.entries(sources)) {
    for (const source of sceneSources) {
      calls.push(obs.call(
        'SetSceneItemEnabled', {
          sceneName: source._scene.sceneName,
          sceneItemId: source.sceneItemId,
          sceneItemEnabled: sourceValue === value
        }
      ))
    }
  }
  return Promise.all(calls)

  // TODO: this is more efficient, but it crashes OBS. Bring back when the bug is fixed.
  // const calls = Object.entries(sources).map(([sourceValue, sources]) => sources.map(source => ({
  //   requestType: 'SetSceneItemEnabled',
  //   requestData: {
  //     sceneName: source._scene.sceneName,
  //     sceneItemId: source.sceneItemId,
  //     sceneItemEnabled: sourceValue === value
  //   }
  // })))
  // return obs.callBatch(calls)
}

/**
 * Adds a list of sources to a list of scenes.
 * 
 * Scenes normally don't include a list of sources in v5, so we add them here.
 */
const addSceneSources = async (obs, scenes, addSettings = false) => {
  const sceneItemResults = await obs.callBatch(scenes.map(({sceneName}) => ({requestType: 'GetSceneItemList', requestData: {sceneName}})))
  const scenesWithSources = sceneItemResults.map((res, n) => ({
    ...scenes[n],
    sources: res.responseData.sceneItems.map(obj => ({
      ...obj
    }))
  })).flat(Infinity)

  if (!addSettings) {
    return scenesWithSources
  }

  // Retrieve input settings.
  const inputList = scenesWithSources.map(scene => scene.sources.map(source => source.sourceName)).flat(Infinity)
  const inputSettings = await obs.callBatch(inputList.map(sourceName => ({requestType: 'GetInputSettings', requestData: {inputName: sourceName}})))
  const sceneSourceSettings = Object.fromEntries(inputList.map((sourceName, n) => [sourceName, inputSettings[n]?.responseData ?? {}]))
  const scenesWithSourcesAndSettings = scenesWithSources.map(scene => ({...scene, sources: scene.sources.map(source => ({...source, ...sceneSourceSettings[source.sourceName]}))}))
  return scenesWithSourcesAndSettings
}

/**
 * Returns an array of promises for switching a source's filters on or off.
 */
const mapSourceFilterVisibility = (obs, source, filters, visibility) => {
  return filters.map(filter => obs.call('SetSourceFilterEnabled', {
    sourceName: source.sourceName,
    filterName: filter.filterName,
    filterEnabled: visibility
  }))
}

/**
 * Toggles a source's filters, turning off all filters except those marked with a specific label.
 * 
 * E.g. to only show all filters with [[MyLabel]] in the name.
 */
const switchSourceFilters = async (obs, sources, labelName) => {
  const filterPromises = []
  for (const source of sources) {
    const filters = (await obs.call('GetSourceFilterList', {sourceName: source.sourceName})).filters
    const setOff = filters.filter(filter => filter.filterEnabled && !filter.filterName.includes(`[[${labelName}]]`))
    const setOn = filters.filter(filter => !filter.filterEnabled && filter.filterName.includes(`[[${labelName}]]`))
    filterPromises.push(
      ...mapSourceFilterVisibility(obs, source, setOff, false),
      ...mapSourceFilterVisibility(obs, source, setOn, true)
    )
  }
  return Promise.all(filterPromises)
}

/**
 * Switches the visibility ('render' value) of a number of sources in any scene.
 */
const switchSceneSourcesVisibility = async (obs, visible, scenes, labelName) => {
  const tasks = scenes.map(scene => scene.sources.map(source => ({
    requestType: 'SetSceneItemEnabled',
    requestData: {
      sceneName: scene.sceneName,
      sceneItemId: source.sceneItemId,
      sceneItemEnabled: visible
    }
  }))).flat()
  return obs.callBatch(tasks)
}

module.exports = {
  getAllScenes,
  getAllScenesWithLabel,
  toggleSourcesByKey,
  addSceneSources,
  switchSourceFilters,
  switchSceneSourcesVisibility
}
