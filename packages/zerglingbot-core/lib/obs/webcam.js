// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getSceneSources, switchSceneSourcesVisibility} = require('./util')

/**
 * Toggles the webcam on or off.
 */
const toggleWebcam = async (obs, visible) => {
  const scenes = await obs.send('GetSceneList')
  return switchSceneSourcesVisibility(obs, visible, scenes.scenes, 'Webcam', null)
}

/**
 * Returns whether the webcam is currently on.
 * 
 * If the webcam is off, the image will entirely consist of #070707 color pixels.
 */
const isWebcamActive = async (obs) => {
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

/**
 * Returns whether we're currently testing the webcam.
 * 
 * If the webcam testing image is visible, we're testing the camera and should show the frame.
 */
const isWebcamTesting = async (obs) => {
  const scenes = await obs.send('GetSceneList')
  const images = await getSceneSources(obs, scenes.scenes, 'WebcamTestImage', null)
  if (!images.length) {
    return false
  }
  return images[0].source.render
}

module.exports = {
  toggleWebcam,
  isWebcamActive,
  isWebcamTesting
}
