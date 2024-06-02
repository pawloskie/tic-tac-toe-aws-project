const { createServer } = require("http");
const { Server } = require("socket.io");
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

console.log('Utworzono mnie!');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: "*",
});

//var AWS = require("aws-sdk");
//AWS.config.update({
  //accessKeyId: "ASIAWA4GKXCTZJL5RS56",
  //secretAccessKey: "BnMJuvtXEOPT2ZLiN+C6kRiIbczJK4yrQjb2cfPO",
	//region: "us-east-1"
//});

const poolData = {
  UserPoolId: 'us-east-1_YGwHdi7CZ',
  ClientId: '72cggkn51lquplhe32ph0jqikn'
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

console.log('Załadowano mnie!');

var allUsers = {};

io.on("connection", (socket) => {
  allUsers[socket.id] = {
    socket: socket,
    cognitoUser: null
  };

  socket.on("login", (username, password, callback) => {
    const currentUser = allUsers[socket.id];

    console.log('Poczatek logowania');

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username: username,
      Password: password
    });
  
    const userData = {
      Username: username,
      Pool: userPool
    };
  
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    allUsers[socket.id].cognitoUser = cognitoUser; 

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        console.log('Token pobrany');

		callback({
          username: username,
          message: 'OK',
          token: result.getAccessToken().getJwtToken(),
          refreshToken: result.getRefreshToken().getToken()
        });
      },
      onFailure: (err) => {
        console.error(err.message || JSON.stringify(err));

        callback({
          username: username,
          message: err.message || JSON.stringify(err),
          token: null,
          refreshToken: null
        });
      }
    });

    console.log('Koniec logowania');
  });

  socket.on("register", (data) => {
      console.log('Siema');

      const attributeList = [];

      const dataEmail = {
        Name: 'email',
        Value: data.email
      };

      const attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);

      attributeList.push(attributeEmail);

      userPool.signUp(data.username, data.password, attributeList, null, (err, result) => {
        if (err) {
          console.error(err.message || JSON.stringify(err));
          return;
        }
        const cognitoUser = result.user;
        console.log('User name is ' + cognitoUser.getUsername());
      });
    });

  socket.on("refreshToken", (data) => {
    const currentUser = allUsers[socket.id];

    var refreshToken = new AmazonCognitoIdentity.CognitoRefreshToken({ RefreshToken: data.refreshToken});

    currentUser.cognitoUser.getSession(function(err, session) {
        if (!session.isValid()) {
            currentUser.cognitoUser.refreshSession(refreshToken, (err, session) => {
                currentUser.socket.emit("Refreshed", {
                  accessToken: session.getAccessToken.getJwtToken,
                });
            })
        }
        else {
          currentUser.socket.emit("Refreshed", {
            accessToken: null,
          });
        }
    });
  });
});

httpServer.listen(4000);