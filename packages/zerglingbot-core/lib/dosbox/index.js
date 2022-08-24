// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const psaux = require('psaux')
const {ucFirst} = require('../../util/text')
const {getWindowTitles} = require('../../util/ps')

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
 * Returns a list of all DOSBox-X related window titles.
 * 
 * This runs AppleScript and can be slow.
 */
const getDOSBoxWindowTitles = async () => {
  const titles = await getWindowTitles()
  return titles
    .map(title => title.match(/^dosbox-x-(.+?)\s.+?\sDOSBox-X\s/))
    .filter(title => title)
    .map(title => [title.input, title[1]])
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
 * Returns the window title for a given DOSBox-X command obtained from psaux.
 */
const getDOSBoxWindowTitle = async (command) => {
  const titles = await getDOSBoxWindowTitles()
  for (const [title, name] of titles) {
    const isMatch = !!command.match(new RegExp(`/${name}/`, 'i'))
    if (isMatch) {
      return {
        owner: 'dosbox-x',
        name,
        machine: ucFirst(name),
        title
      }
    }
  }
  return null
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
  getDOSBoxWindowTitles,
  getDOSBoxWindowTitle,
  getDOSBoxInstance
}
