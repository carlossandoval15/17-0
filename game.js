// ===== 17-0 GAME ENGINE =====

let state = {
  mode: 'classic',
  round: 1,
  maxRounds: 8,
  roster: {},
  currentTeam: null,
  currentDecade: null,
  currentPlayers: [],
  selectedPlayer: null,
  spinning: false,
  spunThisRound: false,
  activeFilter: 'All',
  rerolls: 1
};

const POSITIONS = ['QB', 'RB', 'WR1', 'WR2', 'K', 'EDGE', 'LB', 'DB'];

// ===== SCREEN MANAGEMENT =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showHome() {
  state = {
    mode: 'classic', round: 1, maxRounds: 8, roster: {},
    currentTeam: null, currentDecade: null, currentPlayers: [],
    selectedPlayer: null, spinning: false, spunThisRound: false, activeFilter: 'All',
    rerolls: 1
  };
  clearField();
  // Restore UI elements hidden by daily mode
  document.querySelectorAll('.reroll-btn').forEach(b => b.style.display = '');
  const pill = document.querySelector('.reroll-pill');
  if (pill) pill.style.display = '';
  const spinBtn = document.getElementById('spin-btn');
  if (spinBtn) spinBtn.style.display = '';
  const rerollBar = document.querySelector('.reroll-bar');
  if (rerollBar) rerollBar.style.display = '';

  showScreen('home-screen');
  updateDailyHome();
}

function showHowToPlay() {
  document.getElementById('help-modal').classList.remove('hidden');
}

function closeHelp() {
  document.getElementById('help-modal').classList.add('hidden');
}

// ===== GAME START =====
function startGame(mode) {
  state.mode = mode;
  state.round = 1;
  state.roster = {};
  state.spunThisRound = false;
  state.rerolls = 2;
  clearField();
  updateRoundDisplay();
  showScreen('draft-screen');
  showSpinArea();
}

// ===== OPEN SLOTS HELPER =====
function getOpenSlots() {
  return POSITIONS.filter(pos => !state.roster[pos]);
}

// ===== SPIN =====
function spin() {
  if (state.spinning || state.spunThisRound) return;
  state.spinning = true;

  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = true;
  spinBtn.textContent = '...';

  const teamSlot = document.getElementById('slot-team');
  const eraSlot = document.getElementById('slot-era');
  const teamBox = teamSlot.closest('.spin-slot');
  const eraBox = eraSlot.closest('.spin-slot');
  const spinLogo = document.getElementById('spin-team-logo');

  teamBox.classList.add('spinning');
  eraBox.classList.add('spinning');
  if (spinLogo) spinLogo.style.opacity = '0';

  const openSlots = getOpenSlots();
  const combos = getSmartCombos(openSlots);
  const chosen = combos[Math.floor(Math.random() * combos.length)];

  let ticks = 0;
  const maxTicks = 20;
  const teams = Object.keys(TEAMS);
  const decades = DECADES;

  const interval = setInterval(() => {
    ticks++;
    const rTeam = teams[Math.floor(Math.random() * teams.length)];
    teamSlot.textContent = rTeam;
    eraSlot.textContent = decades[Math.floor(Math.random() * decades.length)];
    if (spinLogo) {
      spinLogo.src = getTeamLogoUrl(rTeam);
      spinLogo.style.opacity = '0.3';
    }

    if (ticks >= maxTicks) {
      clearInterval(interval);
      teamBox.classList.remove('spinning');
      eraBox.classList.remove('spinning');

      teamSlot.textContent = chosen.team;
      eraSlot.textContent = chosen.decade;
      if (spinLogo) {
        spinLogo.src = getTeamLogoUrl(chosen.team);
        spinLogo.style.opacity = '1';
      }

      state.currentTeam = chosen.team;
      state.currentDecade = chosen.decade;
      state.currentPlayers = getFullRosterCombo(chosen.team, chosen.decade);
      state.spinning = false;
      state.spunThisRound = true;

      spinBtn.disabled = false;
      spinBtn.textContent = 'SPIN';

      setTimeout(() => showPlayerArea(), 400);
    }
  }, 80);
}

