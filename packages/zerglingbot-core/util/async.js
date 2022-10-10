// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {sleep} = require('./misc')

/**
 * Creates an async interval.
 * 
 * This continuously awaits the given function and then sleeps for the given number of milliseconds.
 */
const setAsyncInterval = (asyncFn, initialDelay) => {
  const state = {
    isDestroyed: false,
    delay: Math.floor(initialDelay)
  }

  /** Changes the current delay. */
  const setDelay = delay => {
    state.delay = Math.floor(delay)
  }

  /** Runs the interval infinitely long. */
  const runInterval = async () => {
    while (true) {
      if (state.isDestroyed) {
        return
      }
      await sleep(state.delay)
      await asyncFn()
    }
  }

  /** Clears the interval. */
  const clearInterval = () => {
    state.isDestroyed = true
  }

  // Starts running the interval.
  runInterval()
  
  return {
    setDelay,
    clear: clearInterval
  }
}

module.exports = {
  setAsyncInterval
}
