// Advanced Tumble / Cascading Reels & Gold-Plated Wild Conversion Engine
const STAKE_LEVELS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 250000, 500000];

window.SlotEngine = {
  currentGame: window.SLOT_CATALOG[1], // Default: Mahjong Ways 2
  stakeIdx: 1,
  doubleChance: false,
  turbo: false,
  isSpinning: false,
  autoLeft: 0,
  freeSpins: 0,
  matrix: [], // 5 cols x 4 rows

  init() {
    this.renderCatalog('ALL');
    this.loadGame(this.currentGame.id, false);
    this.bindEvents();
  },

  renderCatalog(filterProv) {
    const grid = document.getElementById('gameCatalogGrid');
    const list = filterProv === 'ALL'
      ? window.SLOT_CATALOG
      : window.SLOT_CATALOG.filter(g => g.provider === filterProv);

    grid.innerHTML = list.map(g => `
      <div class="game-card">
        <div class="game-thumb" style="background:${g.bg}">
          <span class="game-prov-tag">${g.providerLabel}</span>
          <span class="game-rtp-tag">RTP ${g.rtp}</span>
          <span>${g.icon}</span>
        </div>
        <div class="game-card-body">
          <div>
            <h4>${g.name}</h4>
            <p>${g.desc}</p>
          </div>
          <button class="btn-gold full-btn" onclick="launchGame('${g.id}')">▶ MAIN SEKARANG</button>
        </div>
      </div>
    `).join('');
  },

  loadGame(gameId, autoSwitch = true) {
    const found = window.SLOT_CATALOG.find(g => g.id === gameId);
    if (!found) return;
    this.currentGame = found;
    this.freeSpins = 0;
    document.getElementById('fsBanner').classList.add('hidden');

    document.getElementById('arenaGameIcon').textContent = found.icon;
    document.getElementById('arenaGameName').textContent = found.name;
    document.getElementById('arenaGameProvider').textContent = `${found.providerLabel} • ${found.ways}`;
    document.getElementById('arenaRtp').textContent = found.rtp;
    document.getElementById('arenaWays').textContent = found.ways;
    document.getElementById('paytableGameTitle').textContent = found.name;

    this.updateLadderUI(0, false);
    this.renderMiniPaytable();
    this.updateBetUI();

    this.matrix = this.buildRandomMatrix();
    this.renderMatrix(this.matrix);

    if (autoSwitch) switchSection('slotArenaSection');
  },

  renderMiniPaytable() {
    const el = document.getElementById('miniPaytable');
    el.innerHTML = this.currentGame.symbols.map(s => `
      <div class="mini-pay-card">
        <span>${s.icon}</span>
        <div>
          <strong>${s.label}</strong>
          ${s.isWild ? 'Pengganti Semua' : s.isScatter ? '3+ = 12 Free Spin' : `Base: ${s.payout}x`}
        </div>
      </div>
    `).join('');
  },

  updateLadderUI(stepIdx, isFS) {
    const ladder = isFS ? this.currentGame.fsLadder : this.currentGame.ladder;
    const container = document.getElementById('multiplierLadder');
    container.innerHTML = ladder.map((val, idx) => `
      <div class="mult-step ${idx === Math.min(stepIdx, ladder.length - 1) ? 'active' : ''}">${val}x</div>
    `).join('');
  },

  getBaseBet() {
    const raw = STAKE_LEVELS[this.stakeIdx];
    return this.doubleChance ? Math.floor(raw * 1.25) : raw;
  },

  updateBetUI() {
    const bet = this.getBaseBet();
    document.getElementById('currentBetDisplay').textContent = fmtKoin(bet);
    document.getElementById('buyBonusPrice').textContent = fmtKoin(STAKE_LEVELS[this.stakeIdx] * 100);
  },

  pickSymbol() {
    const syms = this.currentGame.symbols;
    const globalRtp = window.PortalDB.getGlobalRtp();
    // Weighted pool adjusted by server RTP setting
    const weights = syms.map(s => {
      if (s.isScatter) return this.doubleChance ? 5 : 3;
      if (s.isWild) return globalRtp > 70 ? 6 : 4;
      return globalRtp > 60 ? 14 : 11;
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < syms.length; i++) {
      if (r < weights[i]) return syms[i];
      r -= weights[i];
    }
    return syms[syms.length - 1];
  },

  buildRandomMatrix() {
    const cols = [];
    for (let c = 0; c < 5; c++) {
      const col = [];
      for (let r = 0; r < 4; r++) {
        const sym = this.pickSymbol();
        // Mahjong Feature: Middle reels (1,2,3) can spawn Gold-Plated tiles that turn into WILD on tumble!
        const isGold = this.currentGame.goldPlateEnabled && c >= 1 && c <= 3 && !sym.isScatter && !sym.isWild && Math.random() < 0.22;
        col.push({ sym, isGold });
      }
      cols.push(col);
    }
    return cols;
  },

  renderMatrix(matrix, spinning = false, highlightSet = new Set()) {
    for (let c = 0; c < 5; c++) {
      const colEl = document.getElementById(`col${c}`);
      colEl.innerHTML = '';
      for (let r = 0; r < 4; r++) {
        const cellData = matrix[c][r];
        const div = document.createElement('div');
        div.className = 'tile-cell';
        if (spinning) div.classList.add('spinning');
        if (cellData.isGold) div.classList.add('gold-plated');
        if (highlightSet.has(`${c},${r}`)) div.classList.add('tumble-win');
        div.innerHTML = `<span>${cellData.sym.icon}</span><small>${cellData.sym.label}</small>`;
        colEl.appendChild(div);
      }
    }
  },

  // Evaluate Ways-to-Win (Left to Right across reels 0,1,2,3,4)
  evaluateWays(matrix, baseBet) {
    const syms = this.currentGame.symbols;
    let stepWin = 0;
    const winCoords = new Set();
    const matchedNames = [];

    for (const target of syms) {
      if (target.isScatter || target.isWild) continue;

      let reelMatches = [];
      let waysCount = 1;

      for (let c = 0; c < 5; c++) {
        const hitsInCol = [];
        for (let r = 0; r < 4; r++) {
          const cellSym = matrix[c][r].sym;
          if (cellSym.id === target.id || cellSym.isWild) {
            hitsInCol.push(`${c},${r}`);
          }
        }
        if (hitsInCol.length > 0) {
          reelMatches.push(hitsInCol);
          waysCount *= hitsInCol.length;
        } else {
          break;
        }
      }

      if (reelMatches.length >= 3) {
        const lengthMult = reelMatches.length === 3 ? 1 : reelMatches.length === 4 ? 2.5 : 6;
        const payout = (baseBet / 10) * target.payout * lengthMult * Math.min(waysCount, 12);
        stepWin += payout;
        matchedNames.push(`${target.label} (${reelMatches.length}x)`);
        reelMatches.forEach(arr => arr.forEach(coord => winCoords.add(coord)));
      }
    }

    return { stepWin, winCoords, matchedNames };
  },

  countScatters(matrix) {
    let count = 0;
    const coords = [];
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 4; r++) {
        if (matrix[c][r].sym.isScatter) {
          count++;
          coords.push(`${c},${r}`);
        }
      }
    }
    return { count, coords };
  },

  applyTumbleDrop(matrix, winCoords) {
    const wildSym = this.currentGame.symbols.find(s => s.isWild);
    for (let c = 0; c < 5; c++) {
      const survivors = [];
      for (let r = 0; r < 4; r++) {
        if (winCoords.has(`${c},${r}`)) {
          // Mahjong Gold-Plated rule: Gold tile transforms into WILD instead of disappearing!
          if (matrix[c][r].isGold && wildSym) {
            survivors.push({ sym: wildSym, isGold: false });
          }
        } else {
          survivors.push(matrix[c][r]);
        }
      }
      while (survivors.length < 4) {
        const sym = this.pickSymbol();
        const isGold = this.currentGame.goldPlateEnabled && c >= 1 && c <= 3 && !sym.isScatter && !sym.isWild && Math.random() < 0.2;
        survivors.unshift({ sym, isGold });
      }
      matrix[c] = survivors;
    }
  },

  async spin(forceBonus = false) {
    if (this.isSpinning) return;

    const user = window.PortalDB.getCurrentUser();
    if (!user) {
      openModal('authModal');
      return showToast('⚠️ Silakan Masuk atau Daftar VIP terlebih dahulu untuk bermain!');
    }

    const bet = this.getBaseBet();
    const isFS = this.freeSpins > 0;

    if (!isFS && user.balance < bet) {
      this.autoLeft = 0;
      document.getElementById('btnAutoSpin').classList.remove('active');
      return showToast('⚠️ Saldo koin tidak cukup! Silakan isi saldo di menu Deposit.');
    }

    this.isSpinning = true;
    document.getElementById('btnSpinAction').disabled = true;

    if (isFS) {
      this.freeSpins--;
      document.getElementById('fsRemaining').textContent = this.freeSpins;
    } else {
      window.PortalDB.updateActiveUser(u => { u.balance -= bet; u.spins += 1; });
      syncAccountUI();
    }

    // Spin blur animation
    this.renderMatrix(this.buildRandomMatrix(), true);
    const spinSfx = setInterval(() => window.sfx.spin(), 75);
    await new Promise(r => setTimeout(r, this.turbo ? 280 : 720));
    clearInterval(spinSfx);

    this.matrix = this.buildRandomMatrix();
    if (forceBonus) {
      const sc = this.currentGame.symbols.find(s => s.isScatter);
      this.matrix[0][1] = { sym: sc, isGold: false };
      this.matrix[2][2] = { sym: sc, isGold: false };
      this.matrix[4][1] = { sym: sc, isGold: false };
    }

    let cumulativeSpinWin = 0;
    let tumbleStep = 0;
    const activeLadder = isFS ? this.currentGame.fsLadder : this.currentGame.ladder;

    // Cascading Tumble Loop
    while (true) {
      this.updateLadderUI(tumbleStep, isFS);
      const mult = activeLadder[Math.min(tumbleStep, activeLadder.length - 1)];
      const evalRes = this.evaluateWays(this.matrix, bet);

      if (evalRes.stepWin > 0) {
        const multipliedWin = evalRes.stepWin * mult;
        cumulativeSpinWin += multipliedWin;
        this.renderMatrix(this.matrix, false, evalRes.winCoords);
        window.sfx.tumble(tumbleStep);
        document.getElementById('machineStatus').textContent =
          `🔥 TUMBLE #${tumbleStep + 1} (${mult}x): ${evalRes.matchedNames.join(', ')} (+${fmtKoin(multipliedWin)})`;
        document.getElementById('spinWinAmount').textContent = fmtKoin(cumulativeSpinWin);

        await new Promise(r => setTimeout(r, this.turbo ? 320 : 680));
        this.applyTumbleDrop(this.matrix, evalRes.winCoords);
        tumbleStep++;
      } else {
        this.renderMatrix(this.matrix, false);
        break;
      }
    }

    // Check Scatters for Free Spins
    const scInfo = this.countScatters(this.matrix);
    if (scInfo.count >= 3) {
      this.freeSpins += 12;
      this.renderMatrix(this.matrix, false, new Set(scInfo.coords));
      document.getElementById('fsBanner').classList.remove('hidden');
      document.getElementById('fsRemaining').textContent = this.freeSpins;
      document.getElementById('fsBaseMult').textContent = `${this.currentGame.fsLadder[0]}x`;
      showToast(`🎉 SCATTER AKTIF! Anda mendapatkan 12 PUTARAN GRATIS!`);
    }

    if (this.freeSpins === 0) {
      document.getElementById('fsBanner').classList.add('hidden');
    }

    if (cumulativeSpinWin > 0) {
      window.PortalDB.updateActiveUser(u => { u.balance += cumulativeSpinWin; });
      syncAccountUI();
      document.getElementById('spinWinAmount').textContent = fmtKoin(cumulativeSpinWin);
      document.getElementById('machineStatus').textContent = `✨ TOTAL KEMENANGAN PUTARAN: +${fmtKoin(cumulativeSpinWin)} Koin!`;

      if (cumulativeSpinWin >= bet * 15) {
        window.sfx.jackpot();
        document.getElementById('celebTitle').textContent = cumulativeSpinWin >= bet * 40 ? '⚡ SENSATIONAL WIN! ⚡' : '🔥 MEGA WIN! 🔥';
        document.getElementById('celebSub').textContent = `${this.currentGame.name} • ${tumbleStep}x Kombo Tumble`;
        document.getElementById('celebAmount').textContent = `+${fmtKoin(cumulativeSpinWin)} KOIN`;
        openModal('celebrationModal');
      } else {
        window.sfx.win();
      }
    } else {
      document.getElementById('spinWinAmount').textContent = '0';
      document.getElementById('machineStatus').textContent = 'Putaran selesai. Coba lagi untuk memicu Tumble!';
    }

    window.PortalDB.addLog(
      `SLOT: ${this.currentGame.name}`,
      isFS ? 'Free Spin Mode' : `Tumble ${tumbleStep}x`,
      isFS ? 0 : bet,
      cumulativeSpinWin > 0 ? `+${fmtKoin(cumulativeSpinWin)}` : '0'
    );

    this.isSpinning = false;
    document.getElementById('btnSpinAction').disabled = false;

    if (this.freeSpins > 0) {
      setTimeout(() => this.spin(false), this.turbo ? 450 : 950);
    } else if (this.autoLeft > 0) {
      this.autoLeft--;
      const autoBtn = document.getElementById('btnAutoSpin');
      if (this.autoLeft === 0) {
        autoBtn.classList.remove('active');
        autoBtn.textContent = '🔄 AUTO';
      } else {
        autoBtn.textContent = `⏹️ STOP (${this.autoLeft})`;
        setTimeout(() => this.spin(false), this.turbo ? 420 : 900);
      }
    }
  },

  bindEvents() {
    document.querySelectorAll('.prov-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.sfx.click();
        document.querySelectorAll('.prov-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderCatalog(btn.dataset.provider);
      });
    });

    document.getElementById('btnDecreaseBet').addEventListener('click', () => {
      if (this.stakeIdx > 0) { this.stakeIdx--; this.updateBetUI(); window.sfx.click(); }
    });
    document.getElementById('btnIncreaseBet').addEventListener('click', () => {
      if (this.stakeIdx < STAKE_LEVELS.length - 1) { this.stakeIdx++; this.updateBetUI(); window.sfx.click(); }
    });

    document.getElementById('btnDoubleChance').addEventListener('click', e => {
      this.doubleChance = !this.doubleChance;
      e.currentTarget.classList.toggle('active', this.doubleChance);
      e.currentTarget.textContent = `🍀 DOUBLE CHANCE: ${this.doubleChance ? 'ON' : 'OFF'}`;
      this.updateBetUI();
      window.sfx.click();
    });

    document.getElementById('btnTurboSpin').addEventListener('click', e => {
      this.turbo = !this.turbo;
      e.currentTarget.classList.toggle('active', this.turbo);
      window.sfx.click();
    });

    document.getElementById('btnSpinAction').addEventListener('click', () => this.spin(false));

    document.getElementById('btnBuyBonus').addEventListener('click', () => {
      if (this.isSpinning || this.freeSpins > 0) return;
      const user = window.PortalDB.getCurrentUser();
      if (!user) return openModal('authModal');
      const cost = STAKE_LEVELS[this.stakeIdx] * 100;
      if (user.balance < cost) return showToast('⚠️ Saldo tidak cukup untuk Beli Free Spin!');
      window.PortalDB.updateActiveUser(u => { u.balance -= cost; });
      syncAccountUI();
      this.spin(true);
    });

    document.getElementById('btnAutoSpin').addEventListener('click', e => {
      if (this.autoLeft > 0) {
        this.autoLeft = 0;
        e.currentTarget.classList.remove('active');
        e.currentTarget.textContent = '🔄 AUTO';
      } else {
        this.autoLeft = Number(document.getElementById('autoSpinSelect').value);
        e.currentTarget.classList.add('active');
        this.spin(false);
      }
    });
  }
};

window.launchGame = function(id) {
  window.sfx.click();
  window.SlotEngine.loadGame(id, true);
};

document.addEventListener('DOMContentLoaded', () => window.SlotEngine.init());
