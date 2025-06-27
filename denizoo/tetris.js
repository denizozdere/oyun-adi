const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const arenaWidth = 12;
const arenaHeight = 20;
let arena = createMatrix(arenaWidth, arenaHeight);

const colors = [
  null,
  '#00FF00', // Yeşil
  '#FF0000', // Kırmızı
  '#0000FF', // Mavi
  '#FF69B4', // Pembe
  '#800080', // Mor
  '#00FF00', // Yeşil (tekrar)
  '#FF0000', // Kırmızı (tekrar)
];

const tetrominoes = {
  'T': [
    [0, 0, 0],
    [1, 1, 1],
    [0, 1, 0],
  ],
  'O': [
    [2, 2],
    [2, 2],
  ],
  'L': [
    [0, 3, 0],
    [0, 3, 0],
    [0, 3, 3],
  ],
  'J': [
    [0, 4, 0],
    [0, 4, 0],
    [4, 4, 0],
  ],
  'I': [
    [0, 5, 0, 0],
    [0, 5, 0, 0],
    [0, 5, 0, 0],
    [0, 5, 0, 0],
  ],
  'S': [
    [0, 6, 6],
    [6, 6, 0],
    [0, 0, 0],
  ],
  'Z': [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let animationId = null;
let isGameRunning = false;

const player = {
  pos: {x: 0, y: 0},
  matrix: null,
  score: 0,
};

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
         (arena[y + o.y] &&
          arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function playerReset() {
  const pieces = 'TJLOSZI';
  player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
  player.pos.y = 0;
  player.pos.x = (arenaWidth / 2 | 0) - (player.matrix[0].length / 2 | 0);
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    score = 0;
    updateScore();
    stopGame();
    alert('Oyun bitti!');
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function createPiece(type) {
  return tetrominoes[type].map(row => row.slice());
}

function arenaSweep() {
  let linesCleared = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    linesCleared++;
  }
  if (linesCleared > 0) {
    score += linesCleared * 10;
    updateScore();
    showCongrats();
  }
}

// Ekranda kısa süreli 'Aferin!' mesajı göster
function showCongrats() {
  let msg = document.getElementById('congrats-msg');
  if (!msg) {
    msg = document.createElement('div');
    msg.id = 'congrats-msg';
    msg.innerText = 'Aferin!';
    msg.style.position = 'fixed';
    msg.style.top = '30%';
    msg.style.left = '50%';
    msg.style.transform = 'translate(-50%, -50%)';
    msg.style.background = 'rgba(255,255,255,0.95)';
    msg.style.color = '#222';
    msg.style.fontSize = '2.5rem';
    msg.style.fontWeight = 'bold';
    msg.style.padding = '0.5em 1.5em';
    msg.style.borderRadius = '20px';
    msg.style.boxShadow = '0 4px 32px #0006';
    msg.style.zIndex = '9999';
    msg.style.opacity = '0';
    msg.style.transition = 'opacity 0.2s';
    document.body.appendChild(msg);
  }
  msg.style.opacity = '1';
  setTimeout(() => {
    msg.style.opacity = '0';
  }, 900);
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        // Parlak renkli bloklar için gradient oluştur
        const px = (x + offset.x) * 20;
        const py = (y + offset.y) * 20;
        const grad = context.createLinearGradient(px, py, px + 20, py + 20);
        grad.addColorStop(0, lightenColor(colors[value], 0.3));
        grad.addColorStop(1, colors[value]);
        context.fillStyle = grad;
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
        // Beyaz kenar çizgisi
        context.strokeStyle = '#fff';
        context.lineWidth = 0.08;
        context.strokeRect(x + offset.x + 0.04, y + offset.y + 0.04, 0.92, 0.92);
      }
    });
  });
}

// Rengi açmak için yardımcı fonksiyon
function lightenColor(color, percent) {
  // color: #RRGGBB
  const num = parseInt(color.replace('#', ''), 16);
  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * percent);
  let b = (num & 0x0000FF) + Math.round(255 * percent);
  r = r > 255 ? 255 : r;
  g = g > 255 ? 255 : g;
  b = b > 255 ? 255 : b;
  return `rgb(${r},${g},${b})`;
}

function draw() {
  context.fillStyle = '#111';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(arena, {x:0, y:0});
  if (player.matrix) {
    drawMatrix(player.matrix, player.pos);
  }
}

function updateScore() {
  document.getElementById('score').innerText = score;
}

function update(time = 0) {
  if (!isGameRunning) return;
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  animationId = requestAnimationFrame(update);
}

function startGame() {
  isGameRunning = true;
  arena = createMatrix(arenaWidth, arenaHeight);
  score = 0;
  updateScore();
  playerReset();
  lastTime = 0;
  dropCounter = 0;
  if (animationId) cancelAnimationFrame(animationId);
  update();
}

function stopGame() {
  isGameRunning = false;
  if (animationId) cancelAnimationFrame(animationId);
}

document.addEventListener('keydown', event => {
  if (!isGameRunning) return;
  if (event.key === 'ArrowLeft') {
    playerMove(-1);
  } else if (event.key === 'ArrowRight') {
    playerMove(1);
  } else if (event.key === 'ArrowDown') {
    playerDrop();
  } else if (event.key === 'ArrowUp') {
    playerRotate(1);
  }
});

document.getElementById('startBtn').addEventListener('click', () => {
  startGame();
});

// Sayfa açıldığında otomatik başlat
startGame(); 