// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

import path from 'path'
import {MusicIndexer} from '@dada78641/musidx'
import {getConfig} from 'zerglingbot-core/util/config.js'

/**
 * A music indexing profile for ZerglingBot.
 * 
 * This indexes music from specific categories and additionally separates the ones rated 5 stars.
 * 5 stars means it's suitable for streaming.
 */
function getMusicProfile(pathWin32Base) {
  return {
    playlists: {
      filter: item => item.title.includes('(Stream)'),
      map: item => ({...item, title: item.title.replace('(Stream)', '').trim()}),
      win32BaseDir: pathWin32Base
    },
    categories: [
      {
        name: 'VGM',
        code: 'game_music_streamable',
        inherits: 'game_music',
        filter: item => item.tags?.rating && Number(item.tags?.rating) === 100
      },
      {
        name: 'VG Covers',
        code: 'game_music_covers_streamable',
        inherits: 'game_music_covers',
        filter: item => item.tags?.rating && Number(item.tags?.rating) === 100
      },
      {
        name: 'Other',
        code: 'tracker_streamable',
        inherits: 'tracker',
        filter: item => item.tags?.rating && Number(item.tags?.rating) === 100
      },
      {
        name: 'VGM (all)',
        code: 'game_music',
        basedir: 'Game music',
        taxonomy: ['category', 'album', 'genre'],
        sort: [['amount', 'desc'], ['titleLc', 'asc'], ['titleLc', 'asc']],
        categoryTags: {
          map: tags => {
            const mapped = {}
            if (tags.common.grouping) {
              mapped.system = tags.common.grouping
            }
            if (tags.native.vorbis) {
              let tag = tags.native.vorbis.find(tag => tag.id === 'CATEGORY')
              if (!tag) tag = tags.native.vorbis.find(tag => tag.id === 'CONTENTGROUP')
              if (tag) {
                mapped.system = tag.value
              }
            }
            if (tags.native.iTunes) {
              let tag = tags.native.iTunes.find(tag => tag.id === '----:com.apple.iTunes:CATEGORY')
              if (!tag) tag = tags.native.iTunes.find(tag => tag.id === '----:com.apple.iTunes:CONTENTGROUP')
              if (tag) {
                mapped.system = tag.value
              }
            }
            if (mapped.system) {
              mapped.category = mapped.system
            }
            return mapped
          }
        }
      },
      {
        name: 'VG Covers (all)',
        code: 'game_music_covers',
        basedir: 'Game music covers',
        taxonomy: ['category', 'albumartist__or__artists', 'album'],
        sort: [['titleLc', 'asc'], ['amount', 'desc'], ['titleLc', 'asc']],
        categoryTags: {
          map: tags => {
            const mapped = {}
            if (tags.native['ID3v2.3']) {
              let tag = tags.native['ID3v2.3'].find(tag => tag.id === 'TIT1')
              if (!tag) tag = tags.native['ID3v2.3'].find(tag => tag.id === 'TXXX:CATEGORY')
              if (tag) {
                mapped.videoGame = tag.value
              }
            }
            if (tags.native.vorbis) {
              let tag = tags.native.vorbis.find(tag => tag.id === 'CONTENTGROUP')
              if (!tag) tag = tags.native.vorbis.find(tag => tag.id === 'CATEGORY')
              if (tag) {
                mapped.videoGame = tag.value
              }
            }
            if (tags.native.iTunes) {
              let tag = tags.native.iTunes.find(tag => tag.id === '----:com.apple.iTunes:CONTENTGROUP')
              if (!tag) tag = tags.native.iTunes.find(tag => tag.id === '----:com.apple.iTunes:CATEGORY')
              if (tag) {
                mapped.videoGame = tag.value
              }
            }
            if (mapped.videoGame) {
              mapped.category = mapped.videoGame
            }
            return mapped
          }
        }
      },
      {
        name: 'Module (all)',
        code: 'tracker',
        basedir: 'Tracker',
        taxonomy: ['albumartist__or__artists', 'album'],
        sort: [['amount', 'desc'], ['titleLc', 'asc']]
      },
      {
        name: 'Mixtapes',
        code: 'mixtapes',
        basedir: 'Mixtapes',
        taxonomy: ['albumartist__or__artists', 'album'],
        sort: [['amount', 'desc'], ['titleLc', 'asc']]
      }
    ]
  }
}

export async function runMusicIndexer(args) {
  const config = await getConfig(args.pathConfig)
  const pathMusicLibrary = config.music.music_library_dir
  const pathWinamp = config.music.winamp_dir
  const pathWin32Base = config.music.winamp_win32_basedir
  const pathData = path.join(args.pathCache, 'data')

  // Spin up the indexer and run it according to our profile.
  const musicIndexer = MusicIndexer({
    fileCachePath: path.join(pathData, 'music_files.json'),
    mlCachePath: path.join(pathData, 'music_ml.json'),
    waPath: pathWinamp
  })
  await musicIndexer.indexPath(pathMusicLibrary, {profile: getMusicProfile(pathWin32Base)})
}
