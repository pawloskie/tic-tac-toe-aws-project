import React, { useState, useEffect } from "react";
import "./App.css";
import Square from "./Square/Square";
import { io } from "socket.io-client";
import Swal from "sweetalert2";

const renderFrom = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const App = () => {
  const [gameState, setGameState] = useState(renderFrom);
  const [currentPlayer, setCurrentPlayer] = useState("circle");
  const [finishedState, setFinishetState] = useState(false);
  const [finishedArrayState, setFinishedArrayState] = useState([]);
  const [playOnline, setPlayOnline] = useState(false);
  const [socket, setSocket] = useState(null);
  const [authSocket, setAuthSocket] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState(null);
  const [playingAs, setPlayingAs] = useState(null);
  const [disconnected, setDisconnected] = useState(false);
	
  const checkWinner = () => {
    // row dynamic
    for (let row = 0; row < gameState.length; row++) {
      if (
        gameState[row][0] === gameState[row][1] &&
        gameState[row][1] === gameState[row][2]
      ) {
        setFinishedArrayState([row * 3 + 0, row * 3 + 1, row * 3 + 2]);
        return gameState[row][0];
      }
    }

    // column dynamic
    for (let col = 0; col < gameState.length; col++) {
      if (
        gameState[0][col] === gameState[1][col] &&
        gameState[1][col] === gameState[2][col]
      ) {
        setFinishedArrayState([0 * 3 + col, 1 * 3 + col, 2 * 3 + col]);
        return gameState[0][col];
      }
    }

    if (
      gameState[0][0] === gameState[1][1] &&
      gameState[1][1] === gameState[2][2]
    ) {
      return gameState[0][0];
    }

    if (
      gameState[0][2] === gameState[1][1] &&
      gameState[1][1] === gameState[2][0]
    ) {
      return gameState[0][2];
    }

    const isDrawMatch = gameState.flat().every((e) => {
      if (e === "circle" || e === "cross") return true;
    });

    if (isDrawMatch) return "draw";

    return null;
  };

  useEffect(() => {
    const winner = checkWinner();

    console.log("Winner: " + winner + " currPlayer: " + currentPlayer + " playingAs: " + playingAs);

    if (winner === playingAs && currentPlayer === playingAs) {
      socket?.emit("finished", { player1: playerName, player2: opponentName, winner: playerName });

      setFinishetState(winner);
    }
  }, [gameState]);

  async function showRegistrationForm (newSocket) {
		const result = Swal.fire({
			title: 'Register',
			html: `
				<input type="text" id="new-username" class="swal2-input" placeholder="Username">
				<input type="text" id="new-email" class="swal2-input" placeholder="Email">
				<input type="password" id="new-password" class="swal2-input" placeholder="Password">
				<input type="password" id="confirm-password" class="swal2-input" placeholder="Confirm Password">
			`,
			showCancelButton: true,
			confirmButtonText: 'Register',
			preConfirm: () => {
				const username = Swal.getPopup().querySelector('#new-username').value;
				const email = Swal.getPopup().querySelector('#new-email').value;
				const password = Swal.getPopup().querySelector('#new-password').value;
				const confirmPassword = Swal.getPopup().querySelector('#confirm-password').value;
				if (!username || !email || !password || !confirmPassword) {
					Swal.showValidationMessage(`Please fill out all fields`);
				} else if (password !== confirmPassword) {
					Swal.showValidationMessage(`Passwords do not match`);
				}
				return { username: username, email: email, password: password };
			}
		}).then((loginResult) => {
			if (loginResult.isConfirmed) {
				const { username, email, password } = loginResult.value;
				// Handle registration with username and password
				console.log(`New Username: ${username}, New Email: ${email}, New Password: ${password}`);
				
				newSocket?.emit("register", {
          username: username,
          email: email,
          password: password
        });

        console.log(newSocket);
        console.log(authSocket);
        console.log('Emited');
				
				return username;
			}
		});
		
		return result;
	};

  async function playOnlineClick () {  
    const newSocket = io(`http://${window.location.hostname}:4000`, {
      autoConnect: true,
    });

    setAuthSocket(newSocket);

    await Swal.fire({
      title: "Login",
      html: `
              <input type="text" id="username" class="swal2-input" placeholder="Username">
              <input type="password" id="password" class="swal2-input" placeholder="Password">
          `,
      showCancelButton: true,
      showDenyButton: true,
          confirmButtonText: 'OK',
          cancelButtonText: 'Cancel',
          denyButtonText: 'Register',
          preConfirm: () => {
              const username = Swal.getPopup().querySelector('#username').value;
              const password = Swal.getPopup().querySelector('#password').value;
              if (!username || !password) {
                  Swal.showValidationMessage(`Please enter both username and password`);
              }
              return { username: username, password: password };
          }
      }).then(async (loginResult) => {
          if (loginResult.isConfirmed) {
              const { username, password } = loginResult.value;
              // Handle login with username and password
              console.log(`Username: ${username}, Password: ${password}`);
        
              newSocket?.emit("login", username, password, OnLoginFinished);
          } else if (loginResult.isDenied) {
              // Show registration form
              await showRegistrationForm(newSocket);
          }
      });

    console.log("Koniec playOnlineClick");
  };

  function OnLoginFinished (data) {
	  if (data.token === null) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: data.message
      });
	  }
	  else if (socket === null) {
		  console.log(socket);
      console.log("Odpalamy!");

      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      const username = data.username;
      setPlayerName(username);

      const newSocket = io(`http://${window.location.hostname}:3000`, {
        autoConnect: true,
        extraHeaders: {
          "token": localStorage.getItem('accessToken')
        }         
		  });

      newSocket?.emit("validate_connection", () => OnValidatedGame(username, newSocket));

		  setSocket(newSocket);
	  }
  };

  function OnValidatedGame (username, newSocket) {
    console.log("Game validated, ready to play, username: " + username);
    console.log(newSocket);

    newSocket?.emit("request_to_play", {
      playerName: username,
    });
  }

  socket?.on("opponentLeftMatch", () => {
    setFinishetState("opponentLeftMatch");
  });

  socket?.on("playerMoveFromServer", (data) => {
    const id = data.state.id;
    setGameState((prevState) => {
      let newState = [...prevState];
      const rowIndex = Math.floor(id / 3);
      const colIndex = id % 3;
      newState[rowIndex][colIndex] = data.state.sign;
      return newState;
    });
    setCurrentPlayer(data.state.sign === "circle" ? "cross" : "circle");

    authSocket?.emit("refreshToken", {
        accessToken: localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken'),
    });
  });

  socket?.on("connect", function () {
    setPlayOnline(true);
  });

  socket?.on("OpponentNotFound", function () {
    setOpponentName(false);
  });

  socket?.on("OpponentFound", function (data) {
    setPlayingAs(data.playingAs);
    setOpponentName(data.opponentName);
  });

  socket?.on("Refreshed", function (data) {
    if (data.accessToken !== null) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    
    console.log('Refreshed token');
  });

  async function disconnect () {
    socket?.emit("disconnect2");

    setDisconnected(true);

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  if (!disconnected && !playOnline) {
    return (
      <div className="main-div">
        <button onClick={playOnlineClick} className="playOnline">
          Play Online
        </button>
      </div>
    );
  }

  if (!disconnected && playOnline && !opponentName) {
    return (
      <div className="waiting">
        <p>Waiting for opponent</p>
      </div>
    );
  }

  if (!disconnected) {
    return (
      <div className="main-div">
        <div className="move-detection">
          <div
            className={`left ${
              currentPlayer === playingAs ? "current-move-" + currentPlayer : ""
            }`}
          >
            {playerName}
          </div>
          <button onClick={disconnect} className="logout">
            Logout
          </button>
          <div
            className={`right ${
              currentPlayer !== playingAs ? "current-move-" + currentPlayer : ""
            }`}
          >
            {opponentName}
          </div>
        </div>
        <div>
          <h1 className="game-heading water-background">Tic Tac Toe</h1>
          <div className="square-wrapper">
            {gameState.map((arr, rowIndex) =>
              arr.map((e, colIndex) => {
                return (
                  <Square
                    socket={socket}
                    playingAs={playingAs}
                    gameState={gameState}
                    finishedArrayState={finishedArrayState}
                    finishedState={finishedState}
                    currentPlayer={currentPlayer}
                    setCurrentPlayer={setCurrentPlayer}
                    setGameState={setGameState}
                    id={rowIndex * 3 + colIndex}
                    key={rowIndex * 3 + colIndex}
                    currentElement={e}
                  />
                );
              })
            )}
          </div>
          {finishedState &&
            finishedState !== "opponentLeftMatch" &&
            finishedState !== "draw" && (
              <h3 className="finished-state">
                {finishedState === playingAs ? "You " : finishedState} won the
                game
              </h3>
            )}
          {finishedState &&
            finishedState !== "opponentLeftMatch" &&
            finishedState === "draw" && (
              <h3 className="finished-state">It's a Draw</h3>
            )}
        </div>
        {!finishedState && opponentName && (
          <h2>You are playing against {opponentName}</h2>
        )}
        {finishedState && finishedState === "opponentLeftMatch" && (
          <h2>You won the match, Opponent has left</h2>
        )}
      </div>
    );
  }
};

export default App;
