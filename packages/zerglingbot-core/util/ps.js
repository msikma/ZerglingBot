// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const psaux = require('psaux')
const {exec} = require('./exec')

/**
 * Returns a list of currently active window titles.
 * 
 * This calls an AppleScript program, so it can be slow.
 */
const getWindowTitles = async () => {
  const script = `tell application "System Events" to get the name of every window of (every process whose background only is false)`
  const res = await exec(['osascript', '-e', script], 'utf8')
  const titles = res.stdout.trim().split(', ')
  return titles
}
 
/**
 * Returns whether the WinampXP VM is currently active or not.
 * 
 * If active, the process info is returned. If not, false is returned.
 */
const isWinampActive = async () => {
  const list = await psaux()
  const wa = list.find(ps => ps.command.match(/vmware-vmx.*winamp/i))

  return wa ?? false
}

module.exports = {
  isWinampActive,
  getWindowTitles
}
