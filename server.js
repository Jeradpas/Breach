/* Connexion au client */
var io = require('socket.io').listen(8080);

/* Récupération des fonctions et constantes nécessaires */
const { initGame, gameLoop, keyMoved, mouseMoved, cpuMoved, resetState } = require('./game');
const { FRAME_RATE } = require('./constants');
const { makeid } = require('./utils');

/* Variables de serveurs */
var state = {};
var clientRooms = {};
var playerNames = {};



/* Gestion des requêtes au serveur */
io.on('connection', client => {

  client.on('mousemove', handleMouseMove);
  client.on('keydown', handleKeyDown);
  client.on('cpumove', handleCpuMove);
  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);
  client.on('localGame', handleLocalGame);
  client.on('cpuGame', handleCpuGame);

  /* Gestion de la création d'une partie en ligne */
  function handleNewGame(playerName) {
    // Création de l'ID et initialisation
    let roomCode = makeid(5);
    state[roomCode] = initGame();
    playerNames[roomCode] = [];

    // Informations liées au joueur 1
    clientRooms[client.id] = roomCode;
    playerNames[roomCode][0] = playerName;

    // Envoi des éléments au contrôleur du joueur 1
    client.emit('gameCode', roomCode);
    client.join(roomCode);
    client.number = 1;
    client.emit('init', 1);
  }

  /* Gestion de la rejonction à une partie en ligne */
  function handleJoinGame(playerName, roomCode) {
    // Récupération du salon
    const room = io.sockets.adapter.rooms[roomCode];

    // Utilisateurs connectés au salon
    let allUsers;
    if (room) {
      allUsers = room.sockets;
    }

    // Nombre de clients connectés au salon
    let numClients = 0;
    if (allUsers) {
      numClients = Object.keys(allUsers).length;
    }

    // Vérifie si le salon existe et s'il y a de la place
    if (numClients === 0) {
      client.emit('unknownCode');
      return;
    } else if (numClients > 1) {
      client.emit('tooManyPlayers');
      return;
    }

    // Informations liées au joueur 2
    clientRooms[client.id] = roomCode;
    playerNames[roomCode][1] = playerName;

    // Envoi des éléments au contrôleur du joueur 2
    client.emit('gameCode', roomCode);
    client.join(roomCode);
    client.number = 2;
    client.emit('init', 2);

    // Envoi des éléments nécessaires à tous les contrôleurs (ici 2)
    io.sockets.in(roomCode).emit('names', playerNames[roomCode]);
    startGameInterval(roomCode);
  }

  /* Gestion d'une partie en local */
  function handleLocalGame(playerNameOne, playerNameTwo) {
    // Création de l'ID et initialisation
    let roomCode = makeid(5);
    state[roomCode] = initGame();
    playerNames[roomCode] = [playerNameOne, playerNameTwo];
    clientRooms[client.id] = roomCode;

    // Envoi des éléments à l'unique contrôleur
    client.emit('gameCode', roomCode);
    client.join(roomCode);
    client.number = 1;
    client.emit('init', 1);

    // Envoi des éléments nécessaires à tous les contrôleurs (ici 1)
    io.sockets.in(roomCode).emit('names', playerNames[roomCode]);
    startGameInterval(roomCode);
  }

  /* Gestion d'une partie contre un CPU */
  function handleCpuGame(playerName) {    // équivalent à : handleLocalGame(playerName, "D. Muller") 
    // Création de l'ID et initialisation
    let roomCode = makeid(5);
    state[roomCode] = initGame();
    playerNames[roomCode] = [playerName, "D. Muller"];
    clientRooms[client.id] = roomCode;

    // Envoi des éléments à l'unique contrôleur
    client.emit('gameCode', roomCode);
    client.join(roomCode);
    client.number = 1;
    client.emit('init', 1);

    // Envoi des éléments nécessaires à tous les contrôleurs (ici 1)
    io.sockets.in(roomCode).emit('names', playerNames[roomCode]);
    startGameInterval(roomCode);
  }

  /* Gestion du contrôle par la souris */
  function handleMouseMove(mouselocation) {
    const roomCode = clientRooms[client.id];
    if (!roomCode || !state) {
      return;
    }

    const pos = mouseMoved(mouselocation, state[roomCode].paddles[client.number - 1]);

    if (pos) {
      state[roomCode].paddles[client.number - 1].pos = pos;
    }
  }

  /* Gestion du contrôle par le clavier */
  function handleKeyDown(key) {
    const roomCode = clientRooms[client.id];
    if (!roomCode || !state) {
      return;
    }

    const pos = keyMoved(key, state[roomCode].paddles[1]);

    if (pos) {
      state[roomCode].paddles[1].pos = pos;
    }
  }

  /* Gestion du contrôle par le CPU */
  function handleCpuMove() {
    const roomCode = clientRooms[client.id];
    if (!roomCode) {
      return;
    }

    pos = cpuMoved(state[roomCode]);

    if (pos) {
      state[roomCode].paddles[1].pos = pos;
    }
  }
});



/* Fonction orchestrant la mise à jour régulière */
function startGameInterval(roomCode) {
  const intervalId = setInterval(() => {
    const winner = gameLoop(state[roomCode]);
    
    if (!winner) {
      emitGameState(roomCode, state[roomCode])
    } else {
      emitGameOver(roomCode, state[roomCode], winner);
      state[roomCode] = null;
      clearInterval(intervalId);
    }
  }, 1000 / FRAME_RATE);
}

/* Fonction communiquant l'état d'une partie en cours */
function emitGameState(roomCode, gameState) {
  io.sockets.in(roomCode)
    .emit('gameState', JSON.stringify(gameState));
}

/* Fonction communiquant l'état d'une partie terminée */
function emitGameOver(roomCode, gameState, winner) {
  io.sockets.in(roomCode).emit('gameState', JSON.stringify(gameState));

  state[roomCode].score = [0, 0];
  state[roomCode] = resetState(state[roomCode]);

  io.sockets.in(roomCode).emit('gameOver', JSON.stringify({ winner }));
  io.sockets.in(roomCode).emit('gameState', JSON.stringify(state[roomCode]));
}