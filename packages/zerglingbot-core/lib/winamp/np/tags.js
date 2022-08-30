// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const formatDuration = require('format-duration')
const {objectRemoveNullish, objectRemoveEmptyStrings} = require('../../../util/types')

/** Sanitizes the tag objects. */
const sanitizeTags = obj => objectRemoveEmptyStrings(objectRemoveNullish(obj))

/** Parses tracks (or disc numbers) into an array. */
const parseTracks = track => {
  if (track == null) return null
  if (track.includes('/')) {
    return track.split('/').map(n => String(parseInt(n.trim())))
  }
  return [String(parseInt(track.trim()))]
}

/** Parses a single track (ditches the part after the slash). */
const parseSingleTrack = track => {
  const tracks = parseTracks(track)
  if (tracks == null) return null
  return tracks[0]
}

/** Parses a year (date) value. */
const parseYear = year => {
  if (year == null) return null
  return String(parseInt(year.trim().slice(0, 4)))
}

/** These tags are available on any format. */
const universalTags = [
  ['album_artist', 'albumArtist'],
  ['album'],
  ['artist'],
  ['category'],
  ['contentgroup', 'contentGroup'],
  ['date', 'year', parseYear],
  ['genre'],
  ['title'],
  ['comment'],
  ['composer'],
  ['publisher'],
  ['copyright'],
  ['track', 'track', parseSingleTrack],
  ['track', 'tracks', parseTracks],
  ['disc', 'disc', parseSingleTrack],
  ['disc', 'discNumbers', parseTracks],
  ['encoder'],

  // MP3 short tags.
  ['tit1', 'category']
]

/**
 * Converts raw ffmpeg tags to a common format.
 */
function convertTags(rawTags, songType) {
  return sanitizeTags(convertTagsFormat(rawTags, songType))
}

/**
 * Converts a seconds duration to milliseconds.
 */
function parseDurationAsSeconds(duration) {
  const value = parseFloat(duration)
  return value * 1000
}

/**
 * Converts a time, e.g. '00:03:20', to milliseconds.
 */
function parseDurationAsTime(duration) {
  const segments = duration.split(':')
  const durations = [
    n => n * 1000,
    n => n * 1000 * 60,
    n => n * 1000 * 60 * 60,
    n => n * 1000 * 60 * 60 * 24
  ]
  let value = 0
  for (let n = 0; n < segments.length; ++n) {
    const segment = parseInt(segments[segments.length - 1 - n], 10)
    value += durations[n](segment)
  }
  return value
}

/**
 * Returns the type of tags extracted by ffmpeg.
 */
function getTagsType(res) {
  if (!res || !res?.format) {
    return [null, {}]
  }
  //console.log(res.format.tags)
  if (res.format.format_name === 'ogg') {
    return ['ogg', res.streams.find(stream => stream.codec_type === 'audio').tags]
  }
  if (res.format.format_name === 'mp3') {
    return ['mp3', res.format.tags]
  }
  if (res.format.format_name === 'flac') {
    return ['flac', res.format.tags]
  }
  if (res.format.format_name.includes('m4a')) {
    return ['m4a', res.format.tags]
  }
  else {
    return ['unknown', res?.format?.tags ?? {}]
  }
}

/**
 * Converts tag keys into lowercase.
 */
function normalizeTags(tags) {
  return Object.fromEntries(Object.entries(tags).map(([key, value]) => [key.toLowerCase(), value.trim()]))
}

/**
 * Returns derived tags (for game music and game music covers only).
 */
function getDerivedTags(tags, songType) {
  const derivedTags = {
    songType
  }
  if (songType === 'generic' || !songType) {
    return derivedTags
  }
  if (songType === 'game_cover') {
    if (tags.category) {
      derivedTags.game = tags.category
    }
    else if (tags.contentGroup) {
      derivedTags.game = tags.contentGroup
    }
    return derivedTags
  }
  if (songType === 'game') {
    // .flac files have a contentgroup but no category.
    if (tags.contentGroup && !tags.category) {
      derivedTags.system = tags.contentGroup
    }
    // .mp3 and .ogg files have a category.
    else if (tags.category) {
      derivedTags.system = tags.category
    }
    return derivedTags
  }
}

/**
 * Converts ffmpeg tags into a more common format.
 */
function convertTagsFormat(res, songType = 'generic') {
  const [type, tags] = getTagsType(res)
  if (!type || !tags) {
    return {}
  }
  const fileTags = normalizeTags(tags)
  const parsedTags = Object.fromEntries(
    universalTags
      .map(tag => {
        let value = fileTags[tag[0]]
        const dst = tag[1] ?? tag[0]
        if (tag[2]) {
          value = tag[2](value)
        }
        else {
          value = value != null ? value.trim() : null
        }
        return [dst, value]
      })
      .filter(entry => {
        return entry[1] != null
      })
      .sort((entryA, entryB) => {
        return entryA[0] < entryB ? -1 : 1
      })
  )
  if (fileTags.grouping) {
    parsedTags.contentGroup = fileTags.grouping.trim()
  }
  const songLength = parseDurationAsSeconds(res.format.duration)
  const songLengthFormatted = formatSongLength(songLength)
  const derivedTags = getDerivedTags(parsedTags, songType)

  return {
    ...parsedTags,
    derivedTags,
    songLengthFormatted,
    songLength
  }
}

/**
 * Returns a formatted song length from a millisecond value.
 */
function formatSongLength(ms) {
  return formatDuration(ms)
}

module.exports = {
  convertTags
}
