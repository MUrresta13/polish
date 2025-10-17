/* Dracula’s Tic Tac Toe 2 — no skips, no resets */

// ---------- DOM ----------
const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');

const mediaStage = document.getElementById('mediaStage');
const introVideo = document.getElementById('introVideo');

const gameEl = document.getElementById('game');
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const youWinsEl = document.getElementById('youWins');
const cpuWinsEl = document.getElementById('cpuWins');
const drawStreakEl = document.getElementById('drawStreak');

const successDlg = document.getElementById('successDlg');
const codeField = document.getElementById('codeField');
const copyBtn = document.getElementById('copyBtn');
const okBtn = document.getElementById('okBtn');

// ---------- Start (button only) ----------
startBtn.addEventListener('click', () => {
  startOverlay.classList.add('hidden');
  mediaStage.classList.remove('hidden');
  playIntro();
});

function playIntro(){
  introVideo.innerHTML = '';
  // Try MP4 first; fall back to MP3 (audio-only) if that’s what you have
  const s1 = document.createElement('source');
  s1.src = 'Dracula.mp4'; s1.type = 'video/mp4';
  const s2 = document.createElement('source');
  s2.src = 'Dracula.mp3'; s2.type = 'audio/mpeg';
  introVideo.append(s1, s2);
  introVideo.controls = false;
  introVideo.autoplay = true;
  introVideo.play().catch(()=>{ /* user gesture exists from button press */ });
}
introVideo.addEventListener('ended', () => {
  mediaStage.classList.add('hidden');
  gameEl.classList.remove('hidden');
  statusEl.textContent = firstToMove === 'X' ? 'Your move.' : 'Dracula goes first…';
  if (firstToMove === 'O') draculaTurn();
});

// ---------- Game state ----------
let board, current, finished;
let youWins = 0, cpuWins = 0, drawStreak = 0;
let draculaStreakForReset = 0;
let firstToMove = 'O'; // Dracula starts
const lines = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

initBoard();
function initBoard() {
  board = Array(9).fill(null);
  finished = false;
  current = firstToMove;
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
    draculaStreakForReset = 0;
    drawStreak = 0;
    reflectStats();
    statusEl.textContent = 'You won this round!';
    if (youWins >= 3){
      openSuccess();
      youWins = 0; cpuWins = 0; drawStreak = 0; draculaStreakForReset = 0;
      reflectStats();
      firstToMove = 'O';
    } else {
      nextRound();
    }
    return;
  }

  if (w === 'O'){
    cpuWins++;
    draculaStreakForReset++;
    drawStreak = 0; // draw streak resets on Dracula win
    reflectStats();
    statusEl.textContent = 'Dracula wins this round…';
    if (draculaStreakForReset >= 3){
      youWins = 0;               // wipe player wins after 3 Dracula wins
      draculaStreakForReset = 0;
      reflectStats();
      statusEl.textContent += ' Your wins have been reset!';
    }
    nextRound();
    return;
  }

  // draw
  drawStreak++;
  drawStreakEl.textContent = Math.min(drawStreak,5);
  statusEl.textContent = 'It’s a draw.';
  firstToMove = (drawStreak >= 5) ? 'X' : 'O';
  setTimeout(initBoard, 900);
  if (firstToMove === 'O'){
    setTimeout(()=>draculaTurn(), 1000);
  }
}

function reflectStats(){
  youWinsEl.textContent = youWins;
  cpuWinsEl.textContent = cpuWins;
  drawStreakEl.textContent = Math.min(drawStreak,5);
}

function nextRound(){
  firstToMove = drawStreak >= 5 ? 'X' : 'O';
  setTimeout(()=>{
    initBoard();
    if (firstToMove === 'O') setTimeout(()=>draculaTurn(), 400);
  }, 900);
}

// ---------- Dracula AI (imperfect, 7/10 with variety) ----------
function draculaTurn(){
  if (finished) return;

  // Slight random delay so it feels less robotic
  const delay = 200 + Math.floor(Math.random()*250);
  setTimeout(() => {
    const idx = chooseMove7of10(board, 'O');
    move(idx, 'O');
  }, delay);
}

