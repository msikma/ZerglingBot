// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getAllScenes, switchSceneSourcesVisibility} = require('./util')

/**
 * Turns the StarCraft rank widget on or off.
 */
const setRankWidgetVisibility = async (obs, visible) => {
  if (!obs) return
  const scenes = await getAllScenes(obs)
  return switchSceneSourcesVisibility(obs, visible, scenes.scenes, 'SCRankWidget', null)
}

module.exports = {
  setRankWidgetVisibility
}
