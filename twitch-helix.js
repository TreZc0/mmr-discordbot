const rp = require('request-promise');
const EventEmitter = require('events');

const jsonfile = require('jsonfile');
const configFile = './config.json';
const config = jsonfile.readFileSync(configFile);
const streamEmitter = new EventEmitter();

let startup = true;
let streams = {};
let game;
let tags = config["target-stream-tags"];

async function getOauthToken() {
  if (Date.now() < config["twitch-access-token-expires-At"] && config["twitch-access-token"].length > 0) {
    return config["twitch-access-token"];
  }
  const res = await rp.post("https://id.twitch.tv/oauth2/token", {
    body: {
      "client_id": config["twitch-client-id"],
      "client_secret": config["twitch-client-secret"],
      "grant_type": "refresh_token",
      "refresh_token": config["twitch-refresh-token"],
    },
    json: true,
  });
  if (!res["access_token"]) {
    throw new Error("API did not provide an OAuth token!");
  }
  updateConfig("twitch-access-token", res["access_token"]);
  updateConfig("twitch-access-token-expires-At",Date.now() + 3500 * 1000);

  return res["access_token"];
}

function getStreams(token) {
  return rp.get("https://api.twitch.tv/helix/streams", {
    headers: {
      "Client-ID": config["twitch-client-id"],
      "Authorization": "Bearer " + token,
    },
    qs: {
      "game_id": config["target-game-ids"],
      "first": 99,
      "type": 'live',
    },
    json: true,
  });
}

function getUsers (ids) {
  return rp.get("https://api.twitch.tv/helix/users", {
    headers: {
      "Client-ID": config["twitch-client-id"],
      "Authorization": "Bearer " + config["twitch-access-token"],
    },
    qs: {
      "id": ids,
    },
    json: true,
  });
}

async function streamLoop () {
  // Uncomment for logging.
  //console.log("Get streams...");
  //console.log(".--current streams--.");
  //console.log(streams)
  //console.log("'-------------------'");
  getOauthToken().then((token) => {
    return getStreams(token);
  }).then((data) => {
    let res = data.data;
    let user_ids = [ ];
    for (let i = 0;i<res.length;i++) {
      let stream = res[i];
      if (stream.tag_ids) {
        var speedrun = tags.find(tag => {
          if (stream.tag_ids.includes(tag))
            return true;
          return false;
        });
      }
      if (speedrun) {
        user_ids.push(stream["user_id"]);
        if (typeof streams[stream["user_id"]] === 'undefined') {
          streams[stream["user_id"]] = { };
        }
        streams[stream["user_id"]]["timer"] = 15;
        streams[stream["user_id"]]["title"] = stream["title"];
        streams[stream["user_id"]]["viewer_count"] = stream["viewer_count"];
        streams[stream["user_id"]]["game_id"] = stream["game_id"]
      }      
    }
    if (user_ids.length > 0) {
      return getUsers(user_ids);
    }
    return null;
  }).then((data) => {
    if (data === null) {
      return;
    }
    let res = data.data;
    for (let i = 0;i<res.length;i++) {
      let userElem = res[i];
      if (typeof streams[userElem["id"]]["url"] === 'undefined') {
        if (startup === true) {
          game = config["target-game-name"]
          streamEmitter.emit('messageStreamStarted', {
            "url": 'https://www.twitch.tv/' + userElem["login"],
            "name": userElem["login"],
            "title": streams[userElem["id"]]["title"],
            "game": game,
            "user_profile_image": userElem["profile_image_url"]
          });
        }
      }
      streams[userElem["id"]]["url"] = 'https://www.twitch.tv/' + userElem["login"];
      streams[userElem["id"]]["display_name"] = userElem["display_name"];
      streams[userElem["id"]]["login"] = userElem["login"];
    }
    return;
  }).catch((e) => {
    console.error(e);
  }).then(() => {
    setTimeout(streamLoop, 30000);
  });
}


function updateConfig(key, value) {
  config[key] = value;
  jsonfile.writeFile(configFile, config);
}

setTimeout(streamLoop, 7000);
setInterval(() => {
  for (let stream of Object.keys(streams)) {
    streams[stream]["timer"]--;
    if (streams[stream]["timer"] < 1) {
      if (typeof streams[stream]["url"] !== 'undefined' && typeof streams[stream]["title"] !== 'undefined') {
        streamEmitter.emit('messageStreamDeleted', {
          "url": streams[stream]["url"],
          "title": streams[stream]["title"],
          "id": stream
        });
      }
      delete streams[stream];
    }
  }
}, 20000);
streamEmitter.getStreams = () => {
  return streams;
}
module.exports = streamEmitter;