// ===== RE-ROLL / SWAP =====
function rerollTeam() {
  if (state.rerolls <= 0) return;
  const openSlots = getOpenSlots();
  const combos = getSmartCombos(openSlots).filter(c =>
    c.decade === state.currentDecade && c.team !== state.currentTeam
  );
  if (combos.length === 0) return;
  state.rerolls--;
  const chosen = combos[Math.floor(Math.random() * combos.length)];
  state.currentTeam = chosen.team;
  state.currentPlayers = getFullRosterCombo(state.currentTeam, state.currentDecade);
  showPlayerArea();
}

function rerollEra() {
  if (state.rerolls <= 0) return;
  const openSlots = getOpenSlots();
  const combos = getSmartCombos(openSlots).filter(c =>
    c.team === state.currentTeam && c.decade !== state.currentDecade
  );
  if (combos.length === 0) return;
  state.rerolls--;
  const chosen = combos[Math.floor(Math.random() * combos.length)];
  state.currentDecade = chosen.decade;
  state.currentPlayers = getFullRosterCombo(state.currentTeam, state.currentDecade);
  showPlayerArea();
}

function updateRerolls() {
  const el = document.getElementById('reroll-count');
  if (el) el.textContent = state.rerolls;
  document.querySelectorAll('.reroll-btn').forEach(btn => {
    if (state.rerolls <= 0) {
      btn.disabled = true;
      btn.classList.add('used');
    } else {
      btn.disabled = false;
      btn.classList.remove('used');
    }
  });
}

// ===== PLAYER DISPLAY =====
function showSpinArea() {
  document.getElementById('spin-area').classList.remove('hidden');
  document.getElementById('player-area').classList.add('hidden');
  document.getElementById('slot-team').textContent = '?';
  document.getElementById('slot-era').textContent = '?';
  const spinLogo = document.getElementById('spin-team-logo');
  if (spinLogo) spinLogo.style.opacity = '0';
  state.spunThisRound = false;
}

function showPlayerArea() {
  document.getElementById('spin-area').classList.add('hidden');
  document.getElementById('player-area').classList.remove('hidden');

  const logoEl = document.getElementById('team-logo');
  if (logoEl) {
    logoEl.src = getTeamLogoUrl(state.currentTeam);
    logoEl.style.display = 'block';
  }
  document.getElementById('badge-team').textContent = TEAMS[state.currentTeam];
  document.getElementById('badge-era').textContent = state.currentDecade;

  updateRerolls();

  state.activeFilter = 'All';
  updateFilterButtons();
  renderPlayerList();
}

function filterPlayers(pos) {
  state.activeFilter = pos;
  updateFilterButtons();
  renderPlayerList();
}

function updateFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === state.activeFilter);
  });
}

