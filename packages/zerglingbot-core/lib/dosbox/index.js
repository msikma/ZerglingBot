// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const psaux = require('psaux')

/**
 * Returns the latest active DOSBox-X process that was launched.
 */
const getDOSBoxProcess = async () => {
  // List all instances of DOSBox, sorted by how long they've been running.
  // If we have multiple instances, we'll return the most recently opened one.
  const items = (await psaux())
    .filter(ps => ps.command.match(/\/dosbox-x\S/i))
    .sort((a, b) => a.time < b.time ? -1 : 1)
  
  return items[0] || null
}

/**
 * Returns the latest active DOSBox-X process information.
 */
const getDOSBoxProcessData = async () => {
  const inst = await getDOSBoxProcess()
  if (inst === null) {
    return null
  }
  return {
    command: inst.command,
    pid: Number(inst.pid)
  }
}

/**
 * Returns information about the currently active DOSBox-X instance.
 */
const getDOSBoxInstance = async () => {
  const instance = await getDOSBoxProcessData()
  return {
    isActive: instance !== null,
    instance: instance ?? {}
  }
}

module.exports = {
  getDOSBoxProcess,
  getDOSBoxProcessData,
  getDOSBoxInstance
}
