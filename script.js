// script.js — Hotseat Tic-Tac-Toe (12 boxes) with:
// - modal result popup
// - highlight winning line
// - confetti animation on win
// - "Play Again" button that toggles starting player each play

document.addEventListener('DOMContentLoaded', () => {
  // animation stagger for title
  const STAGGER = 0.05;
  document.querySelectorAll('.bounce-title span').forEach((sp, i) => sp.style.animationDelay = `${i * STAGGER}s`);

  // elements
  const boxes = Array.from(document.querySelectorAll('.box'));
  const msgEl = document.getElementById('msg');
  const turnIndicator = document.getElementById('turn-indicator');
  const restartBtn = document.getElementById('restart');
  const pickXBtn = document.getElementById('pick-x');
  const pickOBtn = document.getElementById('pick-o');

  const modal = document.getElementById('result-modal');
  const modalOverlay = modal && modal.querySelector('.modal-overlay');
  const modalMessage = document.getElementById('modal-message');
  const modalPlayAgain = document.getElementById('modal-playagain');
  const modalRestart = document.getElementById('modal-restart');
  const modalClose = document.getElementById('modal-close');

  const confettiCanvas = document.getElementById('confetti-canvas');

  if (!boxes.length) { console.warn('No boxes found — abort'); return; }

  // game state
  let BOX_COUNT = boxes.length;
  let board = Array(BOX_COUNT).fill(null);
  let turn = 'X';
  let over = false;
  let youAre = 'X';
  let startingPlayer = 'X'; // this toggles when Play Again is used

  // layout detection
  let rows = (BOX_COUNT === 12) ? 3 : (BOX_COUNT === 9 ? 3 : Math.ceil(Math.sqrt(BOX_COUNT)));
  let cols = (BOX_COUNT === 12) ? 4 : (BOX_COUNT === 9 ? 3 : Math.ceil(BOX_COUNT / rows));
  const WIN_LEN = 3;
  const winnerPatterns = generateWinnerPatterns(rows, cols, WIN_LEN);

  // ensure data-index set
  boxes.forEach((b,i) => { if (!b.dataset.index) b.dataset.index = i; });

  // attach handlers
  boxes.forEach(b => b.addEventListener('click', onCellClick));
  restartBtn && restartBtn.addEventListener('click', () => { resetGame(false); }); // normal restart: keep startingPlayer
  pickXBtn && pickXBtn.addEventListener('click', () => { youAre = 'X'; startingPlayer = 'X'; setActivePickButton(); resetGame(false); });
  pickOBtn && pickOBtn.addEventListener('click', () => { youAre = 'O'; startingPlayer = 'O'; setActivePickButton(); resetGame(false); });

  modalOverlay && modalOverlay.addEventListener('click', hideModal);
  modalClose && modalClose.addEventListener('click', hideModal);
  modalRestart && modalRestart.addEventListener('click', () => { hideModal(); resetGame(false); });
  modalPlayAgain && modalPlayAgain.addEventListener('click', () => { hideModal(); toggleStartingPlayer(); resetGame(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });

  // confetti context (lazy init)
  let confettiCtx = null;
  let confettiAnimationId = null;

  setActivePickButton();
  resetGame(false);

  // ----- Game functions -----
  function onCellClick(e) {
    if (over) return;
    const idx = Number(e.currentTarget.dataset.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= BOX_COUNT) return;
    if (board[idx] !== null) return;

    board[idx] = turn;
    const cell = e.currentTarget;
    cell.innerText = turn;
    const xColor = getComputedStyle(document.documentElement).getPropertyValue('--xclr').trim() || '#7fffd4';
    const oColor = getComputedStyle(document.documentElement).getPropertyValue('--oclr').trim() || '#ff83f1';
    cell.style.backgroundColor = (turn === 'X') ? xColor : oColor;
    cell.classList.add('disabled');
    cell.disabled = true;

    const match = findWinningPattern();
    if (match) {
      over = true;
      highlightWinningLine(match.pattern);
      const message = (match.winner === 'draw') ? "It's a draw" : `Player ${match.winner} wins`;
      showModal(message, match);
      if (match.winner !== 'draw') launchConfetti();
      updateUI();
      return;
    }

    // toggle turn
    turn = (turn === 'X') ? 'O' : 'X';
    updateUI();
  }

  function findWinningPattern() {
    // check all patterns
    for (const pattern of winnerPatterns) {
      const [a,b,c] = pattern;
      if (!isValidIndex(a) || !isValidIndex(b) || !isValidIndex(c)) continue;
      const v1 = board[a], v2 = board[b], v3 = board[c];
      if (v1 && v1 === v2 && v2 === v3) {
        return { winner: v1, pattern: pattern };
      }
    }
    // draw?
    if (board.every(cell => cell !== null)) return { winner: 'draw', pattern: null };
    return null;
  }

  function highlightWinningLine(pattern) {
    clearWinningHighlight();
    if (!pattern) return;
    pattern.forEach(idx => {
      const b = boxes[idx];
      if (b) b.classList.add('win');
    });
  }

  function clearWinningHighlight() {
    boxes.forEach(b => b.classList.remove('win'));
  }

  function resetGame(keepStarting = false) {
    board = Array(BOX_COUNT).fill(null);
    over = false;
    // If starting player should alternate based on last play, startingPlayer is managed by toggleStartingPlayer when Play Again clicked.
    if (!keepStarting) {
      // keep startingPlayer as-is (used when restart or play again toggled already)
    }
    turn = startingPlayer; // start with the current startingPlayer
    boxes.forEach(b => {
      b.innerText = '';
      b.classList.remove('disabled');
      b.classList.remove('win');
      b.style.backgroundColor = '';
      b.disabled = false;
    });
    if (msgEl) msgEl.innerText = "Let's Play the Game";
    setActivePickButton();
    updateUI();
    hideModal(); // ensure modal hidden
    stopConfetti(); // stop any running confetti just in case
  }

  function updateUI() {
    if (turnIndicator) turnIndicator.innerText = over ? 'Game over' : `Turn: ${turn} — ${(turn === youAre) ? 'Your move' : 'Other player'}`;
    if (msgEl && !over) msgEl.innerText = `You are ${youAre}`;
  }

  function setActivePickButton() {
    pickXBtn && pickXBtn.classList.toggle('active', youAre === 'X');
    pickOBtn && pickOBtn.classList.toggle('active', youAre === 'O');
  }

  function toggleStartingPlayer() {
    startingPlayer = (startingPlayer === 'X') ? 'O' : 'X';
    // if player choice follows starting player, update youAre accordingly? We'll preserve previous youAre selection.
    // Optionally, you can switch youAre to startingPlayer for UX; leaving as-is.
  }

  // ----- Modal helpers -----
  function showModal(message, match) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    if (modalMessage) modalMessage.textContent = message;
    // focus first action
    modalPlayAgain ? modalPlayAgain.focus() : (modalRestart ? modalRestart.focus() : modalClose && modalClose.focus());
  }
  function hideModal() {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
  }

  // ----- Confetti (simple particle system on canvas) -----
  function ensureConfettiCanvas() {
    if (!confettiCtx && confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
      confettiCtx = confettiCanvas.getContext('2d');
    }
  }

  function launchConfetti() {
    ensureConfettiCanvas();
    if (!confettiCtx) return;
    confettiCanvas.style.display = 'block';
    const particles = [];
    const colors = ['#ff0a6a', '#ffb400', '#7fffd4', '#5e63ff', '#ff83f1', '#ffd166'];
    const count = 80;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random()*200,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random()*3 + 2,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random()*colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vrot: (Math.random()-0.5) * 0.2,
        ttl: 200 + Math.random()*80
      });
    }

    const start = performance.now();
    function frame(now) {
      confettiCtx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
      for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.rotation += p.vrot;
        p.ttl--;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rotation);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
        confettiCtx.restore();
      }
      // remove dead particles
      for (let i = particles.length-1; i>=0; i--) {
        if (particles[i].ttl <= 0 || particles[i].y > confettiCanvas.height + 50) particles.splice(i,1);
      }
      if (particles.length > 0) {
        confettiAnimationId = requestAnimationFrame(frame);
      } else {
        stopConfetti();
      }
    }
    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = requestAnimationFrame(frame);
  }

  function stopConfetti() {
    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
    if (confettiCanvas) confettiCanvas.style.display = 'none';
    if (confettiCtx) confettiCtx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
  }

  // ----- Utilities -----
  function isValidIndex(i) { return Number.isInteger(i) && i >= 0 && i < BOX_COUNT; }

  function generateWinnerPatterns(rows, cols, winLen) {
    const patterns = [];
    // horizontal
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols - winLen; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push(r * cols + (c + k));
        patterns.push(line);
      }
    }
    // vertical
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r <= rows - winLen; r++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push((r + k) * cols + c);
        patterns.push(line);
      }
    }
    // diag down-right
    for (let r = 0; r <= rows - winLen; r++) {
      for (let c = 0; c <= cols - winLen; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push((r + k) * cols + (c + k));
        patterns.push(line);
      }
    }
    // diag down-left
    for (let r = 0; r <= rows - winLen; r++) {
      for (let c = winLen - 1; c < cols; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push((r + k) * cols + (c - k));
        patterns.push(line);
      }
    }
    return patterns;
  }

  // ensure canvas resizes with viewport
  window.addEventListener('resize', () => {
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  });
});