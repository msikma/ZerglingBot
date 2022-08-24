// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')
const fs = require('fs').promises
const {getAllScenes, getPrimaryDisplay, getActiveGame} = require('../../obs')

/** Webcam state. */
const state = {
  layout: {
    isReplay: false,
    resourcePanelSize: 0
  }
}

/**
 * Returns whether the webcam is currently on.
 * 
 * If the webcam is off, the image will entirely consist of #070707 color pixels.
 */
const getScreenshot = async (obs) => {
  const screenshot = await obs.send('TakeSourceScreenshot', {sourceName: 'Webcam Capture', embedPictureFormat: 'bmp', width: 8, height: 8})
  const expected = [
    `data:image/bmp;base64,`,
    // Image header
    `Qk32AAAAAAAAADYAAAAoAAAACAAAAAgAAAABABgAAAAAAMAAAAATCwAAEwsAAAAAAAAAAAAA`,
    // Pixels
    `BwcH`.repeat(8 * 8)
  ].join('')
  return screenshot.img !== expected
}

const getScenePrimaryDisplaySource = (scene) => {
  for (const source of scene.sources) {
    if (!source.type === 'display_capture') continue
    if (!source.name.includes('[[PrimaryDisplay]]')) continue

    return source
  }
  return null
}

const getActiveDisplaySource = async (obs) => {
  const currentScene = await obs.send('GetCurrentScene')
  const currentDisplay = getScenePrimaryDisplaySource(currentScene)
  if (currentDisplay) {
    return currentDisplay.name
  }
  const scenes = await getAllScenes(obs)
  for (const scene of scenes) {
    console.log(scene.name)
    console.log(scene.sources)
    console.log('----')
  }
  // console.log('s1', currentScene)
  // console.log('s2', allSources)
}

const inferGameLayoutState = async (obs) => {
  const primaryDisplay = await getPrimaryDisplay(obs)
  console.log('primaryDisplay', primaryDisplay)
  //primaryDisplay.source.source_cx
  const screenshot = await obs.send('TakeSourceScreenshot', {
    sourceName: primaryDisplay.source.name,
    embedPictureFormat: 'png',
    width: 1920,
    height: 1080
  })
  const headerIdx = screenshot.img.indexOf(',')
  const data = screenshot.img.slice(headerIdx + 1)

  const pp = path.resolve(path.join(__dirname, '..', '..', '..', '..', '..', '_test'))
  await fs.writeFile(path.join(pp, `img_${(+new Date())}.png`), data, 'base64')
  
}

/**
 * a
 */
const taskWatchLayout = obs => async (log) => {
  //const displaySource = await getActiveDisplaySource(obs)
  const game = await getActiveGame(obs)
  if (game === 'StarCraft') {
    await inferGameLayoutState(obs)
  }
  log('game:', game)
}

module.exports = {
  taskWatchLayout
}
