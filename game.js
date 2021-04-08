/* Récupération des constantes et export des fonctions nécessaires */
const { BOARD_WIDTH, BOARD_HEIGHT } = require('./constants');

module.exports = {
  initGame,
  gameLoop,
  gameBounce,
  mouseMoved,
  keyMoved,
  cpuMoved,
  resetState,
}

/* Paramètres des raquettes et des balles */
var paddleHeight = 75;
var paddleWidth = 10;
var paddleY = (BOARD_HEIGHT - paddleHeight)/2;
var ballRadius = 10;
var colors = ["yellow","lightgreen","orange","magenta","pink","turquoise", "mediumpurple"];

/* Initiation de la partie */
function initGame() {
  const state = createGameState();
  state.bricks.list = initBricks(state);
  return state;
}

/* Création de l'état initial */
function createGameState() {
  return {
    scores: [0, 0],
    paddles: initPaddles(),
    balls: initBalls(),

    bricks: {
      width: BOARD_WIDTH/30,
      height: BOARD_HEIGHT/10,
      padding: 9,
      rowCount: Math.floor((BOARD_HEIGHT - 5)/(BOARD_HEIGHT/10 + 9)),
      colCount: Math.floor((BOARD_WIDTH - 500)/(BOARD_WIDTH/40 + 9)),
      offsetTop: Math.floor((BOARD_HEIGHT - Math.floor((BOARD_HEIGHT - 5)/(BOARD_HEIGHT/10 + 9)) * (BOARD_HEIGHT/10 + 9))/2)+3,
      offsetLeft: Math.floor((BOARD_WIDTH - Math.floor((BOARD_WIDTH - 500)/(BOARD_WIDTH/40 + 9)) * (BOARD_WIDTH/40 + 9))/2)+1,
      list: {},
    },
  };
}

/* Fonction mettant à jour l'état */
function gameLoop(state) {
  if (!state) {
    return;
  }

  /* Récupération des raquettes et balles */
  const paddleOne = state.paddles[0];
  const paddleTwo = state.paddles[1];
  const ballOne = state.balls[0];
  const ballTwo = state.balls[1];

  /* Mouvement des deux balles */
  ballOne.pos.x += ballOne.vel.x;
  ballOne.pos.y += ballOne.vel.y;
  ballTwo.pos.x += ballTwo.vel.x;
  ballTwo.pos.y += ballTwo.vel.y;

  /* Gestion du score */
  if (ballOne.pos.x < 0 || ballTwo.pos.x < 0) {
    state.scores[1] += 1;
    if (state.scores[1] == 3) {
      return 2;
    }
    else {
      state = resetState(state);
    }
  }

  if (ballOne.pos.x > BOARD_WIDTH || ballTwo.pos.x > BOARD_WIDTH) {
    state.scores[0] += 1;
    if (state.scores[0] == 3) {
      return 1;
    }
    else {
      state = resetState(state);
    }
  }

  gameBounce(state); // Gestion des rebonds et collisions
  return false;
}

/* Initiation des raquettes */
function initPaddles() {
  paddles =
    [{
      size: { h: paddleHeight, w: paddleWidth },
      pos: { x: 0, y: (BOARD_HEIGHT - paddleHeight)/2 },
    }, {
      size: { h: paddleHeight, w: paddleWidth },
      pos: { x: BOARD_WIDTH - paddleWidth, y: (BOARD_HEIGHT - paddleHeight)/2 },
    }];

  return paddles;
}

/* Initiation des balles */
function initBalls() {
  balls =
    [{
      rad: ballRadius,
      pos: { x: paddleWidth + ballRadius, y: paddleY + paddleHeight/2 },
      vel: { x: 2, y: 2 }
    }, {
      rad: ballRadius,
      pos: { x: BOARD_WIDTH - (paddleWidth + ballRadius), y: paddleY + paddleHeight/2 },
      vel: { x: -2, y: -2 }
    }];

  return balls;
}

/* Initiation des briques */
function initBricks(state) {
  var bricks = [];
  for (var c=0; c < state.bricks.colCount; c++) {
      bricks[c] = [];
      for (var r=0; r < state.bricks.rowCount; r++) {
          var n = Math.floor(Math.random() * Math.floor(6));
          var brickX = (c * (state.bricks.width + state.bricks.padding)) + state.bricks.offsetLeft;
          var brickY = (r * (state.bricks.height + state.bricks.padding)) + state.bricks.offsetTop;
          bricks[c][r] = {x: brickX, y: brickY, status: 1, color: colors[n]};
      }
  }
  return bricks;
}

