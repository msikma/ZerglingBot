// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

let CropDetector

/** Resets the transform. */
const TRANSFORM_RESET = {
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
}

/**
 * Finds the scenes containing the capture and display sources for the RT4K.
 */
const getRetrotinkSources = async (obsClient) => {
  let res
  res = await obsClient.call('GetSceneList')
  const captureScene = res.scenes.find(scene => scene.sceneName.includes('[[CaptureSource]]'))
  const displayScene = res.scenes.find(scene => scene.sceneName.includes('[[Display:RT4K]]'))
  res = await obsClient.call('GetSceneItemList', {sceneUuid: captureScene.sceneUuid})
  const captureSource = res.sceneItems.find(item => item.sourceName.includes('[[CaptureSource]]'))
  res = await obsClient.call('GetSceneItemList', {sceneUuid: displayScene.sceneUuid})
  const displaySource = res.sceneItems.find(item => item.sourceName.includes('[[CaptureSource]]'))

  return {
    captureScene,
    displayScene,
    captureSource,
    displaySource
  }
}

/**
 * Sets the crop values of the RT4K display source.
 */
const setRetrotinkTransform = async (obsClient, displayScene, displaySource, cropData) => {
  const baseProperties = {
    alignment: 5,
    boundsAlignment: 0,
    boundsType: 'OBS_BOUNDS_SCALE_INNER',
    boundsWidth: 1920,
    boundsHeight: 1080,
    scaleX: 1,
    scaleY: 1,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0,
    cropTop: 0,
  }
  return obsClient.call('SetSceneItemTransform', {
    sceneUuid: displayScene.sceneUuid,
    sceneItemId: displaySource.sceneItemId,
    sceneItemTransform: {
      ...baseProperties,
      ...cropData,
    }
  })
}

/**
 * Returns a screenshot of the current RT4K capture frame as a base 64 encoded string.
 */
const getRetrotinkScreenshot = async (obsClient, captureSource) => {
  // Note: we decided on jpg at quality 85 through testing.
  // It's fairly good quality, small and easy to generate.
  const res = await obsClient.call('GetSourceScreenshot', {
    sourceUuid: captureSource.sourceUuid,
    imageFormat: 'jpg',
    imageWidth: 1920,
    imageHeight: 1080,
    imageCompressionQuality: 85,
  })
  return res.imageData
}

/**
 * Detects the visible area inside the image and returns crop values.
 */
const getScreenshotTransformData = async (screenData) => {
  const cropDetector = new CropDetector({aspectRatio: 4 / 3})
  await cropDetector.loadImageBase64(screenData)
  const cropBox = await cropDetector.detectCropBox()

  // Crop values to the visible part of the image.
  const edges = cropBox.cropped.edges
  
  // Ensure we round up to the nearest multiple of 2.
  const width = Math.ceil(Math.ceil(cropBox.cropped.correctedWidth) / 2) * 2
  const height = Math.ceil(Math.ceil(cropBox.cropped.correctedHeight) / 2) * 2

  return {
    cropTop: Math.round(edges.top),
    cropRight: Math.round(edges.right),
    cropBottom: Math.round(edges.bottom),
    cropLeft: Math.round(edges.left),
    scaleX: width / cropBox.source.width,
    scaleY: height / cropBox.source.height,
  }
}

const initAutoCrop = async (state) => {
  const {obsClient} = state
  
  // FIXME: replace with module.
  CropDetector = (await import('@dada78641/autocrop')).default

  // Listen for autocrop requests.
  obsClient.addListener('CustomEvent', async ev => {
    if (ev.realm !== 'rt4k_auto_crop' || !['cropSD', 'cropReset'].includes(ev.action)) return
    const {displayScene, captureSource, displaySource} = await getRetrotinkSources(obsClient)

    if (ev.action === 'cropReset') {
      await setRetrotinkTransform(obsClient, displayScene, displaySource, TRANSFORM_RESET)
    }
    if (ev.action === 'cropSD') {
      const screenDataB64 = await getRetrotinkScreenshot(obsClient, captureSource)
      const transformData = await getScreenshotTransformData(screenDataB64)
      await setRetrotinkTransform(obsClient, displayScene, displaySource, transformData)
    }
  })
}

module.exports = {
  initAutoCrop
}
