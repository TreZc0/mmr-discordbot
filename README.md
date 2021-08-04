# MMR DiscordBot

This is a simple Discord Bot for the MM Randomizer Discord, written in Node.JS.
The twitch module is based off of [Dustforce Discord Bot](https://github.com/Joel4558/Dustforce-discord).

## Requirements
* Node.js v12.0.0 or newer is required
* Twitch API Client with Secret
* Initial Twitch OAuth Access and Refresh Token 
* Discord Bot Token

## Features
* Automatic Stream announcements based on Twitch Game and Stream Tag Filters
* Role management - users can get or remove roles via reactions
* Persistent configuration via state file
* In this configuration, the bot can only serve a single Discord Guild.

## Configuration
The repository contains an example file:
* "discord-server-id": The guild ID for the Discord server
* "discord-role-channel-id": The channel ID of the channel used for role management
* "discord-notifications-channel-id": THe channel ID of the channel used for stream announcements
* "discord-token": The Discord bot token
* "discord-available-roles": String-Array of the role names to be offered by the bot,
* "bot-user-name": The name the bot should display in its embeds
* "bot-avatar-url": URL of the avatar the bot should display in its embeds
* "target-game-ids": String-Array of the Twitch Game IDs the bot should listen for ([Games API Reference](https://dev.twitch.tv/docs/api/reference#get-games))
* "target-stream-tags": String-Array of the Twitch Stream Tags the bot should listen for ([Tags API Reference](https://dev.twitch.tv/docs/api/reference#get-all-stream-tags))
* "target-game-name": The name of the game the bot should display in announcement embeds
* "twitch-client-id": Client ID for the Twitch Application ([Twitch Dev Dashboard](https://dev.twitch.tv/console))
* "twitch-client-secret": Client Secret for the Twitch Application ([Twitch Dev Dashboard](https://dev.twitch.tv/console))
* "twitch-refresh-token": Initial refresh token used to refresh the api access ([Twitch OAuth Documentation](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth#oauth-authorization-code-flow))
* "twitch-access-token": Initial refresh token used to refresh the api access ([Twitch OAuth Documentation](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth#oauth-authorization-code-flow))
* "twitch-access-token-expires-At": Expiry Date of the current access token. Can be left at 0 on initial setup.
