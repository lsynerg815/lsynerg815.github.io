(() => {
  const canvas = document.querySelector('#game-board');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const highScoreElement = document.querySelector('#high-score');
  const enemyCountElement = document.querySelector('#enemy-count');
  const powerStatusElement = document.querySelector('#power-status');
  const powerTimerElement = document.querySelector('#power-timer');
  const statusElement = document.querySelector('#game-status');
  const startButton = document.querySelector('#start-game');
  const pauseButton = document.querySelector('#pause-game');
  const restartButton = document.querySelector('#restart-game');
  const soundButton = document.querySelector('#sound-toggle');
  const grid = { columns: 24, rows: 16, cell: 25 };
  const directions = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  };
  const highScoreKey = 'ver-neon-snake-high-score';
  let snake;
  let food;
  let enemies;
  let direction;
  let queuedDirection;
  let state = 'idle';
  let score = 0;
  let animationId = null;
  let lastTick = 0;
  let lastFrameTime = 0;
  let soundEnabled = true;
  let audioContext = null;
  let foodsEaten = 0;
  let powerActive = false;
  let powerRemaining = 0;
  let blinkVisible = true;

  const readHighScore = () => Number(localStorage.getItem(highScoreKey) || 0);

  const updateScore = () => {
    scoreElement.textContent = String(score);
    highScoreElement.textContent = String(Math.max(score, readHighScore()));
    enemyCountElement.textContent = String(enemies.length);
    powerStatusElement.textContent = powerActive ? 'ON' : 'OFF';
    powerStatusElement.classList.toggle('active', powerActive);
    powerTimerElement.textContent = powerActive ? `${(powerRemaining / 1000).toFixed(1)}s` : '';
  };

  const setStatus = (message) => { statusElement.textContent = message; };

  const sameCell = (first, second) => first.x === second.x && first.y === second.y;

  const randomCell = () => ({
    x: Math.floor(Math.random() * grid.columns),
    y: Math.floor(Math.random() * grid.rows)
  });

  const openCell = () => {
    let cell = randomCell();
    while (snake.some((part) => sameCell(part, cell)) || enemies.some((obstacle) => sameCell(obstacle, cell))) cell = randomCell();
    return cell;
  };

  const openEnemyCell = () => {
    let cell = randomCell();
    while (snake.some((part) => sameCell(part, cell)) || sameCell(food, cell) || enemies.some((obstacle) => sameCell(obstacle, cell))) cell = randomCell();
    return cell;
  };

  const drawCell = (cell, color, glow = color) => {
    context.shadowBlur = 12;
    context.shadowColor = glow;
    context.fillStyle = color;
    context.fillRect(cell.x * grid.cell + 2, cell.y * grid.cell + 2, grid.cell - 4, grid.cell - 4);
    context.shadowBlur = 0;
  };

  const drawBoard = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#03090d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(0, 245, 212, 0.06)';
    context.lineWidth = 1;
    for (let x = 0; x <= grid.columns; x += 1) {
      context.beginPath(); context.moveTo(x * grid.cell, 0); context.lineTo(x * grid.cell, canvas.height); context.stroke();
    }
    for (let y = 0; y <= grid.rows; y += 1) {
      context.beginPath(); context.moveTo(0, y * grid.cell); context.lineTo(canvas.width, y * grid.cell); context.stroke();
    }
    if (food) drawCell(food, '#ff3cac', '#ff3cac');
    if (blinkVisible) enemies.forEach((obstacle) => drawCell(obstacle, '#f7b801', '#f7b801'));
    if (snake) snake.forEach((part, index) => drawCell(part, index === 0 ? '#e8fff6' : '#00f5d4', '#00f5d4'));
  };

  const beep = (frequency, duration = 0.07) => {
    if (!soundEnabled) return;
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = 'square';
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  };

  const resetGame = () => {
    snake = [{ x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }];
    direction = directions.right;
    queuedDirection = direction;
    score = 0;
    enemies = [{ x: 5, y: 5 }];
    foodsEaten = 0;
    powerActive = false;
    powerRemaining = 0;
    blinkVisible = true;
    food = openCell();
    updateScore();
    drawBoard();
  };

  const validDirection = (next) => !(next.x === -direction.x && next.y === -direction.y);

  const setDirection = (name) => {
    const next = directions[name];
    if (next && validDirection(next)) queuedDirection = next;
  };

  const activatePower = () => {
    if (powerActive) return;
    powerActive = true;
    powerRemaining = 3000;
    blinkVisible = true;
    setStatus('POWER ACTIVE');
    beep(880, 0.12);
  };

  const updatePower = (elapsed) => {
    if (!powerActive) return;
    powerRemaining = Math.max(0, powerRemaining - elapsed);
    blinkVisible = Math.floor(powerRemaining / 120) % 2 === 0;
    if (powerRemaining === 0) {
      powerActive = false;
      blinkVisible = true;
      setStatus('RUNNING');
    }
    updateScore();
  };

  const moveEnemy = (obstacle, index) => {
    const options = Object.values(directions).filter((candidate) => {
      const next = { x: obstacle.x + candidate.x, y: obstacle.y + candidate.y };
      return next.x >= 0 && next.x < grid.columns && next.y >= 0 && next.y < grid.rows
        && !enemies.some((other, otherIndex) => otherIndex !== index && sameCell(other, next));
    });
    return options.length ? { ...obstacle, ...options[Math.floor(Math.random() * options.length)] } : obstacle;
  };

  const endGame = () => {
    state = 'over';
    if (score > readHighScore()) localStorage.setItem(highScoreKey, String(score));
    const finalScore = score;
    score = 0;
    updateScore();
    pauseButton.disabled = true;
    startButton.disabled = false;
    setStatus(`GAME OVER · 기록 ${finalScore} · 재시작을 누르세요`);
    beep(110, 0.18);
    drawBoard();
  };

  const tick = () => {
    direction = queuedDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const hitWall = head.x < 0 || head.x >= grid.columns || head.y < 0 || head.y >= grid.rows;
    const hitSelf = snake.some((part) => sameCell(part, head));
    const hitEnemyIndex = enemies.findIndex((obstacle) => sameCell(head, obstacle));
    if (hitWall || hitSelf) return endGame();
    if (hitEnemyIndex !== -1) {
      if (!powerActive) return endGame();
      enemies.splice(hitEnemyIndex, 1);
      beep(1040, 0.1);
    }
    snake.unshift(head);
    if (sameCell(head, food)) {
      score += 10;
      foodsEaten += 1;
      food = openCell();
      enemies.push(openEnemyCell());
      if (foodsEaten % 4 === 0) activatePower();
      beep(660);
    } else {
      snake.pop();
    }
    enemies = enemies.map(moveEnemy);
    const movedIntoSnake = enemies.some((obstacle) => sameCell(obstacle, snake[0]));
    if (movedIntoSnake) {
      if (!powerActive) return endGame();
      enemies = enemies.filter((obstacle) => !sameCell(obstacle, snake[0]));
    }
    updateScore();
    drawBoard();
  };

  const gameLoop = (timestamp) => {
    if (state !== 'running') { animationId = null; return; }
    const elapsed = lastFrameTime ? timestamp - lastFrameTime : 0;
    lastFrameTime = timestamp;
    const wasPowerActive = powerActive;
    updatePower(elapsed);
    if (timestamp - lastTick >= 145) { lastTick = timestamp; tick(); }
    if (powerActive || wasPowerActive) drawBoard();
    animationId = state === 'running' ? window.requestAnimationFrame(gameLoop) : null;
  };

  const startGame = () => {
    if (state === 'idle' || state === 'over') resetGame();
    state = 'running';
    lastFrameTime = 0;
    startButton.disabled = true;
    pauseButton.disabled = false;
    setStatus('RUNNING');
    beep(440);
    if (animationId === null) animationId = window.requestAnimationFrame(gameLoop);
  };

  const pauseGame = () => {
    if (state === 'running') { state = 'paused'; lastFrameTime = 0; pauseButton.textContent = '계속'; setStatus('PAUSED'); }
    else if (state === 'paused') { state = 'running'; lastFrameTime = 0; pauseButton.textContent = '일시정지'; setStatus(powerActive ? 'POWER ACTIVE' : 'RUNNING'); animationId = window.requestAnimationFrame(gameLoop); }
  };

  const restartGame = () => {
    if (animationId !== null) window.cancelAnimationFrame(animationId);
    animationId = null; lastFrameTime = 0; state = 'idle'; pauseButton.textContent = '일시정지'; pauseButton.disabled = true; startButton.disabled = false; setStatus('시작을 눌러 준비'); resetGame();
  };

  document.addEventListener('keydown', (event) => {
    const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (keys[event.key]) { event.preventDefault(); setDirection(keys[event.key]); }
    if (event.key.toLowerCase() === 'p' && (state === 'running' || state === 'paused')) pauseGame();
  });
  document.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('pointerdown', () => setDirection(button.dataset.direction)));
  startButton.addEventListener('click', startGame);
  pauseButton.addEventListener('click', pauseGame);
  restartButton.addEventListener('click', restartGame);
  soundButton.addEventListener('click', () => { soundEnabled = !soundEnabled; soundButton.textContent = soundEnabled ? '사운드 켬' : '사운드 끔'; soundButton.setAttribute('aria-pressed', String(soundEnabled)); });
  resetGame();
})();
