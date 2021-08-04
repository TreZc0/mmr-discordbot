//Modules
const Discord = require('discord.js');
const jsonfile = require('jsonfile');
const fs = require('fs');

//Global
const configFile = './config.json';
const config = jsonfile.readFileSync(configFile);

//Twitch Init
const twitch = require('./twitch-helix');

const discordToken = config["discord-token"];
const activeGuild = config["discord-server-id"];
const roleHandlingChannel = config["discord-role-channel-id"];
const streamNotificationChannel = config["discord-notifications-channel-id"];

//Role Init
const numToDiscordEmojis = {
  0: '0⃣',
  1: '1⃣',
  2: '2⃣',
  3: '3⃣',
  4: '4⃣',
  5: '5⃣',
  6: '6⃣',
  7: '7⃣',
  8: '8⃣',
  9: '9⃣',
  10: '🔟'
};
const roles = Object.assign({}, config["discord-available-roles"]);


//State Init
const stateFile = './state.json';
let state = {
  activeReactionMessage: ""
};
if (!fs.existsSync(stateFile)) {
  jsonfile.writeFileSync(stateFile, state);
} else {
  state = jsonfile.readFileSync(stateFile);
}

//Discord Init
let botIsReady = false;
const botIntents = new Discord.Intents();
const bot = new Discord.Client({
  intents: botIntents,
  restTimeOffset: 150
});

