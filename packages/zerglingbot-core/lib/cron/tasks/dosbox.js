// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getDOSBoxInstance} = require('../../dosbox')
const {getAllScenesWithLabel, switchSourceFilters} = require('../../obs')

/** Active DOSBox instance state. */
const state = {
  instance: {
    command: '',
    pid: 0
  },
  machine: null
}

/**
 * Returns the current machine name from the invocation command.
 * 
 * This requires that the command includes this argument, e.g. "-dada78641-machine-name Delphi".
 * DOSBox will ignore unrecognized startup arguments.
 */
const getMachineName = cmd => {
  if (!cmd) return null
  const match = cmd.match(/-dada78641-machine-name ([^\s]*)/)
  if (match) return match[1]
}

/**
 * Watches for DOSBox instances and sets OBS to capture the correct one.
 */
const runTaskWatchDOSBox = ({obsClient}) => async (log) => {
  if (!obsClient) return
  
  const {isActive, instance} = await getDOSBoxInstance()
  const machine = getMachineName(instance.command)

  if (!isActive || !machine || (state.instance.pid === instance.pid) || (state.machine === machine)) {
    return
  }

  // If an instance of DOSBox is running and it's a new process, set OBS up for it.
  state.instance = {...instance}
  state.machine = machine

  // Now that we have a new DOSBox instance, and a window title, set up OBS to use it.
  // There should be just one source, but loop over whatever results we get to be sure.
  const scenes = await getAllScenesWithLabel(obsClient, 'Game DOSBox', true, true)
  const source = scenes.map(scene => scene.sources).flat().find(source => source.sourceName.includes('[[DOSBoxScreenCapture]]'))

  // Switch the source to the correct DOSBox window.
  // TODO: this seems to be broken. When DOSBox exits before OBS, it needs to be reset manually in OBS itself.
  await obsClient.call('SetInputSettings', {
    inputName: source.sourceName,
    inputSettings: {
      application: 'com.dosbox-x'
    },
    overlay: true
  })
  // Turn off all filters except the ones with this machine's name.
  await switchSourceFilters(obsClient, [source], `DOSBox ${state.machine}`)

  log('Switched DOSBox to active machine:', state.machine)
}

module.exports = {
  taskWatchDOSBox: {
    name: 'dosbox',
    task: runTaskWatchDOSBox,
    delay: 1000
  }
}
