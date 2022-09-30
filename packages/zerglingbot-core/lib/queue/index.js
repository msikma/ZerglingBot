// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

/**
 * Creates a new task queue.
 */
const createTaskQueue = () => {
  /** Queue state. Only contains tasks and ID for identification. */
  const state = {
    tasks: [],
    id: 0
  }

  /**
   * Adds a number of tasks to the queue.
   * 
   * Each task must contain a 'delay' number in milliseconds,
   * and a 'data' object that can contain anything.
   */
  const addTasks = (tasks, now = new Date()) => {
    state.tasks.push(...tasks.map(task => ({
      ...task,
      id: `_${state.id++}`,
      lastUpdate: now,
      nextUpdate: new Date(Number(now) + task.delay)
    })))
  }

  /**
   * Returns tasks that need to be done now.
   * 
   * After a task has been done, mark it as done using markTaskAsDone().
   * If it's not marked as done, it will be returned again next getTodoTasks() call.
   */
  const getTodoTasks = (now = new Date()) => {
    return state.tasks.filter(task => task.nextUpdate <= now)
  }

  /**
   * Marks a task as done.
   * 
   * This ensures the task will be silenced until it's time to run again.
   */
  const markTaskAsDone = (doneTask, now = new Date()) => {
    const n = state.tasks.findIndex(task => task.id === doneTask.id)
    const task = state.tasks[n]
    task.lastUpdate = now
    task.nextUpdate = new Date(Number(new Date()) + task.delay)
  }

  return {
    addTasks,
    getTodoTasks,
    markTaskAsDone
  }
}

module.exports = {
  createTaskQueue
}
