// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {toggleWebcam, isWebcamActive, isWebcamTesting} = require('../../obs')

/** Webcam state. */
const state = {
  webcam: {}
}

/**
 * Watches the webcam and switches the webcam frame on/off.
 * 
 * If the webcam is not active, the image frame around it must be deactivated too.
 */
const runTaskWatchWebcam = ({obsClient, obsSocket}) => async (log) => {
  if (!obsSocket.isConnected() || !obsClient) return
  
  // Whether the webcam is currently broadcasting an image.
  const camActive = await isWebcamActive(obsClient)
  // Whether we're currently testing the webcam.
  const camTesting = await isWebcamTesting(obsClient)
  
  const cam = camActive || camTesting

  if (state.webcam.status !== cam) {
    state.webcam.status = cam
    await toggleWebcam(obsClient, cam)
    log('Toggled webcam:', cam)
  }
}

module.exports = {
  taskWatchWebcam: {
    name: 'webcam',
    task: runTaskWatchWebcam,
    delay: 1000
  }
}