function renderPlayerList() {
  const list = document.getElementById('player-list');
  const countEl = document.getElementById('player-count');

  let players = state.currentPlayers;
  if (state.activeFilter !== 'All') {
    players = players.filter(p => p.pos === state.activeFilter);
  }

  players.sort((a, b) => b.ovr - a.ovr);
  const totalBeforeCap = players.length;

  const isHidden = state.mode === 'filmroom';
  const openSlots = getOpenSlots();

  // Smart Top 5: guarantee 1 player per open position type, then fill by OVR
  if (state.activeFilter === 'All') {
    const neededTypes = new Set();
    openSlots.forEach(s => {
      if (s === 'WR1' || s === 'WR2') neededTypes.add('WR');
      else neededTypes.add(s);
    });

    const picked = [];
    const used = new Set();

    // First: best player per needed position type
    neededTypes.forEach(type => {
      const best = players.find(p => p.pos === type && !used.has(p));
      if (best && picked.length < 5) {
        picked.push(best);
        used.add(best);
      }
    });

    // Then: fill remaining slots with highest OVR
    for (const p of players) {
      if (picked.length >= 5) break;
      if (!used.has(p)) {
        picked.push(p);
        used.add(p);
      }
    }

    players = picked.sort((a, b) => b.ovr - a.ovr);
  } else {
    players = players.slice(0, 5);
  }

  countEl.textContent = `Top ${players.length} of ${totalBeforeCap}`;

  list.innerHTML = players.map((p, i) => {
    const labels = getStatLabels(p.pos);
    const values = getStatValues(p);
    const statsHtml = labels.map((lbl, j) =>
      `<div class="player-stat"><span class="val">${values[j]}</span><span class="lbl">${lbl}</span></div>`
    ).join('');

    const canFill = getValidSlots(p.pos).some(s => openSlots.includes(s));
    const dimClass = canFill ? '' : 'dimmed';
    const year = getPrimeYear(p);
    const statsLine = labels.map((lbl, j) => `${lbl}: ${values[j]}`).join(' | ');

    return `
      <div class="player-card ${isHidden ? 'stats-hidden' : ''} ${dimClass}" onclick="selectPlayer(${PLAYERS.indexOf(p)})" style="animation-delay:${i * 0.05}s">
        <div class="player-left">
          <img class="card-team-logo" src="${getTeamLogoUrl(p.team)}" alt="" onerror="this.style.display='none'">
          <div class="player-info">
            <span class="player-name">${p.name}</span>
            <span class="player-pos">${p.pos}</span>
            <span class="player-meta">${TEAMS[p.team]} &middot; ${year} Season</span>
            <span class="player-stats-line">${statsLine}</span>
          </div>
        </div>
        <div class="player-right">
          <div class="player-stats">${statsHtml}</div>
          <div class="player-ovr ${p.ovr >= 95 ? 'elite' : ''}">${p.ovr}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== PLAYER SELECTION & POSITION ASSIGNMENT =====
function selectPlayer(playerIndex) {
  state.selectedPlayer = PLAYERS[playerIndex];
  showPositionModal();
}

function showPositionModal() {
  const modal = document.getElementById('position-modal');
  const nameEl = document.getElementById('modal-player-name');
  const btnsEl = document.getElementById('position-btns');
  const logoEl = document.getElementById('modal-logo');

  nameEl.textContent = state.selectedPlayer.name;
  if (logoEl) {
    logoEl.src = getTeamLogoUrl(state.selectedPlayer.team);
    logoEl.style.display = 'inline-block';
  }

  const validSlots = getValidSlots(state.selectedPlayer.pos);

  btnsEl.innerHTML = POSITIONS.map(pos => {
    const filled = state.roster[pos];
    const isValid = validSlots.includes(pos);
    const disabled = filled || !isValid;
    let label = pos;
    if (filled) label += ' (filled)';

    return `<button class="pos-btn ${disabled ? 'disabled' : ''}"
              onclick="confirmPosition('${pos}')"
              ${disabled ? 'disabled' : ''}>
              ${label}
            </button>`;
  }).join('');

  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('position-modal').classList.add('hidden');
  state.selectedPlayer = null;
}

function confirmPosition(pos) {
  if (state.roster[pos]) return;

  state.roster[pos] = state.selectedPlayer;
  closeModal();
  updateFieldSlot(pos);

  state.round++;
  if (state.round > state.maxRounds) {
    setTimeout(showResults, 500);
  } else {
    updateRoundDisplay();
    if (state.mode === 'daily') {
      setTimeout(() => autoSpin(), 400);
    } else {
      showSpinArea();
    }
  }
}

// ===== FIELD MANAGEMENT =====
function clearField() {
  POSITIONS.forEach(pos => {
    const slot = document.getElementById(`pos-${pos}`);
    if (slot) {
      slot.classList.remove('filled');
      slot.querySelector('.slot-name').textContent = '';
      const img = slot.querySelector('.field-logo');
      if (img) img.remove();
    }
  });
}

function updateFieldSlot(pos) {
  const slot = document.getElementById(`pos-${pos}`);
  const player = state.roster[pos];
  if (slot && player) {
    slot.classList.add('filled');
    const lastName = player.name.split(' ').pop();
    slot.querySelector('.slot-name').textContent = lastName;
    // Add mini team logo
    if (!slot.querySelector('.field-logo')) {
      const img = document.createElement('img');
      img.className = 'field-logo';
      img.src = getTeamLogoUrl(player.team);
      img.onerror = function() { this.style.display = 'none'; };
      slot.prepend(img);
    }
  }
}

function updateRoundDisplay() {
  document.getElementById('round-num').textContent = state.round;
}

// ===== RESULTS =====
function showResults() {
  const totalOvr = Object.values(state.roster).reduce((sum, p) => sum + p.ovr, 0);
  const record = calculateRecord(totalOvr);

  const recordEl = document.getElementById('results-record');
  recordEl.textContent = record.label;
  recordEl.className = 'results-record' + (record.wins === 17 ? ' perfect' : '');

  const verdictEl = document.getElementById('results-verdict');
  verdictEl.textContent = record.verdict;

  document.getElementById('results-rating').textContent = totalOvr;

  const rosterEl = document.getElementById('results-roster');
  rosterEl.innerHTML = POSITIONS.map(pos => {
    const p = state.roster[pos];
    if (!p) return '';
    const year = getPrimeYear(p);
    const labels = getStatLabels(p.pos);
    const values = getStatValues(p);
    const statsLine = labels.map((lbl, j) => `${lbl}: ${values[j]}`).join('  |  ');
    return `
      <div class="result-player">
        <div class="rp-left">
          <img class="rp-logo" src="${getTeamLogoUrl(p.team)}" alt="" onerror="this.style.display='none'">
          <span class="rp-pos">${pos}</span>
          <div>
            <div class="rp-name">${p.name}</div>
            <div class="rp-team">${TEAMS[p.team]} &middot; ${year} Season</div>
            <div class="rp-stats">${statsLine}</div>
          </div>
        </div>
        <span class="rp-ovr">${p.ovr}</span>
      </div>
    `;
  }).join('');

  // Save daily result
  if (state.mode === 'daily') saveDailyResult();

  if (record.wins === 17) triggerCelebration();
  showScreen('results-screen');

  // Auto-pop share modal after a short delay
  setTimeout(() => {
    const emoji = record.wins === 17 ? '&#127942;' : record.wins >= 14 ? '&#128293;' : record.wins >= 10 ? '&#127944;' : '&#128548;';
    const modal = document.getElementById('share-modal');
    document.getElementById('share-modal-record').innerHTML = `${emoji} ${record.label}`;
    document.getElementById('share-modal-verdict').textContent = record.verdict;
    document.getElementById('share-modal-rating').textContent = `Team Rating: ${totalOvr}`;
    modal.classList.remove('hidden');
  }, 800);
}

function triggerCelebration() {
  const el = document.getElementById('results-screen');
  el.classList.add('celebrating');
  const c = document.createElement('div');
  c.className = 'confetti-container';
  const colors = ['#D50A0A','#013369','#FFB612','#ffffff','#4CAF50'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 2.5 + 's';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.width = (Math.random() * 8 + 4) + 'px';
    p.style.height = (Math.random() * 12 + 6) + 'px';
    c.appendChild(p);
  }
  el.appendChild(c);
  setTimeout(() => { c.remove(); el.classList.remove('celebrating'); }, 6000);
}

function calculateRecord(totalOvr) {
  let wins, verdict;
  // 8 players, need avg ~96 per player for 17-0 (very hard)
  if (totalOvr >= 775) { wins = 17; verdict = "LEGENDARY. Perfect season. You built a dynasty."; }
  else if (totalOvr >= 760) { wins = 17; verdict = "UNDEFEATED! Your roster is all-time great."; }
  else if (totalOvr >= 745) { wins = 16; verdict = "So close! One bad bounce away from perfection."; }
  else if (totalOvr >= 730) { wins = 15; verdict = "Elite squad. Deep playoff run."; }
  else if (totalOvr >= 715) { wins = 14; verdict = "Contender. This team wins in January."; }
  else if (totalOvr >= 700) { wins = 13; verdict = "Solid playoff team. Missing one piece."; }
  else if (totalOvr >= 685) { wins = 12; verdict = "Playoff bound. A few tough losses."; }
  else if (totalOvr >= 665) { wins = 11; verdict = "Wild card team. Scrappy but dangerous."; }
  else if (totalOvr >= 645) { wins = 10; verdict = "Above average. Bubble team."; }
  else if (totalOvr >= 625) { wins = 9; verdict = "Mediocre. Not bad, not great."; }
  else if (totalOvr >= 600) { wins = 8; verdict = "Below .500. Back to the drawing board."; }
  else if (totalOvr >= 580) { wins = 7; verdict = "Rough season. Fans are frustrated."; }
  else if (totalOvr >= 560) { wins = 5; verdict = "Tank mode. At least you get a good draft pick."; }
  else { wins = 3; verdict = "Historically bad. Fire the GM."; }
  return { wins, losses: 17 - wins, label: `${wins}-${17 - wins}`, verdict };
}

function closeShareModal() {
  document.getElementById('share-modal').classList.add('hidden');
}

// ===== SHARE =====
const GAME_URL = 'https://carlossandoval15.github.io/17-0/';

function getShareText() {
  const totalOvr = Object.values(state.roster).reduce((sum, p) => sum + p.ovr, 0);
  const record = calculateRecord(totalOvr);
  const rosterLines = POSITIONS.map(pos => {
    const p = state.roster[pos];
    if (!p) return '';
    return `${pos}: ${p.name} (${p.ovr})`;
  }).join('\n');

  return `I went ${record.label} in 17-0! ` + (record.wins === 17 ? 'PERFECT SEASON! ' : '') +
    `Team Rating: ${totalOvr}\n\n${rosterLines}\n\nCan you go 17-0?\n${GAME_URL}`;
}

function getShareTextShort() {
  const totalOvr = Object.values(state.roster).reduce((sum, p) => sum + p.ovr, 0);
  const record = calculateRecord(totalOvr);
  const emoji = record.wins === 17 ? '🏆' : record.wins >= 14 ? '🔥' : record.wins >= 10 ? '🏈' : '😤';
  return `${emoji} I went ${record.label} in 17-0! Team Rating: ${totalOvr}. Can you beat me?\n${GAME_URL}`;
}

function getActiveShareText() {
  return state.mode === 'daily' ? getDailyShareText() : getShareTextShort();
}
function getActiveShareTextFull() {
  return state.mode === 'daily' ? getDailyShareText() : getShareText();
}

function shareToX() {
  const text = encodeURIComponent(getActiveShareText());
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
}

function shareToThreads() {
  const text = encodeURIComponent(getActiveShareText());
  window.open(`https://www.threads.net/intent/post?text=${text}`, '_blank');
}

function shareToFB() {
  const url = encodeURIComponent(GAME_URL);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

function shareViaText() {
  const text = encodeURIComponent(getActiveShareText());
  window.open(`sms:?&body=${text}`, '_self');
}

function shareViaEmail() {
  const subject = encodeURIComponent('Can you go 17-0? NFL Draft Game');
  const body = encodeURIComponent(getActiveShareTextFull());
  window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
}

function copyScore() {
  navigator.clipboard.writeText(getActiveShareTextFull()).then(() => {
    const msg = document.getElementById('copied-msg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2000);
  });
}

function nativeShare() {
  if (navigator.share) {
    const totalOvr = Object.values(state.roster).reduce((sum, p) => sum + p.ovr, 0);
    const record = calculateRecord(totalOvr);
    navigator.share({
      title: '17-0 NFL Draft Game',
      text: getActiveShareText(),
      url: GAME_URL
    });
  } else {
    copyScore();
  }
}

// ===== DAILY CHALLENGE =====
const LAUNCH_DATE = new Date('2026-06-16');

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

function getDailyNumber() {
  const today = new Date(); today.setHours(0,0,0,0);
  const launch = new Date(LAUNCH_DATE); launch.setHours(0,0,0,0);
  return Math.floor((today - launch) / 86400000) + 1;
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateDailySpins(dateStr) {
  const seed = parseInt(dateStr);
  const rng = seededRandom(seed);
  const allCombos = getValidCombos();
  const spins = [];
  for (let i = 0; i < 8; i++) {
    const idx = Math.floor(rng() * allCombos.length);
    spins.push(allCombos[idx]);
  }
  return spins;
}

function startDaily() {
  const today = getTodayString();
  const saved = localStorage.getItem('daily_' + today);
  if (saved) {
    showDailyAlreadyPlayed(JSON.parse(saved));
    return;
  }

  state.mode = 'daily';
  state.round = 1;
  state.roster = {};
  state.rerolls = 0;
  state.spunThisRound = false;
  state.dailyDate = today;
  state.dailySpins = generateDailySpins(today);

  clearField();
  updateRoundDisplay();
  showScreen('draft-screen');

  // Hide swap buttons and reroll pill for daily
  document.querySelectorAll('.reroll-btn').forEach(b => b.style.display = 'none');
  document.querySelector('.reroll-pill').style.display = 'none';

  setTimeout(() => autoSpin(), 600);
}

function autoSpin() {
  const combo = state.dailySpins[state.round - 1];

  const spinBtn = document.getElementById('spin-btn');
  spinBtn.style.display = 'none';

  const teamSlot = document.getElementById('slot-team');
  const eraSlot = document.getElementById('slot-era');
  const teamBox = teamSlot.closest('.spin-slot');
  const eraBox = eraSlot.closest('.spin-slot');
  const spinLogo = document.getElementById('spin-team-logo');

  document.getElementById('spin-area').classList.remove('hidden');
  document.getElementById('player-area').classList.add('hidden');
  teamSlot.textContent = '?';
  eraSlot.textContent = '?';
  if (spinLogo) spinLogo.style.opacity = '0';

  teamBox.classList.add('spinning');
  eraBox.classList.add('spinning');

  let ticks = 0;
  const maxTicks = 18;
  const teams = Object.keys(TEAMS);
  const decades = DECADES;

  const interval = setInterval(() => {
    ticks++;
    const rTeam = teams[Math.floor(Math.random() * teams.length)];
    teamSlot.textContent = rTeam;
    eraSlot.textContent = decades[Math.floor(Math.random() * decades.length)];
    if (spinLogo) { spinLogo.src = getTeamLogoUrl(rTeam); spinLogo.style.opacity = '0.3'; }

    if (ticks >= maxTicks) {
      clearInterval(interval);
      teamBox.classList.remove('spinning');
      eraBox.classList.remove('spinning');
      teamSlot.textContent = combo.team;
      eraSlot.textContent = combo.decade;
      if (spinLogo) { spinLogo.src = getTeamLogoUrl(combo.team); spinLogo.style.opacity = '1'; }

      state.currentTeam = combo.team;
      state.currentDecade = combo.decade;
      state.currentPlayers = getFullRosterCombo(combo.team, combo.decade);
      state.spunThisRound = true;

      setTimeout(() => {
        document.getElementById('spin-area').classList.add('hidden');
        document.getElementById('player-area').classList.remove('hidden');
        const logoEl = document.getElementById('team-logo');
        if (logoEl) { logoEl.src = getTeamLogoUrl(state.currentTeam); logoEl.style.display = 'block'; }
        document.getElementById('badge-team').textContent = TEAMS[state.currentTeam];
        document.getElementById('badge-era').textContent = state.currentDecade;
        // Hide reroll bar in daily
        document.querySelector('.reroll-bar').style.display = 'none';
        state.activeFilter = 'All';
        updateFilterButtons();
        renderPlayerList();
      }, 400);
    }
  }, 70);
}

function saveDailyResult() {
  const today = getTodayString();
  const totalOvr = Object.values(state.roster).reduce((sum, p) => sum + p.ovr, 0);
  const record = calculateRecord(totalOvr);
  const picks = POSITIONS.map(pos => {
    const p = state.roster[pos];
    return p ? { name: p.name, pos: p.pos, ovr: p.ovr, team: p.team } : null;
  });

  const result = { record: record.label, wins: record.wins, totalOvr, picks, date: today };
  localStorage.setItem('daily_' + today, JSON.stringify(result));

  // Update streak
  let streak = parseInt(localStorage.getItem('daily_streak') || '0');
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}${String(yesterday.getMonth()+1).padStart(2,'0')}${String(yesterday.getDate()).padStart(2,'0')}`;
  if (localStorage.getItem('daily_' + yStr)) {
    streak++;
  } else {
    streak = 1;
  }
  localStorage.setItem('daily_streak', streak.toString());
  localStorage.setItem('daily_last', today);
}

function showDailyAlreadyPlayed(result) {
  alert(`You already played today's Daily Challenge!\n\nYour result: ${result.record} (Rating: ${result.totalOvr})\n\nCome back tomorrow for a new challenge!`);
}

function getDailyShareText() {
  const totalOvr = Object.values(state.roster).reduce((sum, p) => sum + p.ovr, 0);
  const record = calculateRecord(totalOvr);
  const num = getDailyNumber();
  const streak = parseInt(localStorage.getItem('daily_streak') || '1');

  const blocks = POSITIONS.map(pos => {
    const p = state.roster[pos];
    if (!p) return '⬛';
    if (p.ovr >= 95) return '🟥';
    if (p.ovr >= 88) return '🟧';
    if (p.ovr >= 80) return '🟨';
    return '⬜';
  }).join('');

  let text = `17-0 Daily #${num}\n`;
  text += record.wins === 17 ? '🏆 ' : '';
  text += `${record.label} | Rating: ${totalOvr}\n\n`;
  text += `${blocks}\n`;
  if (streak > 1) text += `🔥 ${streak} day streak\n`;
  text += `\nCan you beat me?\n${GAME_URL}`;
  return text;
}

function updateDailyHome() {
  const numEl = document.getElementById('daily-number');
  const btnEl = document.getElementById('daily-btn');
  const streakEl = document.getElementById('daily-streak');
  if (!numEl) return;

  numEl.textContent = `#${getDailyNumber()}`;

  const today = getTodayString();
  const saved = localStorage.getItem('daily_' + today);
  if (saved) {
    const r = JSON.parse(saved);
    btnEl.textContent = `Played: ${r.record}`;
    btnEl.classList.add('btn-played');
  }

  const streak = parseInt(localStorage.getItem('daily_streak') || '0');
  const lastPlayed = localStorage.getItem('daily_last');
  // Check if streak is still active
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}${String(yesterday.getMonth()+1).padStart(2,'0')}${String(yesterday.getDate()).padStart(2,'0')}`;
  if (streak > 0 && (lastPlayed === today || lastPlayed === yStr)) {
    streakEl.innerHTML = `🔥 ${streak} day streak`;
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  showHome();
  updateDailyHome();
});
