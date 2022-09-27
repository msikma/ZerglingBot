// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const {log} = require('../../util/log')
const {utterMessage} = require('../voice')
const {pickTTSConfig} = require('./config')

/**
 * Initializes the class that handles TTS.
 * 
 * This will wait for messages to come streaming in and then generates TTS lines for them.
 * 
 * There are two types of TTS messages broadcast through the websocket:
 * 
 *   - tts_source   these are pure messages without audio, coming from the chat module
 *   - tts_audio    those same messages but with audio added to them by this module
 * 
 * This module listens for tts_source messages and then rebroadcasts them as tts_audio.
 * 
 * An important aspect of this module is the message queue: since the tts_audio messages
 * are broadcasted by the chat module, and multiple chat modules can be open at the same time,
 * we need to check the message guid to ensure we don't utter something twice or more.
 * 
 * Each message has its guid registered in the queue so that it's only uttered once.
 * Queue items are removed after a minute passes (purely for memory reasons).
 */
const createChatTTS = async (obsClient, chatClient, options) => {
  const state = {
    isListening: false,
    isChatTTSMode: false,
    ignoreQueue: false,
    blacklistedUsers: ['ZerglingBot_'],
    messageQueue: {},
    gcInterval: null,
    obsClient,
    chatClient
  }

  /**
   * Listens for tts_source messages and rebroadcasts them as tts_audio.
   * 
   * A tts_source message looks roughly as follows:
   * 
   * {
   *   id: '72f6960a-dcc9-4134-ae57-13c5937c2134',
   *   meta: {
   *     html: {
   *       message: '<span class="message">He can still win this one</span>',
   *       username: '<span class="meta" style="color: rgb(255, 191, 0);">' +
   *         '          <span class="badges">' +
   *         '          </span>' +
   *         '          <span class="name" style="background: rgba(0, 0, 0, 0) linear-gradient(0deg, rgb(246, 139, 0), rgb(255, 191, 0)) repeat scroll 0% 0% padding-box text; -webkit-text-fill-color: transparent;">Undeviginti19</span>' +
   *         '        </span>'
   *     },
   *     color: {
   *       a: 'rgb(246, 139, 0)',
   *       b: 'rgb(255, 191, 0)'
   *     }
   *   },
   *   queue: 'chat:unqueued',
   *   seed: 'Undeviginti19',
   *   text: 'He can still win this one'
   * }
   * 
   * We add the data generated by getAudioMessage() before rebroadcasting it.
   */
  const listenForSourceMessages = () => {
    if (state.isListening) {
      return
    }

    // Listen for TTS messages to come in, and then utter them.
    state.obsClient.addListener('BroadcastCustomMessage', async message => {
      if (message.realm !== 'tts_source') return
      if (state.blacklistedUsers.includes(message?.data?.seed)) return
      if (state.messageQueue[message?.data?.id] && !state.ignoreQueue) return

      // Register this message to the queue so we don't repeat it multiple times.
      addToQueue(message?.data?.id)

      try {
        // Retrieve an "upgraded" version of the message, with audio included.
        const [voiceData, audioData] = await getAudioMessage(message.data, options)

        const messageAudioData = {
          ...message.data,
          audio: audioData,
          meta: {
            ...message.data.meta,
            voice: voiceData
          }
        }

        log`Broadcasting TTS message: {green ${message.data.seed}}: {yellow ${message.data.text}} ({blue ${message.data.id}} {magenta ${voiceData.name}})`

        // Broadcast the same message back, but as tts_audio and with an audio buffer included.
        await state.obsClient.send('BroadcastCustomMessage', {realm: 'tts_audio', data: messageAudioData})
      }
      catch (err) {
        log`Could not generate TTS message:`
        log(message?.data)
        log(err)
        state.chatClient.sayToDefaultChannel(`!Could not generate TTS message! Sorry, try again later? Error ID: "${message?.data?.id ?? '(none)'}".`)
      }
    })
  }

  /**
   * Returns info needed to create a tts_audio message.
   * 
   * A tts_audio message keeps all content of the tts_source, but adds an additional "audio" property,
   * and adds a "voice" property to the metadata containing information about the TTS voice used.
   * 
   * The audio data:
   * 
   * {
   *   type: 'opus',
   *   encoding: 'base64',
   *   buffer: '[base64 audio buffer]'
   * }
   * 
   * The voice metadata:
   * 
   * {
   *   category: 'genTwo',
   *   example: 'Hello, my name is Daniel. I am a British-English voice.',
   *   gender: 'male',
   *   group: 'genTwoMale',
   *   language: ['en', 'gb'],
   *   name: 'Daniel',
   *   settings: Object {pitch: 0, rate: 1, volume: 0.8}
   * }
   * 
   * The audio buffer is generated based on the message text and seed.
   */
  const getAudioMessage = async (message, options) => {
    // Generate the utterance as an Opus file buffer.
    const {pathFFMPEG, pathSay} = options
    return utterMessage(message.text, message.seed, {...options, binPaths: {pathFFMPEG, pathSay}, toBase64: true})
  }

  /**
   * Adds a specific guid to the queue.
   */
  const addToQueue = id => {
    state.messageQueue[id] = Number(new Date())
  }

  /**
   * Clears out old items from the queue.
   * 
   * This does not completely empty out the queue. It only removes items older than a minute.
   */
  const clearQueue = () => {
    const cleared = {}
    const cutoff = Number(new Date()) - 60000
    for (const [id, time] of Object.entries(state.messageQueue)) {
      if (time < cutoff) {
        continue
      }
      cleared[id] = time
    }
    state.messageQueue = cleared
  }

  /**
   * Starts periodically clearing out the message queue.
   */
  const startQueueGc = () => {
    state.gcInterval = setInterval(() => clearQueue(), 10000)
  }

  /** Toggles the chat's TTS mode. */
  const toggleTTSMode = value => {
    isChatTTSMode = value
  }

  /** Returns whether the chat is currently in TTS mode. */
  const isInTTSMode = () => {
    return state.isChatTTSMode
  }

  listenForSourceMessages()
  startQueueGc()

  return {
    getAudioMessage,
    toggleTTSMode,
    isInTTSMode
  }
}

module.exports = {
  createChatTTS,
  pickTTSConfig
}
