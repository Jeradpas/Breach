/* Connexion au serveur (local) */
const socket = io('http://localhost:8080');

/* Gestion des messages du serveur */
socket.on('init', handleInit);
socket.on('names', handleNames);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);
socket.on('gameCode', handleGameCode);
socket.on('unknownCode', handleUnknownCode);
socket.on('tooManyPlayers', handleTooManyPlayers);

/* Gestion des éléments sur la page */
const gameScreen = document.getElementById('gameScreen');
const homeScreen = document.getElementById('homeScreen');
const newGameBtn = document.getElementById('newGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const localGameBtn = document.getElementById('localGameBtn');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const playerNameInput = document.getElementById('playerNameInput');
const secondNameInput = document.getElementById('secondNameInput');
const playerOneName = document.getElementById('playerOneName');
const playerTwoName = document.getElementById('playerTwoName');
const playerOneScore = document.getElementById('playerOneScore');
const playerTwoScore = document.getElementById('playerTwoScore');

function joinBtn() {
  document.getElementById("joinBtn").style.display = "none";
  document.getElementById("joinDiv").style.display = "flex";
}

function localBtn() {
  document.getElementById("localBtn").style.display = "none";
  document.getElementById("localDiv").style.display = "flex";
}

/* Gestion des événements sur la page */
newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);
localGameBtn.addEventListener('click', localGame);
cpuGameBtn.addEventListener('click', cpuGame);



/* Variables de jeu */
let mode;               // Mode de jeu : en ligne, en local, solo
let canvas, ctx;        // Canvas et contexte du jeu
let playerNumber;       // Identifiant du joueur
let gameActive = false; // Jeu actif ou non

/* Créer une partie en ligne */
function newGame() {
  mode = 'mouse';
  const name = playerNameInput.value;
  socket.emit('newGame', name);
  init();
}

/* Rejoindre une partie en ligne */
function joinGame() {
  mode = 'mouse';
  const name = playerNameInput.value;
  const code = gameCodeInput.value;
  socket.emit('joinGame', name, code);
  init();
}

/* Jouer une partie en local */
function localGame() {
  mode = 'local';
  const nameOne = playerNameInput.value;
  const nameTwo = secondNameInput.value;
  socket.emit('localGame', nameOne, nameTwo);
  init();
}

/* Affronter un CPU */
function cpuGame() {
  mode = 'cpu'
  const name = playerNameInput.value;
  socket.emit('cpuGame', name);
  init();
}



/* Initialiser une partie */
function init() {
  homeScreen.style.display = "none";
  gameScreen.style.display = "block";

  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  canvas.width = 600;
  canvas.height = 400;

  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  canvas.addEventListener('mousemove', mousemove); // Contrôle souris toujours possible
  if (mode == 'local') {
    document.addEventListener('keydown', keydown); // Contrôle clavier en mode local seulement
  }

  gameActive = true;
}

/* Contrôle par la souris */
function mousemove(e) {
  socket.emit('mousemove', e.clientY - canvas.getBoundingClientRect().y);
}

/* Contrôle par le clavier */
function keydown(e) {
  socket.emit('keydown', e.key);
}

/* Contrôle par le CPU */
function cpumove() {
  socket.emit('cpumove');
}



const BG_COLOUR = '#231f21';

/* Afficher l'état actuel de la partie (appelée à une fréquence FRAME_RATE) */
function paintGame(state) {
  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (mode == 'cpu') { // Contrôle par le CPU appelé à la même fréquence
    cpumove();
  }

  // Affichage des différents éléments : scores, briques, balles, raquettes

  playerOneScore.innerText = state.scores[0];
  playerTwoScore.innerText = state.scores[1];

  paintBricks(state.bricks);

  paintBall(state.balls[0], 'blue');
  paintBall(state.balls[1], 'red');

  paintPaddle(state.paddles[0], 'blue');
  paintPaddle(state.paddles[1], 'red');
}

/* Afficher la balle */
function paintBall(ball, color) {
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.rad, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
}

/* Afficher la raquette */
function paintPaddle(paddle, color) {
    ctx.beginPath();
    ctx.rect(paddle.pos.x, paddle.pos.y, paddle.size.w, paddle.size.h);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
}

/* Afficher les briques */
function paintBricks(bricks) {
  for(var c=0; c < bricks.colCount; c++) {
    for(var r=0; r < bricks.rowCount; r++) {
      var brick = bricks.list[c][r];
      if(brick.status == 1) { // On vérifie que la brique n'est pas deja cassée 
        ctx.beginPath();
        ctx.rect(brick.x, brick.y, bricks.width, bricks.height);
        ctx.fillStyle = brick.color;
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}



/* Gestion de l'initialisation */
function handleInit(number) {
  playerNumber = number;
}

/* Gestion des noms des joueurs */
function handleNames(playerNames) {
  playerOneName.innerText = playerNames[0];
  playerTwoName.innerText = playerNames[1];
}

/* Gestion en cours de partie */
function handleGameState(gameState) {
  if (!gameActive) {
    return;
  }
  gameState = JSON.parse(gameState);
  requestAnimationFrame(() => paintGame(gameState)); // Appel à l'affichage avec la fréquence FRAME_RATE
}

/* Gestion de la fin de partie */
function handleGameOver(data) {
  if (!gameActive) {
    return;
  }
  data = JSON.parse(data);

  gameActive = false;

  if (data.winner === playerNumber) {
    alert('You Win !');
    resetGame();
  } else {
    alert('You Lose :(');
    resetGame();
  }
}

/* Gestion du code (ID) de la partie */
function handleGameCode(gameCode) {
  gameCodeDisplay.innerText = gameCode;
}

function handleUnknownCode() {
  resetGame();
  alert('Unknown Game Code')
}

function handleTooManyPlayers() {
  resetGame();
  alert('This game is already in progress');
}

/* Gestion de la réinitialisation */
function resetGame() {
  playerNumber = null;
  gameCodeInput.value = '';
  homeScreen.style.display = "block";
  gameScreen.style.display = "none";
}