// zerglingbot <https://github.com/msikma/zerglingbot>
// © MIT license

const os = require('os')
const fs = require('fs').promises
const path = require('path')
const {ArgumentParser} = require('argparse')

const main = async () => {
  const pkgPath = path.join(__dirname, '..', '..', 'package.json')
  const pkgData = JSON.parse(await fs.readFile(pkgPath, 'utf8'))
  const cliParser = new ArgumentParser({
    version: pkgData.version,
    addHelp: true,
    addVersion: true,
    description: `${pkgData.description}`,
    epilog: 'Send questions and comments to @dada78641 on Twitter.'
  })

  cliParser.addArgument(['--cfg-path'], {help: 'Path to the config base directory.', metavar: 'PATH', dest: 'pathConfig', defaultValue: `${os.homedir()}/.config/zerglingbot/`})
  cliParser.addArgument(['--log-dates'], {help: 'Includes dates in the logger (for cron).', dest: 'includeDates', action: 'storeTrue'})
  cliParser.addArgument(['--restart'], {help: 'Request the active instance to exit.', dest: 'requestRestart', action: 'storeTrue'})
  cliParser.addArgument(['--path-ffmpeg'], {help: 'Path to the ffmpeg binary.', dest: 'pathFFMPEG', defaultValue: `/usr/local/bin/ffmpeg`})
  cliParser.addArgument(['--path-say'], {help: 'Path to the say binary.', dest: 'pathSay', defaultValue: `/usr/bin/say`})
  
  // Parse command line arguments; if something is wrong, the program exits here.
  const args = {...cliParser.parseArgs(), pathPackage: path.resolve(path.dirname(pkgPath)), packageData: pkgData}
  
  // Request that the active instance exits.
  if (args.requestRestart) {
    await fs.writeFile(path.join(args.pathConfig, 'restart.json'), JSON.stringify({date: `${new Date().toISOString()}`}), 'utf8')
  }
  else {
    // Start the bot.
    // If something goes wrong during initialization, the process will terminate.
    // Otherwise, the bot will continue running until exited using CTRL+C.
    require('zerglingbot-core/init').initFromCli(args)
  }
}

main()
