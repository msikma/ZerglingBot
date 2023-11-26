[![MIT license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)

# ZerglingBot

The primary bot for the [Dada78641 Twitch stream](https://www.twitch.tv/dada78641). It contains the following components:

* Twitch chat bot
* Twitch API client interface (including PubSub)
* OBS websocket interface
* Backend tools for obtaining data, e.g. from StarCraft and Winamp

These components work together to operate the stream.

This bot is designed specifically for my stream and is not a general purpose program.

## Configuration

The bot requires a config file to be present at `~/.config/zerglingbot/config.json`. The following is an example:

```json
{
  "app": {
    "client_id": "id",
    "client_secret": "secret",
    "redirect_uri": "http://localhost:3000"
  },
  "obs": {
    "address": "localhost:4444",
    "password": "password"
  },
  "actions": {
    "skin": {
      "skin_base_dir": "/path/to/Skins"
    },
    "discord": {
      "invite_link": "https://discord.gg/link"
    }
  },
  "tasks": {
    "ladderinfo": {
      "player_id": "bnet_username"
    }
  },
  "music": {
    "music_library_dir": "/path/to/music/files"
  },
  "chat": {
    "auth_username": "ZerglingBot",
    "channels": {
      "1234": "Username"
    },
    "token": {
      "access_token": "token",
      "scope": ["chat:edit", "chat:read"],
      "token_type": "bearer"
    }
  },
  "twitch": {
    "auth_code": "code",
    "scope": [
      "bits:read",
      "channel:manage:broadcast",
      "channel:manage:polls",
      "channel:manage:predictions",
      "channel:manage:raids",
      "channel:manage:redemptions",
      "channel:manage:vips",
      "channel:read:goals",
      "channel:read:predictions",
      "channel:read:redemptions",
      "channel:read:vips",
      "clips:edit",
      "moderation:read",
      "moderator:manage:announcements",
      "moderator:manage:banned_users",
      "moderator:manage:chat_messages",
      "moderator:manage:chat_settings",
      "moderator:read:chat_settings",
      "user:edit",
      "user:manage:chat_color",
      "user:read:broadcast",
      
      "channel:moderate",
      "chat:edit",
      "chat:read",
      "whispers:read",
      "whispers:edit"
    ],
    "username": "dada78641",
    "id": "1234"
  }
}
```

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
* OBS websocket v4.9
* [ffmpeg](https://ffmpeg.org/)
* [bnetdata](https://github.com/msikma/bnetdata) – needed for the StarCraft data component
* [Dada Skin Changer](https://github.com/msikma/dada-skin-changer) – needed for communicating with the Winamp instance

## Links

* [OBS websocket](https://github.com/obsproject/obs-websocket) ([obs-websocket-js](https://github.com/obs-websocket-community-projects/obs-websocket-js))
* [Twitch's getting started guide for IRC bots](https://dev.twitch.tv/docs/irc/get-started)
* [Getting OAuth Access Tokens](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth#examples-of-the-three-flows)

## License

MIT license.
