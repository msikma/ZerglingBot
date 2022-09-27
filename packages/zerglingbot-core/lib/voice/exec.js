// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const tempy = require('tempy')
const rmfr = require('rmfr')
const fs = require('fs').promises
const process = require('process')
const path = require('path')
const {getVoicesCommand, getUtteranceCommand, getConversionCommand} = require('./cmd')
const {getUtterancePrompt, parseVoiceLine} = require('./parse')
const {exec} = require('../../util/exec')

/**
 * Returns a flat list of available voices.
 */
const getLocalVoices = async () => {
  const res = await exec(getVoicesCommand(), 'utf8')
  const lines = res.stdout.trim().split('\n')
  const items = lines.map(parseVoiceLine)
  return items
}

/**
 * Generates an utterance file.
 * 
 * This first generates a .wav file using the TTS application, and then converts it to .opus.
 */
const performUtteranceWork = async (workDir, getSayCmd, getConvCmd) => {
  const sayCmd = getSayCmd(workDir)
  const convCmd = getConvCmd(workDir)
  await exec(sayCmd[0], 'utf8')
  await exec(convCmd[0], 'utf8')
  return convCmd[1]
}

/**
 * Generates an utterance and returns it as a buffer.
 */
const getUtteranceBuffer = async (text, voice, settings, binPaths, format = 'opus', bitrate = '128k') => {
  const prompt = getUtterancePrompt(text, settings)
  const [getSayCmd, fnWav] = getUtteranceCommand(prompt, voice.name, binPaths.pathSay)
  const [getConvCmd, fnOpus] = getConversionCommand(fnWav, format, bitrate, binPaths.pathFFMPEG)

  // Do all work inside a temporary directory.
  const workDir = tempy.directory()
  const fnOpusGlobal = await performUtteranceWork(workDir, getSayCmd, getConvCmd)
  const buffer = await fs.readFile(fnOpusGlobal, null)

  // Clean up.
  await rmfr(workDir)

  return buffer
}

module.exports = {
  getLocalVoices,
  getUtteranceBuffer
}
