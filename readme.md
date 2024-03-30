[![MIT license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)

# ZerglingBot

![alt text](resources/zergling-small.png)

The primary bot for the [Dada78641 Twitch stream](https://www.twitch.tv/dada78641). It contains the following components:

* Twitch chat bot
* Twitch API client interface (including PubSub)
* OBS websocket interface
* Backend tools for obtaining data, e.g. from StarCraft and Winamp

These components work together to operate the stream in conjunction with the [widgets](https://github.com/msikma/stream-dada78641-widgets).

This bot is designed specifically for my stream and is not a general purpose program.

## Configuration

The bot requires a config file to be present at `~/.config/zerglingbot/config.json`. See [the example config file](resources/sample.config.json) and modify it with your own data.

### Getting a token for the config file

To connect to Twitch chat, you need to have a chatbot application registered and get a token for it. Follow these steps:

1. Register a new Twitch account for your bot
1. [Ensure you have 2FA enabled](https://www.twitch.tv/settings/security)
1. Login to the [Twitch Developers Console](https://dev.twitch.tv/console)
1. Register an application with the redirect URL set to `http://localhost:3000` and get its **Client ID** and **Secret**
1. Open a browser and visit the following URL, adding your own Client ID:
    `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=<your client id>&redirect_uri=http://localhost:3000&scope=chat%3Aread+chat%3Aedit`

    and get the access token after it redirects

For more information, see Twitch's [Getting OAuth Access Tokens](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth#examples-of-the-three-flows) page.

## Prerequisites

* Node v16.0 or up
* OBS websocket v5.1.0
* [ffmpeg](https://ffmpeg.org/) – for running the TTS module

## Links

* [OBS websocket](https://github.com/obsproject/obs-websocket) ([obs-websocket-js](https://github.com/obs-websocket-community-projects/obs-websocket-js))
* [Twitch's getting started guide for IRC bots](https://dev.twitch.tv/docs/irc/get-started)
* [Getting OAuth Access Tokens](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth#examples-of-the-three-flows)

## License

MIT license.
