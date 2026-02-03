// Updated script: modal uses single "Try Again" button that toggles starting player
// and modal is hidden by default (CSS hides it when aria-hidden="true").

document.addEventListener('DOMContentLoaded', () => {
  const STAGGER = 0.05;
  document.querySelectorAll('.bounce-title span').forEach((sp, i) => sp.style.animationDelay = `${i * STAGGER}s`);

  const msgEl = document.getElementById('msg');

  // Menu mode buttons & keyboard shortcuts
  const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));
  modeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = btn.getAttribute('data-mode') || btn.textContent.trim().toLowerCase();
      if (msgEl) msgEl.textContent = `Selected ${mode} mode — loading the game.`;
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (key === '1' || key === '2' || key === '3') {
      const index = { '1': 0, '2': 1, '3': 2 }[key];
      const target = modeButtons[index];
      if (target) {
        if (msgEl) msgEl.textContent = `Opening ${target.getAttribute('data-mode')} mode.`;
        setTimeout(() => window.location.href = target.href, 250);
        return;
      }
    }
    if (key === 'Escape') {
      const modal = document.getElementById('result-modal');
      if (modal && modal.getAttribute('aria-hidden') === 'false') {
        modal.setAttribute('aria-hidden', 'true');
        const modalClose = document.getElementById('modal-close');
        modalClose && modalClose.focus();
      }
    }
  });

  // Game init (if present)
  const boxes = Array.from(document.querySelectorAll('.box'));
  if (!boxes.length) return;

  const turnIndicator = document.getElementById('turn-indicator');
  const restartBtn = document.getElementById('restart');
  const pickXBtn = document.getElementById('pick-x');
  const pickOBtn = document.getElementById('pick-o');

  const modal = document.getElementById('result-modal');
  const modalOverlay = modal && modal.querySelector('.modal-overlay');
  const modalMessage = document.getElementById('modal-message') || (modal && modal.querySelector('h4'));
  const modalTryAgain = document.getElementById('modal-tryagain');
  const modalClose = document.getElementById('modal-close');

  const confettiCanvas = document.getElementById('confetti-canvas');

  let BOX_COUNT = boxes.length;
  let board = Array(BOX_COUNT).fill(null);
  let turn = 'X';
  let over = false;
  let youAre = 'X';
  let startingPlayer = 'X';

  let rows = (BOX_COUNT === 12) ? 3 : (BOX_COUNT === 9 ? 3 : Math.ceil(Math.sqrt(BOX_COUNT)));
  let cols = (BOX_COUNT === 12) ? 4 : (BOX_COUNT === 9 ? 3 : Math.ceil(BOX_COUNT / rows));
  const WIN_LEN = 3;
  const winnerPatterns = generateWinnerPatterns(rows, cols, WIN_LEN);

  boxes.forEach((b,i) => { if (!b.dataset.index) b.dataset.index = i; });

  boxes.forEach(b => {
    b.addEventListener('click', onCellClick);
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); }
    });
  });

  restartBtn && restartBtn.addEventListener('click', () => { resetGame(false); });
  pickXBtn && pickXBtn.addEventListener('click', () => { youAre = 'X'; startingPlayer = 'X'; setActivePickButton(); resetGame(false); });
  pickOBtn && pickOBtn.addEventListener('click', () => { youAre = 'O'; startingPlayer = 'O'; setActivePickButton(); resetGame(false); });

  modalOverlay && modalOverlay.addEventListener('click', hideModal);
  modalClose && modalClose.addEventListener('click', hideModal);
  modalTryAgain && modalTryAgain.addEventListener('click', () => { hideModal(); toggleStartingPlayer(); resetGame(false); });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });

  let confettiCtx = null;
  let confettiAnimationId = null;

  setActivePickButton();
  resetGame(false);

  // -- game functions (unchanged logic) --
  function onCellClick(e) {
    if (over) return;
    const idx = Number(e.currentTarget.dataset.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= BOX_COUNT) return;
    if (board[idx] !== null) return;

    board[idx] = turn;
    const cell = e.currentTarget;
    cell.innerText = turn;
    cell.setAttribute('data-mark', turn);

    const xColor = getComputedStyle(document.documentElement).getPropertyValue('--xclr').trim() || '#7fffd4';
    const oColor = getComputedStyle(document.documentElement).getPropertyValue('--oclr').trim() || '#ff83f1';
    cell.style.backgroundColor = (turn === 'X') ? xColor : oColor;
    cell.classList.add('disabled');
    cell.setAttribute('aria-pressed', 'true');
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

    turn = (turn === 'X') ? 'O' : 'X';
    updateUI();
  }

  function findWinningPattern() {
    for (const pattern of winnerPatterns) {
      const [a,b,c] = pattern;
      if (!isValidIndex(a) || !isValidIndex(b) || !isValidIndex(c)) continue;
      const v1 = board[a], v2 = board[b], v3 = board[c];
      if (v1 && v1 === v2 && v2 === v3) return { winner: v1, pattern };
    }
    if (board.every(cell => cell !== null)) return { winner: 'draw', pattern: null };
    return null;
  }

  function highlightWinningLine(pattern) { clearWinningHighlight(); if (!pattern) return; pattern.forEach(idx => { const b = boxes[idx]; if (b) b.classList.add('win'); }); }
  function clearWinningHighlight() { boxes.forEach(b => b.classList.remove('win')); }

  function resetGame(keepStarting = false) {
    board = Array(BOX_COUNT).fill(null);
    over = false;
    turn = startingPlayer;
    boxes.forEach(b => {
      b.innerText = '';
      b.classList.remove('disabled','win');
      b.style.backgroundColor = '';
      b.removeAttribute('data-mark');
      b.setAttribute('aria-pressed', 'false');
      b.disabled = false;
    });
    if (msgEl) msgEl.innerText = "Let's Play the Game";
    setActivePickButton();
    updateUI();
    hideModal();
    stopConfetti();
  }

  function updateUI() {
    if (turnIndicator) turnIndicator.innerText = over ? 'Game over' : `Turn: ${turn} — ${(turn === youAre) ? 'Your move' : 'Other player'}`;
    if (msgEl && !over) msgEl.innerText = `You are ${youAre}`;
  }

  function setActivePickButton() { pickXBtn && pickXBtn.classList.toggle('active', youAre === 'X'); pickOBtn && pickOBtn.classList.toggle('active', youAre === 'O'); }
  function toggleStartingPlayer() { startingPlayer = (startingPlayer === 'X') ? 'O' : 'X'; }

  function showModal(message, match) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    if (modalMessage) modalMessage.textContent = message;
    modalTryAgain ? modalTryAgain.focus() : (modalClose && modalClose.focus());
  }
  function hideModal() { if (!modal) return; modal.setAttribute('aria-hidden', 'true'); }

  function ensureConfettiCanvas() { if (!confettiCtx && confettiCanvas) { confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight; confettiCtx = confettiCanvas.getContext('2d'); } }

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

    function frame() {
      confettiCtx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
      for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.rotation += p.vrot;
        p.ttl--;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rotation);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
        confettiCtx.restore();
      }
      for (let i = particles.length-1; i>=0; i--) {
        if (particles[i].ttl <= 0 || particles[i].y > confettiCanvas.height + 50) particles.splice(i,1);
      }
      if (particles.length > 0) confettiAnimationId = requestAnimationFrame(frame);
      else stopConfetti();
    }

    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = requestAnimationFrame(frame);
  }

  function stopConfetti() { if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId); confettiAnimationId = null; if (confettiCanvas) confettiCanvas.style.display = 'none'; if (confettiCtx) confettiCtx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height); }

  function isValidIndex(i) { return Number.isInteger(i) && i >= 0 && i < BOX_COUNT; }

  function generateWinnerPatterns(rows, cols, winLen) {
    const patterns = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols - winLen; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push(r * cols + (c + k));
        patterns.push(line);
      }
    }
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r <= rows - winLen; r++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push((r + k) * cols + c);
        patterns.push(line);
      }
    }
    for (let r = 0; r <= rows - winLen; r++) {
      for (let c = 0; c <= cols - winLen; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push((r + k) * cols + (c + k));
        patterns.push(line);
      }
    }
    for (let r = 0; r <= rows - winLen; r++) {
      for (let c = winLen - 1; c < cols; c++) {
        const line = [];
        for (let k = 0; k < winLen; k++) line.push((r + k) * cols + (c - k));
        patterns.push(line);
      }
    }
    return patterns;
  }

  window.addEventListener('resize', () => {
    if (confettiCanvas) { confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight; }
  });
});
