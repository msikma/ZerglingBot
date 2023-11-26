// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

import os from 'os'
import fs from 'fs/promises'
import path from 'path'
import url from 'url'
import {ArgumentParser} from 'argparse'

const main = async () => {
  const pkgPath = path.join(url.fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'package.json')
  const pkgData = JSON.parse(await fs.readFile(pkgPath, 'utf8'))
  const parser = new ArgumentParser({
    add_help: true,
    description: `${pkgData.description}.`,
    epilog: 'Send questions and comments to @dada78641 on Twitter.'
  })

  parser.add_argument('-v', '--version', {action: 'version', version: `${pkgData.version}`})
  parser.add_argument('--cfg-path', {help: 'path to the config directory', metavar: 'PATH', dest: 'pathConfig', default: `${os.homedir()}/.config/zerglingbot/`})
  parser.add_argument('--cfg-cache', {help: 'path to the cache directory', metavar: 'PATH', dest: 'pathCache', default: `${os.homedir()}/.cache/zerglingbot/`})
  parser.add_argument('--restart', {help: 'request the active instance to exit', dest: 'requestRestart', action: 'store_true'})
  parser.add_argument('--no-logging', {help: 'skips remote logging to Discord', dest: 'noRemoteLogging', action: 'store_true'})
  parser.add_argument('--log-dates', {help: 'includes dates in the logger (for cron)', dest: 'includeDates', action: 'store_true'})

  parser.add_argument('--run-music-indexer', {help: 'runs the music indexing script', dest: 'actionIndexMusic', action: 'store_true'})

  parser.add_argument('--path-ffmpeg', {help: 'path to the ffmpeg binary', dest: 'pathFFMPEG', metavar: 'PATH', default: `/usr/local/bin/ffmpeg`})
  parser.add_argument('--path-ffprobe', {help: 'path to the ffprobe binary', dest: 'pathFFProbe', metavar: 'PATH', default: `/usr/local/bin/ffprobe`})
  parser.add_argument('--path-say', {help: 'path to the say binary', dest: 'pathSay', metavar: 'PATH', default: `/usr/bin/say`})
  parser.add_argument('--path-node', {help: 'path to the Node binary', dest: 'pathNode', metavar: 'PATH', default: `/usr/local/bin/node`})
  
  // Parse command line arguments; if something is wrong, the program exits here.
  const args = {
    ...parser.parse_args(),
    pathPackage: path.resolve(path.dirname(pkgPath)),
    packageData: pkgData
  }
  
  // Request that the active instance exits.
  if (args.requestRestart) {
    await fs.writeFile(path.join(args.pathConfig, 'restart.json'), JSON.stringify({date: `${new Date().toISOString()}`}), 'utf8')
  }
  if (args.actionIndexMusic) {
    const {runMusicIndexer} = await import('./actions/music-indexer.js')
    runMusicIndexer(args)

  }
  else {
    // Start the bot.
    // If something goes wrong during initialization, the process will terminate.
    // Otherwise, the bot will continue running until exited using CTRL+C.
    const zerglingBot = await import('zerglingbot-core/init.js')
    zerglingBot.initFromCli(args)
  }
}

main()