botIntents.add("GUILDS", "GUILD_MEMBERS", "GUILD_BANS", "GUILD_EMOJIS", "GUILD_INTEGRATIONS", "GUILD_WEBHOOKS", "GUILD_INVITES", "GUILD_VOICE_STATES", "GUILD_PRESENCES", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILD_MESSAGE_TYPING", "DIRECT_MESSAGES", "DIRECT_MESSAGE_REACTIONS", "DIRECT_MESSAGE_TYPING");

bot.on('ready', () => {
  botIsReady = true;
  console.log('Logged in as %s - %s\n', bot.user.username, bot.user.id);
  if (state.activeReactionMessage.length > 0) {
    bot.guilds.cache.get(activeGuild).channels.cache.get(roleHandlingChannel).messages.fetch(state.activeReactionMessage, true, true);
  }
});

//Role Handling via Reactions
bot.on('messageReactionAdd', (reaction, user) => {
  if (state.activeReactionMessage.length == 0 || state.activeReactionMessage != reaction.message.id)
    return;

  let memberObj = bot.guilds.cache.get(reaction.message.guild.id).members.cache.get(user.id);
  if (memberObj) {

    let roleIndex = Object.keys(numToDiscordEmojis).find(key => numToDiscordEmojis[key] === reaction.emoji.name);

    let roleToAdd = bot.guilds.cache.get(reaction.message.guild.id).roles.cache.find(role => role.name === roles[roleIndex]);
    if (roleToAdd) {

      if (!memberObj.roles.cache.has(roleToAdd)) {
        memberObj.roles.add(roleToAdd).then(newMemberObj => newMemberObj.fetch(true));
      }
    }
  }

})

bot.on('messageReactionRemove', (reaction, user) => {
  if (state.activeReactionMessage.length == 0 || state.activeReactionMessage != reaction.message.id)
    return;

  let memberObj = bot.guilds.cache.get(reaction.message.guild.id).members.cache.get(user.id);

  if (memberObj) {

    let roleIndex = Object.keys(numToDiscordEmojis).find(key => numToDiscordEmojis[key] === reaction.emoji.name);

    let roleToRemove = bot.guilds.cache.get(reaction.message.guild.id).roles.cache.find(role => role.name === roles[roleIndex]);
    if (roleToRemove) {

      memberObj.fetch(true).then(updatedMemberObj => {
        if (updatedMemberObj.roles.cache.find(role => role.name == roleToRemove.name)) {
          updatedMemberObj.roles.remove(roleToRemove).then(updatedMemberObj => updatedMemberObj.fetch(true));
        }
      });
    }
  }
})


//Channel Management
async function roleManagement(message) {
  if (message.member != undefined) {
    if (message.member.permissions.has("MANAGE_MESSAGES")) {
      if (message.content.toLowerCase() === "!clear") {
        _clearChat(message.channel.id);
        return;
      } else if (message.content.toLowerCase().startsWith("!info")) {
        var postDate = JSON.parse(JSON.stringify(new Date()));

        let embed = {
          "title": "**Role Bot Commands**",
          "description": "This bot can be used to assign different roles in this discord server by reacting to this message.\n**Thank you for being a part of the community!**",
          "color": 1619777,
          "timestamp": postDate,
          "footer": {
            "text": "Discord RoleBot by TreZc0_"
          },
          "author": {
            "name": config["bot-user-name"],
            "icon_url": config["bot-avatar-url"]
          },
          "fields": []
        };

        Object.keys(roles).forEach(roleIndex => {
          let fieldObject = {};

          fieldObject.name = roles[roleIndex];
          fieldObject.value = numToDiscordEmojis[roleIndex];
          embed.fields.push(fieldObject);
        });

        let reactions = [];

        message.channel.send({embed})
          .then(embedMessage => {
            message.delete().catch(console.error);
            embedMessage.pin();

            for (let i = 0; i < Object.keys(roles).length; i++) {
              let emoji = numToDiscordEmojis[i] //0-x number reaction emoji
              //console.log(emoji)
              reactions.push(embedMessage.react(emoji));
            }
            Promise.all(reactions);


            state.activeReactionMessage = embedMessage.id;
            commitState();
          });
      }
    }
  }
};

async function streamNotificationManagement(message) {
  if (message.member != undefined) {
    if (message.member.permissions.has("MANAGE_MESSAGES")) {
      if (message.content.toLowerCase() === "!clear") {
        _clearChat(message.channel.id);
        return;
      }
    }
  }
}

//Automatic Stream Announcement
twitch.on('messageStreamStarted', (stream) => {
  //console.log(stream.url +' just went live on Twitch playing ' + stream.game + ': ' + stream.title);
  let channel = bot.guilds.cache.get(activeGuild).channels.cache.get(streamNotificationChannel);

  var postDate = JSON.parse(JSON.stringify(new Date()));
  let title = escapeDiscordSpecials(stream.name) + " just went live: " + escapeDiscordSpecials(stream.url);
  title = title.replace("_", "\\_");
  const embed = {
    "title": escapeDiscordSpecials(title),
    "description": escapeDiscordSpecials(stream.title),
    "url": stream.url,
    "color": 1369976,
    "timestamp": postDate,
    "footer": {
      "icon_url": config["bot-avatar-url"],
      "text": "Playing " + stream.game
    },
    "thumbnail": {
      "url": "https://m.media-amazon.com/images/I/51Bq+i7aLdL._SX466_.jpg"
    },
    "author": {
      "name": escapeDiscordSpecials(stream.name) + " is now live on Twitch!",
      "url": stream.url,
      "icon_url": config["bot-avatar-url"]
    }
  };

  channel.send({embed}).catch((e) => {
    console.error(e);
  });
});

//Automatic Stream Cleanup
twitch.on('messageStreamDeleted', (stream) => {
  //console.log (stream.url + " went offline");

  let channel = bot.guilds.cache.get(activeGuild).channels.cache.get(streamNotificationChannel);
  channel.messages.fetch({ limit: 80 })
    .then(messages => {
      messages.forEach(message => {
        if ((message.embeds) && (message.embeds.length > 0)) {
          if (message.embeds[0].message.embeds[0].url == stream.url) {
            message.delete();
          }
        }
      })
    })
    .catch((e) => {
      console.error(e);
    });
});

//Message Handler
bot.on('message', message => {
  if (message.author.bot)
    return;

  if (message.channel.id == roleHandlingChannel)
    roleManagement(message);
  else if (message.channel.id == streamNotificationChannel)
    streamNotificationManagement(message);
});

//Discord Handler
async function _clearChat(textChannelID) {

  let channel = bot.channels.cache.get(textChannelID);

  if (!channel)
    return;

  let messages = await wipeChannelAndReturnMessages(channel);

  console.log("Channel Clearing: Removed", messages.size, "messages in channel", channel.name);
}

async function wipeChannelAndReturnMessages(textChannel) {
  console.log("clearing all messages from " + textChannel.id);

  let deletedMessages = await textChannel.bulkDelete(99, true);

  let msgPool = deletedMessages;

  while (deletedMessages.size > 0) {
    deletedMessages = await textChannel.bulkDelete(99, true);
    if (deletedMessages.size > 0)
      msgPool = msgPool.concat(deletedMessages);
  }

  return msgPool;
}

//Sys
function commitState() {
  jsonfile.writeFile(stateFile, state);
}

function escapeDiscordSpecials(inputString) {
  return inputString.replace(/_/g, "\\_").replace(/\*/g, "\\*").replace(/~/g, "\\~");
}


//Init
bot.login(discordToken)
  .catch(err => {
    console.error(err);
  });


bot.on('error', () => {
  console.error("The bot encountered a connection error!!");

  setTimeout(() => {

    bot.login(discordToken);
  }, 10000);
});

bot.on('disconnect', () => {
  console.error("The bot disconnected!!");

  botIsReady = false;

  setTimeout(() => {
    bot.login(discordToken);
  }, 10000);
});