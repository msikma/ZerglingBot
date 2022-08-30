// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const path = require('path')
const fs = require('fs').promises
const iconv = require('iconv-lite')
const {getExtendedInfo} = require('./info')
const {isWinampActive} = require('../../../util/ps')

/** Data obtained from Dada Skin Changer. */
const dscFiles = {
  isPlaying: ['is_playing', 'boolean'],
  currentSkin: ['skin', 'string'],
  currentSongPath: ['song', 'path'],
  currentSongTitle: ['title', 'string']
}

/**
 * Returns whether the currently playing song is actually an auxiliary file.
 * 
 * When booting up WinampXP with Dada Skin Changer, Winamp will try to play
 * one of two nonexistent files that should not be considered valid.
 * 
 * An additional file exists called "silence" which is used to stop playback
 * and empty out the text in the "now playing" field on Winamp itself.
 * This track should not show up either.
 */
function isAuxFile(filepath) {
  const files = [
    `C:\\PROGRA~1\\Winamp\\winamp.ini`,
    `C:\\WINDOWS\\system32\\-Embedding`,
    `M:\\Music\\Other\\Silence.flac`
  ]
  if (files.includes(filepath)) {
    return true
  }
  return false
}

/**
 * Reads a Dada Skin Changer file.
 * 
 * Returns the value properly cleaned for use. Decodes the values as Windows-1252.
 */
async function readDscFile(name, info, basedir) {
  const file = info[0]
  const type = info[1]
  const filepath = path.join(basedir, `${file}.txt`)

  const rawData = await fs.readFile(filepath, null)
  let data = iconv.decode(rawData, 'win1252')

  if (type === 'string') {
    data = data.trim()
  }
  if (type === 'path') {
    data = data.trim()
  }
  if (type === 'boolean') {
    data = Boolean(Number(data.trim()))
  }

  return [name, data]
}

/**
 * Returns an object of all data obtained directly from Dada Skin Changer.
 */
async function getDscData(dscPath) {
  const dataList = await Promise.all(Object.entries(dscFiles).map(([key, info]) => readDscFile(key, info, dscPath)))
  const data = Object.fromEntries(dataList)

  // Hack to work around Winamp's weird behavior.
  if (isAuxFile(data.currentSongPath)) {
    data.currentSongPath = ''
    data.currentSongTitle = ''
    data.isPlaying = false
  }

  // If the WinampXP VM is currently not active, always set isPlaying to false.
  // This is needed because if the VM exits without stopping play first, the "is playing"
  // value will continue to be listed as "true".
  if (!(await isWinampActive())) {
    data.isPlaying = false
  }

  return data
}

/**
 * Returns whether a song is currently playing and its data.
 */
async function getNowPlayingData(dscPath, musicPath, ffprobeBin) {
  const dscData = await getDscData(dscPath)
  const songInfo = await getExtendedInfo(dscData.currentSongPath, musicPath, ffprobeBin)
  
  // Use a fallback in case we weren't able to get any tags for some reason.
  if (!songInfo.title) {
    songInfo.title = dscData.currentSongTitle
  }

  return [dscData.isPlaying, songInfo]
}

module.exports = {
  getNowPlayingData
}
