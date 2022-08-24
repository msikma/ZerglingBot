// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')
const {ZerglingBot} = require('./index')
const {progError} = require('./util/program')
const {removeRestartFile} = require('./util/restart')

/**
 * Initializes zerglingbot from the command line.
 * 
 * This passes on the passed arguments and marks the bot as running from the command line.
 */
const initFromCli = async args => {
  // Remove the restart file if it exists, as we shouldn't restart immediately upon boot.
  await removeRestartFile(args.pathConfig)

  // Initialize ZerglingBot and start listening.
  const hb = new ZerglingBot({...args})
  try {
    await hb.init()
  }
  catch (err) {
    if (err.code === 'ELOCKED') {
      console.log(progError(`another instance is already running.`))
    }
    else {
      console.log(progError(`${String(err)}.`))
    }
  }
}

module.exports = {
  initFromCli
}
