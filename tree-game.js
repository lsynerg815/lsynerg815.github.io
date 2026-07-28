(() => {
  const canvas = document.querySelector('#tree-board');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const scoreElement = document.querySelector('#tree-score');
  const stageElement = document.querySelector('#tree-stage');
  const branchElement = document.querySelector('#tree-branches');
  const statusElement = document.querySelector('#tree-status');
  const startButton = document.querySelector('#tree-start');
  const restartButton = document.querySelector('#tree-restart');
  const config = { branchesPerStage: 40, totalStages: 10 };
  const keys = new Set();
  let state = 'idle';
  let stage = 1;
  let branches = 0;
  let score = 0;
  let player;
  let apple;
  let bullets;
  let targets;
  let animationId = null;
  let lastFrame = 0;

  const randomX = () => 48 + Math.floor(Math.random() * 504);
  const setStatus = (message) => { statusElement.textContent = message; };
  const updateHud = () => {
    scoreElement.textContent = String(score);
    stageElement.textContent = `${stage}/${config.totalStages}`;
    branchElement.textContent = `${branches}/${config.branchesPerStage}`;
  };

  const spawnApple = () => ({ x: randomX(), y: 280 + Math.floor(Math.random() * 70) });
  const spawnTargets = () => Array.from({ length: 3 }, (_, index) => ({ x: 90 + index * 210, y: 100 + Math.random() * 110, radius: 10 }));

  const reset = () => {
    state = 'idle'; stage = 1; branches = 0; score = 0;
    player = { x: 300, y: 350, radius: 12 };
    apple = spawnApple(); bullets = []; targets = spawnTargets();
    updateHud(); draw();
  };

  const draw = () => {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#071b2a'); gradient.addColorStop(1, '#102817');
    context.fillStyle = gradient; context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(0, 245, 212, 0.18)'; context.lineWidth = 2;
    for (let row = 0; row < 7; row += 1) {
      const y = 70 + row * 45;
      context.beginPath(); context.moveTo(20 + (row % 2) * 28, y); context.quadraticCurveTo(300, y - 12, 580 - (row % 2) * 28, y + 4); context.stroke();
    }
    context.strokeStyle = 'rgba(255, 60, 172, 0.32)';
    context.beginPath(); context.moveTo(300, 400); context.quadraticCurveTo(260, 220, 300, 0); context.stroke();
    targets.forEach((target) => {
      context.shadowBlur = 14; context.shadowColor = '#ff3cac'; context.fillStyle = '#ff3cac';
      context.beginPath(); context.arc(target.x, target.y, target.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
    });
    if (apple) {
      context.shadowBlur = 14; context.shadowColor = '#ff3cac'; context.fillStyle = '#ff3cac';
      context.beginPath(); context.arc(apple.x, apple.y, 9, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
      context.fillStyle = '#00f5d4'; context.fillRect(apple.x + 5, apple.y - 13, 3, 8);
    }
    context.fillStyle = '#00f5d4'; bullets.forEach((bullet) => context.fillRect(bullet.x - 2, bullet.y - 8, 4, 12));
    context.shadowBlur = 16; context.shadowColor = '#e8fff6'; context.fillStyle = '#e8fff6';
    context.beginPath(); context.arc(player.x, player.y, player.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
  };

  const distance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);

  const climbBranch = () => {
    if (state !== 'running' || branches >= config.branchesPerStage) return;
    branches += 1; player.y = 350 - (branches % 8) * 34; apple = spawnApple();
    if (branches === config.branchesPerStage) {
      if (stage === config.totalStages) {
        state = 'complete'; startButton.disabled = false; setStatus('COMPLETE · 10개 스테이지 종료');
      } else {
        stage += 1; branches = 0; targets = spawnTargets(); setStatus(`STAGE ${stage}`);
      }
    }
    updateHud(); draw();
  };

  const shoot = () => { if (state === 'running') bullets.push({ x: player.x, y: player.y - 18 }); };

  const update = (elapsed) => {
    const speed = elapsed * 0.22;
    if (keys.has('arrowleft') || keys.has('a')) player.x = Math.max(20, player.x - speed);
    if (keys.has('arrowright') || keys.has('d')) player.x = Math.min(580, player.x + speed);
    bullets = bullets.map((bullet) => ({ ...bullet, y: bullet.y - elapsed * 0.45 })).filter((bullet) => bullet.y > -20);
    bullets = bullets.filter((bullet) => {
      const hitIndex = targets.findIndex((target) => distance(bullet, target) < target.radius + 5);
      if (hitIndex === -1) return true;
      targets.splice(hitIndex, 1); return false;
    });
    if (apple && distance(player, apple) < 22) { score += 10; apple = spawnApple(); updateHud(); }
  };

  const loop = (timestamp) => {
    if (state !== 'running') { animationId = null; return; }
    const elapsed = lastFrame ? Math.min(32, timestamp - lastFrame) : 16;
    lastFrame = timestamp; update(elapsed); draw(); animationId = window.requestAnimationFrame(loop);
  };

  const start = () => {
    if (state === 'complete') reset();
    state = 'running'; startButton.disabled = true; setStatus('RUNNING'); lastFrame = 0;
    if (animationId === null) animationId = window.requestAnimationFrame(loop);
  };

  const restart = () => { if (animationId !== null) window.cancelAnimationFrame(animationId); animationId = null; reset(); setStatus('시작을 눌러 준비'); startButton.disabled = false; };

  document.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(event.key)) { event.preventDefault(); keys.add(event.key.toLowerCase()); }
    if ((event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') && !event.repeat) { event.preventDefault(); climbBranch(); }
    if (event.code === 'Space') { event.preventDefault(); shoot(); }
  });
  document.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
  startButton.addEventListener('click', start); restartButton.addEventListener('click', restart); reset();
})();
