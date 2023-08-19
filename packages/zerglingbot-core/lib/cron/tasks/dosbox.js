// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {getDOSBoxInstance} = require('../../dosbox')
const {getAllScenesWithLabel, switchSourceFilters, toggleSourcesByKey} = require('../../obs')

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

  // Now that we have a new DOSBox instance, we should enable its capture source
  // and disable the old one.
  const scenes = await getAllScenesWithLabel(obsClient, 'Game DOSBox', true, true)
  await toggleSourcesByKey(obsClient, scenes, 'DOSBox', machine)

  log('Switched DOSBox to active machine:', state.machine)
}

module.exports = {
  taskWatchDOSBox: {
    name: 'dosbox',
    task: runTaskWatchDOSBox,
    delay: 1000
  }
}
