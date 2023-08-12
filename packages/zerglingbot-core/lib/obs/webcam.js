// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getAllScenesWithLabel, switchSceneSourcesVisibility} = require('./util')

/**
 * Toggles the webcam on or off.
 */
const toggleWebcam = async (obs, visible) => {
  // Fetch all scenes containing a webcam source.
  const scenes = await getAllScenesWithLabel(obs, 'WebcamEmbed', true)
  return switchSceneSourcesVisibility(obs, visible, scenes, 'Webcam', null)
}

/**
 * Returns whether the webcam is currently on.
 * 
 * If the webcam is off, the image will entirely consist of #070707 color pixels.
 */
const isWebcamActive = async (obs) => {
  const screenshot = await obs.call('GetSourceScreenshot', {sourceName: 'Webcam Capture', imageFormat: 'bmp', imageWidth: 8, imageHeight: 8})
  const expected = [
    `data:image/bmp;base64,`,
    // Image header
    `Qk32AAAAAAAAADYAAAAoAAAACAAAAAgAAAABABgAAAAAAMAAAAATCwAAEwsAAAAAAAAAAAAA`,
    // Pixels
    `AAAA`.repeat(8 * 8)
  ].join('')
  return screenshot.imageData !== expected
}

/**
 * Returns whether we're currently testing the webcam.
 * 
 * If the webcam testing image is visible, we're testing the camera and should show the frame.
 */
const isWebcamTesting = async (obs) => {
  const scenes = await getAllScenesWithLabel(obs, 'WebcamSource', true, true)
  const images = scenes.map(scene => scene.sources).flat().filter(source => source.sourceName.includes('[[WebcamTestImage]]'))
  if (!images.length) {
    return false
  }
  return images[0].sceneItemEnabled
}

module.exports = {
  toggleWebcam,
  isWebcamActive,
  isWebcamTesting
}
