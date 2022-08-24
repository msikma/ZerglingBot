// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getDOSBoxInstance, getDOSBoxWindowTitle} = require('../../dosbox')
const {getAllScenes, getSceneSources, switchSourceFilters} = require('../../obs')

/** Active DOSBox instance state. */
const state = {
  instance: {
    command: '',
    pid: 0
  },
  window: null
}

/**
 * Watches the webcam and switches the webcam frame on/off.
 * 
 * If the webcam is not active, the image frame around it must be deactivated too.
 */
const taskWatchDOSBox = obs => async (log) => {
  const {isActive, instance} = await getDOSBoxInstance()

  if (!isActive || (state.instance.pid === instance.pid && state.window)) {
    return
  }

  // If an instance of DOSBox is running and it's a new process, set OBS up for it.
  state.instance = {...instance}
  state.window = null

  // Sometimes there's a slight delay before we can get the window title.
  // In that case, just wait and try again next cycle.
  const windowInfo = await getDOSBoxWindowTitle(state.instance.command)
  if (windowInfo === null) {
    return
  }
  state.window = windowInfo

  // Now that we have a new DOSBox instance, and a window title, set up OBS to use it.
  // There should be just one source, but loop over whatever results we get to be sure.
  const scenes = await getAllScenes(obs, 'Game DOSBox')
  const sources = await getSceneSources(obs, scenes, 'DOSBox', 'display_capture')
  for (const source of sources) {
    // Switch the source to the correct DOSBox window.
    await obs.send('SetSourceSettings', {
      sourceName: source.settings.sourceName,
      sourceSettings: {
        ...source.settings.sourceSettings,
        owner_name: state.window.owner,
        owner_pid: state.instance.pid,
        window_name: state.window.title
      }
    })
    // Turn off all filters except the ones with this machine's name.
    await switchSourceFilters(obs, [source.settings], `DOSBox ${state.window.machine}`)
  }

  log('Switched DOSBox to active machine:', state.window.machine)
}

module.exports = {
  taskWatchDOSBox
}