/**
 * 7/10 difficulty:
 * - Depth-limited minimax (depth 3–5, randomized per turn)
 * - Random tie-breaking among equal moves
 * - Small chance to pick a merely “good” move instead of the absolute best
 * - Score jitter to avoid deterministic lines
 * - Diverse opening (random among corners/center first turn)
 */
function chooseMove7of10(b, ai){
  const human = ai === 'O' ? 'X' : 'O';
  const empties = emptySquares(b);

  // Opening variety if board is empty
  if (empties.length === 9){
    const openers = [0, 2, 4, 6, 8]; // corners + center
    return openers[Math.floor(Math.random()*openers.length)];
  }

  // Randomize search depth between 3 and 5 plies each turn
  const maxDepth = 3 + Math.floor(Math.random()*3); // 3,4,5

  // Evaluate moves with jitter and collect candidates
  let bestScore = -Infinity;
  const scored = [];
  for (const i of empties){
    b[i] = ai;
    const score = minimaxImperfect(b, false, ai, human, 0, maxDepth) + randFloat(-0.8, 0.8);
    b[i] = null;
    scored.push({ idx: i, score });
    if (score > bestScore) bestScore = score;
  }

  // Candidates within a band of the best (keeps variety)
  const band = 1.5; // points near-best
  const nearBest = scored.filter(m => bestScore - m.score <= band);

  // With ~25% chance, deliberately avoid the top pick to be beatable
  const makeHumanHope = Math.random() < 0.25;
  if (makeHumanHope && nearBest.length > 1){
    // pick any near-best that is NOT the absolute top (if possible)
    const notTop = nearBest.filter(m => m.score < bestScore);
    if (notTop.length) return randomFrom(notTop).idx;
  }

  // Otherwise pick randomly among near-best (prevents repetition)
  return randomFrom(nearBest).idx;
}

function minimaxImperfect(b, isMax, ai, human, depth, maxDepth){
  const w = winner(b);
  if (w === ai)   return 10 - depth;
  if (w === human) return depth - 10;
  if (w === 'draw') return 0;

  // Depth limit: at lower depth, add a tiny heuristic for center/corners/lines
  if (depth >= maxDepth){
    return heuristic(b, ai, human) + randFloat(-0.5, 0.5);
  }

  const empties = emptySquares(b);

  if (isMax){
    let val = -Infinity;
    // Randomize order to avoid deterministic lines
    shuffleInPlace(empties);
    for (const i of empties){
      b[i] = ai;
      val = Math.max(val, minimaxImperfect(b, false, ai, human, depth+1, maxDepth));
      b[i] = null;
      // small alpha-like cutoff using heuristic threshold
      if (val >= 10 - depth) break;
    }
    return val;
  } else {
    let val = Infinity;
    shuffleInPlace(empties);
    for (const i of empties){
      b[i] = human;
      val = Math.min(val, minimaxImperfect(b, true, ai, human, depth+1, maxDepth));
      b[i] = null;
      if (val <= depth - 10) break;
    }
    return val;
  }
}

// Lightweight positional heuristic (favor center, corners, potential lines)
function heuristic(b, ai, human){
  const center = (b[4] === ai ? 1.5 : b[4] === human ? -1.5 : 0);
  const corners = [0,2,6,8].reduce((s,i)=>{
    if (b[i] === ai) return s+0.6;
    if (b[i] === human) return s-0.6;
    return s;
  }, 0);
  // count near-complete lines
  let linesScore = 0;
  for (const [a,c,d] of lines){
    const trio = [b[a], b[c], b[d]];
    const aiCount = trio.filter(v=>v===ai).length;
    const huCount = trio.filter(v=>v===human).length;
    if (aiCount && !huCount) linesScore += [0,0.5,1.2,3][aiCount];   // building/finishing
    if (huCount && !aiCount) linesScore -= [0,0.55,1.3,3][huCount]; // blocking pressure
  }
  return center + corners + linesScore;
}

// Utils
function randFloat(min, max){ return Math.random()*(max-min)+min; }
function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffleInPlace(arr){
  for (let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---------- Success ----------
function openSuccess(){ successDlg.showModal(); }
copyBtn.addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(codeField.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(()=>copyBtn.textContent='Copy code', 900);
  }catch{}
});
okBtn.addEventListener('click', ()=>{
  successDlg.close();
  initBoard();
});

// ---------- Initial stat paint ----------
reflectStats();
