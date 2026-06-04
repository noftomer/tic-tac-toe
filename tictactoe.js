// ---------- התחברות / הרשמה (צד-לקוח עם localStorage) ----------
// הערה: שמירת סיסמאות ב-localStorage אינה מאובטחת ומתאימה רק לדמו מקומי.
const USERS_KEY = 'ttt_users';
const SESSION_KEY = 'ttt_session';

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
  catch { return {}; }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

let authMode = 'login'; // 'login' או 'register'

const authScreen = document.getElementById('auth-screen');
const gameScreen = document.getElementById('game-screen');
const userBar = document.getElementById('user-bar');
const userGreeting = document.getElementById('user-greeting');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const authError = document.getElementById('auth-error');
const authSubmit = document.getElementById('auth-submit');

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.remove('hidden');
}

function clearAuthError() {
  authError.classList.add('hidden');
}

function setAuthMode(m) {
  authMode = m;
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.auth === m));
  authSubmit.textContent = m === 'login' ? 'התחבר' : 'הרשם';
  passwordInput.setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
  clearAuthError();
}

function enterGame(username) {
  localStorage.setItem(SESSION_KEY, username);
  userGreeting.textContent = `שלום, ${username}`;
  userBar.classList.remove('hidden');
  authScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  reset();
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  userBar.classList.add('hidden');
  gameScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  authForm.reset();
  setAuthMode('login');
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  clearAuthError();

  if (!username || !password) {
    showAuthError('יש למלא שם משתמש וסיסמה.');
    return;
  }

  const users = loadUsers();

  if (authMode === 'register') {
    if (users[username]) {
      showAuthError('שם המשתמש כבר קיים.');
      return;
    }
    users[username] = password;
    saveUsers(users);
    enterGame(username);
  } else {
    if (users[username] === undefined) {
      showAuthError('שם המשתמש אינו קיים.');
      return;
    }
    if (users[username] !== password) {
      showAuthError('סיסמה שגויה.');
      return;
    }
    enterGame(username);
  }
}

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => setAuthMode(tab.dataset.auth));
});
authForm.addEventListener('submit', handleAuthSubmit);
document.getElementById('logout-btn').addEventListener('click', logout);

// ---------- לוגיקת המשחק ----------
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // שורות
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // עמודות
  [0, 4, 8], [2, 4, 6],            // אלכסונים
];

const HUMAN = 'X';
const CPU = 'O';

let board = Array(9).fill('');
let current = HUMAN;
let mode = 'pvp';      // 'pvp' או 'cpu'
let gameOver = false;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const cells = Array.from(document.querySelectorAll('.cell'));

// בודק את מצב הלוח: מחזיר { winner, line } או null אם המשחק נמשך, או 'draw' בתיקו
function checkWinner(b) {
  for (const line of WIN_LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) {
      return { winner: b[a], line };
    }
  }
  if (b.every(cell => cell !== '')) return { winner: 'draw', line: null };
  return null;
}

function setStatus(text, cls = '') {
  statusEl.textContent = text;
  statusEl.className = 'status' + (cls ? ' ' + cls : '');
}

function render() {
  cells.forEach((cell, i) => {
    cell.textContent = board[i];
    cell.classList.toggle('x', board[i] === 'X');
    cell.classList.toggle('o', board[i] === 'O');
  });
}

function finish(result) {
  gameOver = true;
  if (result.winner === 'draw') {
    setStatus('תיקו!', 'draw');
  } else {
    result.line.forEach(i => cells[i].classList.add('win'));
    const who = mode === 'cpu'
      ? (result.winner === HUMAN ? 'ניצחת!' : 'המחשב ניצח')
      : `שחקן ${result.winner} ניצח!`;
    setStatus(who, 'win');
  }
}

function turnStatus() {
  if (mode === 'cpu') {
    setStatus(current === HUMAN ? 'תורך (X)' : 'המחשב חושב…');
  } else {
    setStatus(`תור השחקן ${current}`);
  }
}

function makeMove(index, player) {
  board[index] = player;
  render();
  const result = checkWinner(board);
  if (result) {
    finish(result);
    return true;
  }
  return false;
}

function handleCellClick(e) {
  const index = +e.currentTarget.dataset.index;
  if (gameOver || board[index] !== '') return;
  if (mode === 'cpu' && current !== HUMAN) return;

  const ended = makeMove(index, current);
  if (ended) return;

  if (mode === 'cpu') {
    current = CPU;
    turnStatus();
    // השהיה קצרה כדי שהמהלך של המחשב יורגש
    setTimeout(cpuMove, 300);
  } else {
    current = current === 'X' ? 'O' : 'X';
    turnStatus();
  }
}

function cpuMove() {
  if (gameOver) return;
  const index = bestMove(board);
  const ended = makeMove(index, CPU);
  if (ended) return;
  current = HUMAN;
  turnStatus();
}

// minimax: מחזיר את אינדקס המהלך האופטימלי עבור המחשב
function bestMove(b) {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (b[i] === '') {
      b[i] = CPU;
      const score = minimax(b, 0, false);
      b[i] = '';
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

function minimax(b, depth, isMaximizing) {
  const result = checkWinner(b);
  if (result) {
    if (result.winner === CPU) return 10 - depth;
    if (result.winner === HUMAN) return depth - 10;
    return 0; // תיקו
  }

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === '') {
        b[i] = CPU;
        best = Math.max(best, minimax(b, depth + 1, false));
        b[i] = '';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] === '') {
        b[i] = HUMAN;
        best = Math.min(best, minimax(b, depth + 1, true));
        b[i] = '';
      }
    }
    return best;
  }
}

function reset() {
  board = Array(9).fill('');
  current = HUMAN;
  gameOver = false;
  cells.forEach(cell => cell.classList.remove('win'));
  render();
  turnStatus();
}

// אירועים
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
document.getElementById('reset-btn').addEventListener('click', reset);

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    reset();
  });
});

// אתחול: שחזור התחברות קיימת או הצגת מסך ההתחברות
(function init() {
  const session = localStorage.getItem(SESSION_KEY);
  const users = loadUsers();
  if (session && users[session] !== undefined) {
    enterGame(session);
  } else {
    localStorage.removeItem(SESSION_KEY);
    setAuthMode('login');
  }
})();
