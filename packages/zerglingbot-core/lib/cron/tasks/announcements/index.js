// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {createTaskQueue} = require('../../../../lib/queue')

/** Webcam state. */
const state = {
  queue: null
}

/**
 * Watches the webcam and switches the webcam frame on/off.
 * 
 * If the webcam is not active, the image frame around it must be deactivated too.
 */
const runTaskAnnouncements = ({apiClient, eventInterface, taskConfig}) => async (log) => {
  // On first run, create the task queue and add our messages.
  if (state.queue === null) {
    state.queue = createTaskQueue()
    state.queue.addTasks(taskConfig.messages.filter(message => message.enabled))
  }

  // Get list of messages we need to show right now.
  const todo = state.queue.getTodoTasks()

  // Announce all messages we need to announce and mark their tasks as done.
  todo.forEach(async task => {
    const {data} = task
    
    await eventInterface.makeAnnouncement({message: data.message, color: data.color})
    state.queue.markTaskAsDone(task)
  })
}

module.exports = {
  taskAnnouncements: {
    name: 'announcements',
    task: runTaskAnnouncements,
    delay: 500
  }
}
