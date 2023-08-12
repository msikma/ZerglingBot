// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getDOSBoxInstance, getDOSBoxWindowTitle} = require('../../dosbox')
const {getAllScenes, getAllScenesWithLabel, switchSourceFilters} = require('../../obs')

/** Active DOSBox instance state. */
const state = {
  instance: {
    command: '',
    pid: 0
  },
  window: null
}

/**
 * Watches for DOSBox instances and sets OBS to capture the correct one.
 */
const runTaskWatchDOSBox = ({obsClient}) => async (log) => {
  if (!obsClient) return
  
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
  const scenes = await getAllScenesWithLabel(obsClient, 'Game DOSBox', true, true)
  const source = scenes.map(scene => scene.sources).flat().find(source => source.inputKind === 'screen_capture')

  // Switch the source to the correct DOSBox window.
  await obsClient.call('SetInputSettings', {
    inputName: source.sourceName,
    inputSettings: {
      application: 'com.dosbox-x'
    },
    overlay: true
  })
  // Turn off all filters except the ones with this machine's name.
  await switchSourceFilters(obsClient, [source.settings], `DOSBox ${state.window.machine}`)

  log('Switched DOSBox to active machine:', state.window.machine)
}

module.exports = {
  taskWatchDOSBox: {
    name: 'dosbox',
    task: runTaskWatchDOSBox,
    delay: 1000
  }
}
