/* Dracula’s Tic Tac Toe 2 — all logic in one file */

// ---------- DOM ----------
const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');
const mediaStage = document.getElementById('mediaStage');
const introVideo = document.getElementById('introVideo');
const skipBtn = document.getElementById('skipBtn');

const gameEl = document.getElementById('game');
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const youWinsEl = document.getElementById('youWins');
const cpuWinsEl = document.getElementById('cpuWins');
const drawStreakEl = document.getElementById('drawStreak');

const resetRoundBtn = document.getElementById('resetRound');
const resetAllBtn = document.getElementById('resetAll');

const successDlg = document.getElementById('successDlg');
const codeField = document.getElementById('codeField');
const copyBtn = document.getElementById('copyBtn');
const okBtn = document.getElementById('okBtn');

// ---------- Media setup (video with fallback to mp3 audio) ----------
function prepareIntroMedia() {
  introVideo.innerHTML = '';
  // If you only have Dracula.mp3, this still works: video element plays audio, screen stays black.
  const s1 = document.createElement('source');
  s1.src = 'Dracula.mp4'; s1.type = 'video/mp4';
  const s2 = document.createElement('source');
  s2.src = 'Dracula.mp3'; s2.type = 'audio/mpeg';
  introVideo.append(s1, s2);
  introVideo.controls = false;
  introVideo.autoplay = true;
}

startBtn.addEventListener('click', () => {
  startOverlay.classList.add('hidden');
  mediaStage.classList.remove('hidden');
  prepareIntroMedia();
  introVideo.play().catch(()=>{ /* user gesture exists, should play */ });
});

skipBtn.addEventListener('click', endIntro);
introVideo.addEventListener('ended', endIntro);

function endIntro() {
  introVideo.pause();
  mediaStage.classList.add('hidden');
  gameEl.classList.remove('hidden');
  statusEl.textContent = firstToMove === 'X'
    ? 'Your move.'
    : 'Dracula goes first…';
  if (firstToMove === 'O') draculaTurn();
}

// ---------- Game state ----------
let board, current, finished;
let youWins = 0, cpuWins = 0, drawStreak = 0;
let draculaStreakForReset = 0;
let firstToMove = 'O'; // O = Dracula, X = You
const lines = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

initBoard();
function initBoard() {
  board = Array(9).fill(null);
  finished = false;
  current = firstToMove; // X or O
  boardEl.innerHTML = '';
  for (let i=0;i<9;i++){
    const c = document.createElement('button');
    c.className = 'cell';
    c.dataset.idx = i;
    c.addEventListener('click', onCell);
    boardEl.appendChild(c);
  }
  render();
}

function onCell(e){
  const idx = +e.currentTarget.dataset.idx;
  if (finished || board[idx] !== null || current !== 'X') return;
  move(idx, 'X');
  if (!finished) draculaTurn();
}

function move(idx, mark){
  board[idx] = mark;
  current = mark === 'X' ? 'O' : 'X';
  render();
  checkEnd();
}

function render(){
  [...boardEl.children].forEach((cell, i)=>{
    cell.innerHTML = board[i] ? `<span class="mark ${board[i]==='X'?'x':'o'}">${board[i]==='X'?'🎃':'🦇'}</span>` : '';
  });
  statusEl.textContent = finished
    ? statusEl.textContent
    : current==='X' ? 'Your move.' : 'Dracula is thinking…';
}

function emptySquares(b=board){ return b.map((v,i)=>v===null?i:null).filter(v=>v!==null); }
function winner(b=board){
  for(const [a,b2,c] of lines){
    if (b[a] && b[a]===b[b2] && b[a]===b[c]) return b[a];
  }
  return emptySquares(b).length? null : 'draw';
}

