// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Returns a list of all scenes, optionally filtered by a name.
 */
const getAllScenes = async (obs, labelName = null) => {
  let scenes = (await obs.send('GetSceneList')).scenes
  if (labelName) {
    scenes = scenes.filter(scene => scene.name.match(new RegExp(`\\[\\[${labelName}\\]\\]`)))
  }
  return scenes
}

/**
 * Returns an array of promises for switching a source's filters on or off.
 */
const mapSourceFilterVisibility = (obs, source, filters, visibility) => {
  return filters.map(filter => obs.send('SetSourceFilterVisibility', {
    sourceName: source.sourceName,
    filterName: filter.name,
    filterEnabled: visibility
  }))
}

/**
 * Returns a list of sources matched by a name.
 */
const getSceneSources = async (obs, scenes, labelName, sourceType = null) => {
  if (scenes == null) {
    scenes = await getAllScenes(obs)
  }
  const sources = {}
  for (const scene of scenes) {
    for (const source of scene.sources) {
      if (labelName != null && !source.name.includes(`[[${labelName}]]`)) {
        continue
      }
      try {
        const settings = await obs.send('GetSourceSettings', {sourceName: source.name, sourceType})
        if (!sources[source.name]) {
          sources[source.name] = {source, scenes: [], settings}
        }
        sources[source.name].scenes.push(scene)
      }
      catch (err) {
        if (err.error !== 'specified source exists but is not of expected type') {
          throw err
        }
      }
    }
  }
  return Object.values(sources)
}

/**
 * Changes the settings for a Streamlabs chat widget source to turn debugging on/off.
 */
const setStreamlabsChatSettings = (settings, isDebugging = false) => {
  const url = new URL(settings.url)
  if (isDebugging) {
    url.searchParams.set('simulate', '1')
    url.searchParams.delete('_simulate')
  }
  else {
    url.searchParams.set('_simulate', '1')
    url.searchParams.delete('simulate')
  }
  return {
    ...settings,
    url: String(url)
  }
}

/**
 * Returns a list of supported games.
 */
const getGamesList = async (obs) => {
  const scenes = await getAllScenes(obs)
  const games = {}
  for (const scene of scenes.scenes) {
    const gameName = scene.name.match(/\[\[Game (.+?)\]\]/)
    if (gameName == null) continue

    const name = gameName[1]
    games[name] = true
  }
  return Object.keys(games)
}

/**
 * Returns the currently active game.
 * 
 * This works by simply checking a [[Game]] scene for which source is currently visible.
 */
const getActiveGame = async (obs) => {
  try {
    const scene = (await getAllScenes(obs, 'Game'))[0]
    const visibleSources = scene.sources.filter(source => source.render === true)
    for (const source of visibleSources) {
      const game = source.name.match(/\[\[Game (.+?)\]\]/)
      if (game != null) {
        return game[1]
      }
    }
    return null
  }
  catch (err) {
    return null
  }
}


/**
 * Switches the visibility ('render' value) of a number of sources in any scene.
 */
const switchSceneSourcesVisibility = async (obs, visible, scenes, labelName, sourceType = null) => {
  const items = await getSceneSources(obs, scenes, labelName, sourceType)
  const tasks = []
  for (const item of items) {
    for (const scene of item.scenes) {
      tasks.push(obs.send('SetSceneItemRender', {'scene-name': scene.name, source: item.source.name, render: visible}))
    }
  }
  return Promise.all(tasks)
}

/**
 * Returns all primary game scenes (the ones linked to the main hotkeys).
 */
const getGameScenes = async obs => {
  const scenes = await getAllScenes(obs)
  return scenes.scenes.filter(scene => scene.name.includes('[[Game]]'))
}

/**
 * Toggles a source's filters, turning off all filters except those marked with a specific label.
 * 
 * E.g. to only show all filters with [[MyLabel]] in the name.
 */
const switchSourceFilters = async (obs, sources, labelName) => {
  const filterPromises = []
  for (const source of sources) {
    const filters = (await obs.send('GetSourceFilters', {sourceName: source.sourceName})).filters
    const setOff = filters.filter(filter => filter.enabled && !filter.name.includes(`[[${labelName}]]`))
    const setOn = filters.filter(filter => !filter.enabled && filter.name.includes(`[[${labelName}]]`))
    filterPromises.push(
      ...mapSourceFilterVisibility(obs, source, setOff, false),
      ...mapSourceFilterVisibility(obs, source, setOn, true)
    )
  }
  return Promise.all(filterPromises)
}

/**
 * Returns game sources for a list of scenes.
 */
const getGameSources = async (obs, scenes) => {
  const sources = {}
  for (const scene of scenes) {
    for (const source of scene.sources) {
      const matches = source.name.match(/\[\[Game (.+?)\]\]/)
      if (!matches) {
        continue
      }
      const settings = await obs.send('GetSourceSettings', {sourceName: source.name, sourceType: null})
      if (!sources[source.name]) {
        sources[source.name] = {game: matches[1], source, scenes: [], settings}
      }
      sources[source.name].scenes.push(scene)
    }
  }
  return Object.values(sources)
}

/**
 * Returns the current primary display source.
 */
const getPrimaryDisplay = async (obs) => {
  const sources = await getSceneSources(obs, null, 'PrimaryDisplay')
  return sources[0]
}

module.exports = {
  getActiveGame,
  getAllScenes,
  getGameScenes,
  getGamesList,
  getGameSources,
  getSceneSources,
  getPrimaryDisplay,
  setStreamlabsChatSettings,
  switchSceneSourcesVisibility,
  switchSourceFilters
}