/* Gestion des rebonds et collisions */
function gameBounce(state) {
  if (!state) {
    return;
  }

  for (let ball of state.balls) {
    var bax = ball.pos.x;
    var bay = ball.pos.y;
    var rad = ball.rad;

    // Rebonds sur les bords horizontaux
    if (bay + rad + ball.vel.y > BOARD_HEIGHT || bay - rad + ball.vel.y < 0) {
      ball.vel.y = -ball.vel.y;;
    }

    const paddleOne = state.paddles[0];
    const paddleTwo = state.paddles[1];

    // Rebond sur la raquette du joueur 1
    if (bax - rad + ball.vel.x <= paddleOne.size.w) {
      if (bay + rad >= paddleOne.pos.y && bay - rad <= paddleOne.pos.y + paddleOne.size.h) {
        // Calcul de l'angle de rebond
        let collidePoint = (bay - (paddleOne.pos.y + paddleOne.size.h/2)) / (paddleOne.size.h/2);
        let collideAngle = Math.PI/4 * collidePoint;
        let ballSpeed = Math.sqrt(ball.vel.x**2 + ball.vel.y**2);

        ball.vel.x = -ballSpeed*Math.abs(Math.cos(collideAngle)) * ball.vel.x/Math.abs(ball.vel.x)
        ball.vel.y = ballSpeed*Math.sin(collideAngle)
      }
    }

    // Rebond sur la raquette du joueur 
    if (bax + rad + ball.vel.x >= BOARD_WIDTH - paddleTwo.size.w) {
      if (bay + rad >= paddleTwo.pos.y && bay - rad <= paddleTwo.pos.y + paddleTwo.size.h) {
        // Calcul de l'angle de rebond
        let collidePoint = (bay - (paddleOne.pos.y + paddleOne.size.h/2)) / (paddleOne.size.h/2);
        let collideAngle = Math.PI/4 * collidePoint;
        let ballSpeed = Math.sqrt(ball.vel.x**2 + ball.vel.y**2);

        ball.vel.x = -ballSpeed*Math.abs(Math.cos(collideAngle)) * ball.vel.x/Math.abs(ball.vel.x)
        ball.vel.y = ballSpeed*Math.sin(collideAngle)
      }
    }

    // Collisions avec les briques
    for (var c=0; c < state.bricks.colCount; c++) {
      for (var r=0; r < state.bricks.rowCount; r++) {
        var brick = state.bricks.list[c][r];
        if (brick.status == 1) {
          if (bax + rad >= brick.x && bax-rad <= brick.x + state.bricks.width
            && bay + rad >= brick.y && bay-rad  <= brick.y + state.bricks.height) {
            // Calcul de l'angle de rebond
            let collidePoint = (bay - (brick.y + state.bricks.height/2)) / (state.bricks.height/2);
            let collideAngle = Math.PI/4 * collidePoint;
            let ballSpeed = Math.sqrt(ball.vel.x**2 + ball.vel.y**2);

            ball.vel.x = -ballSpeed*Math.abs(Math.cos(collideAngle)) * ball.vel.x/Math.abs(ball.vel.x)
            ball.vel.y = ballSpeed*Math.sin(collideAngle)

            // Calcul des bonus/malus
            brick.status = 0;
            if (brick.color == "lightgreen"){ // Grande taille
              ball.rad = 1.2*ball.rad;
            }
            else if(brick.color == "yellow"){ // Accélération
              ball.vel.x = 1.2*ball.vel.x;
              ball.vel.y = 1.2*ball.vel.y;
            }
          }
        }
      }
    }
  }
}

/* Calcul du déplacement de la raquette par la souris */
function mouseMoved(mouselocation, paddle) {
  if (mouselocation < paddle.size.h / 2) {
    return { x: paddle.pos.x, y: 0 };
  } else if (mouselocation > BOARD_HEIGHT - paddle.size.h / 2) {
    return { x: paddle.pos.x, y: BOARD_HEIGHT - paddle.size.h };
  } else {
    return { x: paddle.pos.x, y: mouselocation - paddle.size.h / 2 };
  }
}

/* Calcul du déplacement de la raquette par le clavier */
function keyMoved(key, paddle) {
  switch (key) {
    case "ArrowUp": { // Flèche du haut
      if (paddle.pos.y > 15) {
        return { x: paddle.pos.x, y: paddle.pos.y-15 };
      }
    }

    case "ArrowDown": { // Flèche du bas
      if (paddle.pos.y < BOARD_HEIGHT-paddle.size.h-15) {
        return { x: paddle.pos.x, y: paddle.pos.y+15 };
      }
    }

    case "z": { // Touch Z
      if (paddle.pos.y > 15) {
        return { x: paddle.pos.x, y: paddle.pos.y-15 };
      }
    }
    case "s": { // Touch S
      if (paddle.pos.y < BOARD_HEIGHT-paddle.size.h-15) {
        return { x: paddle.pos.x, y: paddle.pos.y+15 };
      }
    }
  }
}

/* Calcul du déplacement de la raquette par le CPU */
function cpuMoved(state) {
  if (!state) {
    return;
  }

  if (state.balls[0].pos.x < state.balls[1].pos.x) {
    return {
      x: state.paddles[1].pos.x,
      y: state.paddles[1].pos.y + (state.balls[1].pos.y - state.paddles[1].pos.y) * 0.1 + state.balls[1].vel.y * 0.6
    };
  }
  else {
    return {
      x: state.paddles[1].pos.x,
      y: state.paddles[1].pos.y + (state.balls[0].pos.y - state.paddles[1].pos.y) * 0.1 + state.balls[0].vel.y * 0.6
    };
  }
}

/* Fonction de réinitialisation */
function resetState(state) {
  state.paddles = initPaddles();
  state.balls = initBalls();
  state.bricks.list = initBricks(state);
}