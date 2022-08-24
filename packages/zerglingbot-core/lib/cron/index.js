// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {sleep} = require('../../util/misc')
const {taskWatchWebcam, taskWatchDOSBox} = require('./tasks')

/** Stream state. */
const state = {
  /** List of actively running cron tasks. */
  tasks: []
}

/**
 * Creates and starts a cron task.
 * 
 * This task will run once every given number of milliseconds and perform some action with OBS.
 * 
 * Tasks can be cleared with endCronTask().
 */
const startCronTask = (name, task, obs, time) => {
  const taskState = {
    /** Whether the task threw an error last time it was ran. */
    hasErrored: false,
    /** Whether the task should exit after its current iteration. */
    mustExit: false
  }

  /** Loops endlessly, running the task and then awaiting the assigned sleep time. */
  const loop = async () => {
    while (true) {
      if (taskState.mustExit) {
        return
      }
      await sleep(time)
      try {
        await task(obs)((...args) => console.log(`[task ${name}]`, ...args))
        taskState.hasErrored = false
      }
      catch (err) {
        // Ignore temporary connection errors.
        if (err.code === 'NOT_CONNECTED') {
          return
        }
        if (!taskState.hasErrored) {
          taskState.hasErrored = true
          console.log(`[task ${name}] Error in task:`)
          console.log(err)
          console.log(`[task ${name}] Further errors will be silenced until the task executes successfully again.`)
        }
      }
    }
  }

  loop()
  console.log(`[task ${name}] Task started.`)

  state.tasks[name] = taskState
}

/**
 * Stops a currently running cron task.
 */
const endCronTask = (name) => {
  state.tasks[name].mustExit = true
}

/**
 * Creates a cron manager for handling recurring tasks.
 */
const createCronManager = (obsClient) => {
  const init = () => {
    startCronTask('webcam', taskWatchWebcam, obsClient, 1000)
    startCronTask('dosbox', taskWatchDOSBox, obsClient, 1000)
  }
  const destroy = () => {
    endCronTask('webcam')
    endCronTask('dosbox')
  }
  return {
    init,
    destroy
  }
}

module.exports = {
  createCronManager,
  startCronTask,
  endCronTask
}