function checkEnd(){
  const w = winner();
  if (!w) return;

  finished = true;

  if (w === 'X'){
    youWins++;
    draculaStreakForReset = 0; // Dracula didn’t win this one
    drawStreak = 0;            // break draw streak
    youWinsEl.textContent = youWins;
    statusEl.textContent = 'You won this round!';
    if (youWins >= 3){
      // Success
      openSuccess();
      // Reset counters for a fresh run if they continue
      youWins = 0; cpuWins = 0; drawStreak = 0; draculaStreakForReset = 0;
      reflectStats();
      firstToMove = 'O'; // Dracula starts again for a new session
    } else {
      // Next round: Dracula starts unless player earned first via draws
      nextRound();
    }
    return;
  }

  if (w === 'O'){
    cpuWins++;
    draculaStreakForReset++;
    drawStreak = 0; // as requested: draw streak resets on Dracula win
    reflectStats();
    statusEl.textContent = 'Dracula wins this round…';
    if (draculaStreakForReset >= 3){
      youWins = 0;               // wipe the player’s win score
      draculaStreakForReset = 0; // restart Dracula’s 3-win counter
      youWinsEl.textContent = youWins;
      statusEl.textContent += ' Your wins have been reset!';
    }
    nextRound();
    return;
  }

  // draw
  drawStreak++;
  drawStreakEl.textContent = Math.min(drawStreak,5);
  statusEl.textContent = 'It’s a draw.';
  // If player earns 5 consecutive draws, they go first next round
  if (drawStreak >= 5) firstToMove = 'X';
  else firstToMove = 'O';
  setTimeout(initBoard, 900);
}

function reflectStats(){
  youWinsEl.textContent = youWins;
  cpuWinsEl.textContent = cpuWins;
  drawStreakEl.textContent = Math.min(drawStreak,5);
}

function nextRound(){
  firstToMove = drawStreak >= 5 ? 'X' : 'O';
  setTimeout(initBoard, 900);
  // If Dracula still starts, let him immediately move after board appears
  if (firstToMove === 'O'){
    setTimeout(()=>draculaTurn(), 1000);
  }
}

// ---------- Dracula AI (minimax, optimal) ----------
function draculaTurn(){
  if (finished) return;
  const idx = bestMove(board, 'O');
  move(idx, 'O');
}

// Minimax with small depth scoring
function bestMove(b, ai){
  const human = ai==='O' ? 'X':'O';
  const avail = emptySquares(b);
  let bestScore = -Infinity, bestIndex = avail[0];

  for (const i of avail){
    b[i]=ai;
    const score = minimax(b, false, ai, human, 0);
    b[i]=null;
    if (score>bestScore){ bestScore=score; bestIndex=i; }
  }
  return bestIndex;
}

function minimax(b, isMax, ai, human, depth){
  const w = winner(b);
  if (w===ai)   return 10 - depth;
  if (w===human) return depth - 10;
  if (w==='draw') return 0;

  const avail = emptySquares(b);
  if (isMax){
    let val=-Infinity;
    for (const i of avail){
      b[i]=ai;
      val=Math.max(val, minimax(b,false,ai,human,depth+1));
      b[i]=null;
    }
    return val;
  } else {
    let val=Infinity;
    for (const i of avail){
      b[i]=human;
      val=Math.min(val, minimax(b,true,ai,human,depth+1));
      b[i]=null;
    }
    return val;
  }
}

// ---------- Controls ----------
resetRoundBtn.addEventListener('click', ()=>initBoard());
resetAllBtn.addEventListener('click', ()=>{
  youWins=0; cpuWins=0; drawStreak=0; draculaStreakForReset=0; firstToMove='O';
  reflectStats();
  initBoard();
});

function openSuccess(){
  successDlg.showModal();
}
copyBtn.addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(codeField.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(()=>copyBtn.textContent='Copy code', 900);
  }catch{ /* ignore */ }
});
okBtn.addEventListener('click', ()=>{
  successDlg.close();
  initBoard();
});

// ---------- First round ----------
reflectStats();
