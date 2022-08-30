// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {sleep} = require('../../util/misc')
const tasks = require('./tasks')

/** Stream state. */
const state = {
  /** List of actively running cron tasks. */
  tasks: []
}

/** Returns task-specific config if it exists. */
const getTaskConfig = (config, name) => {
  if (config.tasks[name]) return {...config.tasks[name]}
  return {}
}

/**
 * Creates and starts a cron task.
 * 
 * This task will run once every given number of milliseconds and perform some action.
 * 
 * Tasks can be cleared with endCronTask().
 */
const startCronTask = (name, task, context, time) => {
  const {config} = context

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
        await task({...context, taskConfig: getTaskConfig(config, name)})((...args) => console.log(`[task ${name}]`, ...args))
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
const createCronManager = (context) => {
  const init = () => {
    for (const task of Object.values(tasks)) {
      startCronTask(task.name, task.task, context, task.delay)
    }
  }
  const destroy = () => {
    for (const task of Object.values(tasks)) {
      endCronTask(task.name)
    }
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
