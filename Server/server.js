const { createServer } = require("http");
const { Server } = require("socket.io");
const jsonwebtoken = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const {insertScore} = require("./rds.js");

const jsonWebKeys = [
    {
        "alg": "RS256",
        "e": "AQAB",
        "kid": "FXb8+QBxhTtGPQgE5Egv7luhmOdKbU5Gp5AXFmDpb+I=",
        "kty": "RSA",
        "n": "qlmlT-krldgW7jKX4cr48afA1xAE7lzJfyzkpzNDCBCHiIjDYc4OI4dAcEtL5Qv40rCjj-O-Yh9GZqs5Lo1ySpYfWLHNSkaw32VfbWc4H4tQphJv3SRsAkyQcNpC8o989oyk1ZwDSOnoX0xXcdzKLinkqKr9fAV_Q2JqQmSTbTpUGHeneFyFE6wlo-hm8KJB7o-qHQDlKefGSkidZhmasKFd4OhQZRP1FCyj3V_6HFPvHtsNyZzzHJObTi5TvQSl9cv_sjCwp9wsw89aW1LmS7QU5T2xNadae1h0Fz9oslNm_5IWstTLMcYzGs5gt9i-eG5qmIpIt74qBtwTPOfxhw",
        "use": "sig"
    },
    {
        "alg": "RS256",
        "e": "AQAB",
        "kid": "BujPKxJAYrk7nQt4kdYUuv094tDJiXVzH18uMXcKdQQ=",
        "kty": "RSA",
        "n": "rhEnwqwPOEVHVg0U4w5Bq3vBVH_BdJtwRXSZJ4rcXLk4aWtyrDDDfQZM2OwR7bV0q3wH2OC8DGoCW9vtgtDNLHfUl5Q04BumxBxye61Ob_MuKpucTgx5sS9BuYnsmADmVZ4h7WRb2Zviu3HaQI6FSMqMbwZ7snB99Eym1PNCrUQpOHH2AYgReHMYemifSQ30BWXQP-mojZqXtdPuDMRfezELMG7PbCFEc-0mCSX5nNtV6gOSYgbsxkp3g433-b9VzdG9UtroFF0H1M0Ao-R1KvCN0zbpmp9HSrZTpaowQVzYRSjxGibz9DUn8vLZ2aCh0wXhXEv2ddu7LDWEXCwaPw",
        "use": "sig"
    }
]

function decodeTokenHeader(token) {
    const [headerEncoded] = token.split('.');
    const buff = new Buffer(headerEncoded, 'base64');
    const text = buff.toString('ascii');
    return JSON.parse(text);
}

function getJsonWebKeyWithKID(kid) {
    for (let jwk of jsonWebKeys) {
        if (jwk.kid === kid) {
            return jwk;
        }
    }
    return null
}

function verifyJsonWebTokenSignature(token, jsonWebKey, clbk) {
    const pem = jwkToPem(jsonWebKey);
    jsonwebtoken.verify(token, pem, {algorithms: ['RS256']}, (err, decodedToken) => clbk(err, decodedToken))
}

function validateToken(token, socket, callback) {
  const header = decodeTokenHeader(token);
  const jsonWebKey = getJsonWebKeyWithKID(header.kid);
  verifyJsonWebTokenSignature(token, jsonWebKey, (err, decodedToken) => {
      if (err) {
          console.error(err);
          console.log("Disconnect");

          socket.disconnect();
      } else {
        console.log("Token validated successfully");

        callback();
      }
  })
}

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: "*",
});

const allUsers = {};
const allRooms = [];

io.on("connection", (socket) => {
  allUsers[socket.id] = {
    socket: socket,
    online: true,
  };

  socket.on("validate_connection", (callback) => {
    const headers = socket.handshake.headers;

    const token = headers.token;

    console.log("Validating connection")

    validateToken(token, socket, callback);
  });

  socket.on("request_to_play", (data) => {
    const currentUser = allUsers[socket.id];
    currentUser.playerName = data.playerName;

    let opponentPlayer;

    for (const key in allUsers) {
      const user = allUsers[key];
      if (user.online && !user.playing && socket.id !== key) {
        opponentPlayer = user;
        break;
      }
    }

    if (opponentPlayer) {
      allRooms.push({
        player1: opponentPlayer,
        player2: currentUser,
      });

      currentUser.socket.emit("OpponentFound", {
        opponentName: opponentPlayer.playerName,
        playingAs: "circle",
      });

      opponentPlayer.socket.emit("OpponentFound", {
        opponentName: currentUser.playerName,
        playingAs: "cross",
      });

      currentUser.socket.on("playerMoveFromClient", (data) => {
        opponentPlayer.socket.emit("playerMoveFromServer", {
          ...data,
        });
      });

      opponentPlayer.socket.on("playerMoveFromClient", (data) => {
        currentUser.socket.emit("playerMoveFromServer", {
          ...data,
        });
      });
    } else {
      currentUser.socket.emit("OpponentNotFound");
    }
  });

  socket.on("disconnect2", function () {
    const currentUser = allUsers[socket.id];
    currentUser.online = false;
    currentUser.playing = false;

    for (let index = 0; index < allRooms.length; index++) {
      const { player1, player2 } = allRooms[index];

      if (player1.socket.id === socket.id) {
        player2.socket.emit("opponentLeftMatch");
        break;
      }

      if (player2.socket.id === socket.id) {
        player1.socket.emit("opponentLeftMatch");
        break;
      }
    }
  });

  socket.on("finished", (data) => {
    console.log("Finished game");

    insertScore(data.player1, data.player2, data.winner);
  });
});

httpServer.listen(3000);
