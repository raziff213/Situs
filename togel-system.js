// Full 4D/3D/2D, Bolak-Balik, Colok Bebas/Macau & Shio System
const MARKETS = [
  { code: 'SGP', name: 'Singapore Pools', last: '4829', schedule: 'Tutup 17:30 WIB' },
  { code: 'HK', name: 'Hongkong Pools', last: '9104', schedule: 'Tutup 22:45 WIB' },
  { code: 'SDY', name: 'Sydney Pools', last: '3751', schedule: 'Tutup 13:35 WIB' },
  { code: 'MACAU', name: 'Toto Macau 4D', last: '6620', schedule: 'Live Setiap Jam' }
];

const SHIO_MAP = {
  KUDA: ['01','13','25','37','49','61','73','85','97'],
  ULAR: ['02','14','26','38','50','62','74','86','98'],
  NAGA: ['03','15','27','39','51','63','75','87','99'],
  KELINCI: ['04','16','28','40','52','64','76','88','00'],
  HARIMAU: ['05','17','29','41','53','65','77','89'],
  KERBAU: ['06','18','30','42','54','66','78','90'],
  TIKUS: ['07','19','31','43','55','67','79','91'],
  BABI: ['08','20','32','44','56','68','80','92'],
  ANJING: ['09','21','33','45','57','69','81','93'],
  AYAM: ['10','22','34','46','58','70','82','94'],
  MONYET: ['11','23','35','47','59','71','83','95'],
  KAMBING: ['12','24','36','48','60','72','84','96']
};

window.TogelEngine = {
  selectedMarket: 'SGP',
  betMode: '4D3D2D',

  init() {
    this.renderMarkets();
    this.bindEvents();
  },

  renderMarkets() {
    const grid = document.getElementById('marketsGrid');
    grid.innerHTML = MARKETS.map(m => `
      <div class="market-card ${m.code === this.selectedMarket ? 'active' : ''}" onclick="selectTogelMarket('${m.code}')">
        <h4>${m.name}</h4>
        <div class="m-num">${m.last}</div>
        <small>● ${m.schedule}</small>
      </div>
    `).join('');

    const hist = document.getElementById('marketHistoryList');
    hist.innerHTML = MARKETS.map(m => `
      <div class="mh-row">
        <span>${m.name} (${m.code})</span>
        <strong class="gold-text">${m.last}</strong>
      </div>
    `).join('');
  },

  getPermutations(str) {
    if (str.length <= 1) return [str];
    const res = new Set();
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const rem = str.slice(0, i) + str.slice(i + 1);
      for (const sub of this.getPermutations(rem)) res.add(ch + sub);
    }
    return Array.from(res);
  },

  bindEvents() {
    document.getElementById('togelMarketSelect').addEventListener('change', e => {
      window.selectTogelMarket(e.target.value);
    });

    document.querySelectorAll('.tsub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.sfx.click();
        document.querySelectorAll('.tsub-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.betMode = btn.dataset.ttype;

        const digitsGrp = document.getElementById('togelDigitsGroup');
        const shioGrp = document.getElementById('togelShioGroup');
        const numInput = document.getElementById('togelNumberInput');
        const numLabel = document.getElementById('togelNumberLabel');
        const infoBar = document.getElementById('togelDiscountInfo');

        digitsGrp.classList.toggle('hidden', this.betMode === 'SHIO');
        shioGrp.classList.toggle('hidden', this.betMode !== 'SHIO');

        if (this.betMode === '4D3D2D') {
          numInput.maxLength = 4;
          numLabel.textContent = 'Nomor Tebakan (2, 3, atau 4 Digit)';
          infoBar.innerHTML = '💡 Diskon Otomatis: <strong>4D (65%)</strong> • <strong>3D (59%)</strong> • <strong>2D (29%)</strong> | Hadiah: 4D x3000, 3D x400, 2D x70';
        } else if (this.betMode === 'BB') {
          numInput.maxLength = 4;
          numLabel.textContent = 'Nomor Bolak-Balik (2 - 4 Digit)';
          infoBar.innerHTML = '🔄 Sistem <strong>Bolak-Balik (BB)</strong> otomatis mengacak semua kombinasi posisi angka Anda! Diskon 20%.';
        } else if (this.betMode === 'COLOK') {
          numInput.maxLength = 2;
          numLabel.textContent = '1 Digit (Colok Bebas) atau 2 Digit (Colok Macau)';
          infoBar.innerHTML = '🎯 <strong>Colok Bebas (1 digit)</strong>: Hadiah 1.5x | <strong>Colok Macau (2 digit)</strong>: Hadiah 6x. Diskon 5-10%.';
        } else if (this.betMode === 'SHIO') {
          infoBar.innerHTML = '🐉 <strong>Tebak Shio</strong> mencocokkan 2 digit belakang keluaran dengan tabel Shio 2026. Hadiah 9.5x!';
        }
      });
    });

    document.getElementById('btnGenRandomTogel').addEventListener('click', () => {
      window.sfx.click();
      const len = this.betMode === 'COLOK' ? 2 : 4;
      let s = '';
      for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
      document.getElementById('togelNumberInput').value = s;
    });

    document.getElementById('btnPlaceTogelBet').addEventListener('click', async () => {
      const user = window.PortalDB.getCurrentUser();
      if (!user) { openModal('authModal'); return showToast('⚠️ Silakan login terlebih dahulu untuk memasang Togel!'); }

      const stake = Number(document.getElementById('togelStakeInput').value);
      const rawNum = document.getElementById('togelNumberInput').value.trim();
      const shioVal = document.getElementById('togelShioSelect').value;

      if (stake < 1000) return showToast('⚠️ Minimal taruhan 1.000 Koin.');

      // Calculate discount & net cost
      let discountRate = 0.05;
      let betLabel = '';

      if (this.betMode === '4D3D2D') {
        if (!/^\d{2,4}$/.test(rawNum)) return showToast('⚠️ Masukkan 2, 3, atau 4 digit angka!');
        discountRate = rawNum.length === 4 ? 0.65 : rawNum.length === 3 ? 0.59 : 0.29;
        betLabel = `${rawNum.length}D (${rawNum})`;
      } else if (this.betMode === 'BB') {
        if (!/^\d{2,4}$/.test(rawNum)) return showToast('⚠️ Masukkan 2 - 4 digit untuk Bolak-Balik!');
        discountRate = 0.20;
        betLabel = `Bolak-Balik (${rawNum})`;
      } else if (this.betMode === 'COLOK') {
        if (!/^\d{1,2}$/.test(rawNum)) return showToast('⚠️ Masukkan 1 atau 2 digit untuk Colok!');
        discountRate = rawNum.length === 1 ? 0.05 : 0.10;
        betLabel = rawNum.length === 1 ? `Colok Bebas (${rawNum})` : `Colok Macau (${rawNum})`;
      } else if (this.betMode === 'SHIO') {
        discountRate = 0.05;
        betLabel = `Shio ${shioVal}`;
      }

      const netPay = Math.floor(stake * (1 - discountRate));
      if (user.balance < netPay) return showToast(`⚠️ Saldo tidak cukup! Bayar bersih setelah diskon: ${fmtKoin(netPay)} Koin.`);

      window.PortalDB.updateActiveUser(u => { u.balance -= netPay; });
      syncAccountUI();

      // Animate Live Balls
      const balls = [0, 1, 2, 3].map(i => document.getElementById(`tBall${i}`));
      const spinTimer = setInterval(() => {
        balls.forEach(b => (b.textContent = Math.floor(Math.random() * 10)));
        window.sfx.spin();
      }, 65);

      await new Promise(r => setTimeout(r, 950));
      clearInterval(spinTimer);

      const drawn = [0, 1, 2, 3].map(() => Math.floor(Math.random() * 10)).join('');
      drawn.split('').forEach((d, idx) => (balls[idx].textContent = d));

      const mObj = MARKETS.find(m => m.code === this.selectedMarket);
      if (mObj) mObj.last = drawn;
      this.renderMarkets();

      // Evaluate Togel Win
      let winTotal = 0;
      if (this.betMode === '4D3D2D') {
        if (rawNum.length === 4 && drawn === rawNum) winTotal = stake * 3000;
        else if (rawNum.length === 3 && drawn.slice(1) === rawNum) winTotal = stake * 400;
        else if (rawNum.length === 2 && drawn.slice(2) === rawNum) winTotal = stake * 70;
      } else if (this.betMode === 'BB') {
        const perms = this.getPermutations(rawNum);
        const tail = drawn.slice(4 - rawNum.length);
        if (perms.includes(tail)) {
          const mult = rawNum.length === 4 ? 750 : rawNum.length === 3 ? 100 : 35;
          winTotal = stake * mult;
        }
      } else if (this.betMode === 'COLOK') {
        if (rawNum.length === 1) {
          const hits = drawn.split('').filter(d => d === rawNum).length;
          if (hits > 0) winTotal = stake * (1 + hits * 1.5);
        } else {
          const [d1, d2] = rawNum.split('');
          if (drawn.includes(d1) && drawn.includes(d2)) winTotal = stake * 6;
        }
      } else if (this.betMode === 'SHIO') {
        const last2 = drawn.slice(2);
        if (SHIO_MAP[shioVal]?.includes(last2)) winTotal = stake * 9.5;
      }

      const feedback = document.getElementById('togelOutcomeMsg');
      if (winTotal > 0) {
        window.PortalDB.updateActiveUser(u => { u.balance += winTotal; });
        syncAccountUI();
        window.sfx.jackpot();
        feedback.innerHTML = `🎉 <strong>JP PAUS! KELUARAN ${this.selectedMarket}: ${drawn}</strong> — ${betLabel} MENANG <strong>+${fmtKoin(winTotal)} Koin</strong>!`;
      } else {
        window.sfx.click();
        feedback.innerHTML = `🎱 <strong>KELUARAN ${this.selectedMarket}: ${drawn}</strong> — Taruhan ${betLabel} (Bayar diskon: ${fmtKoin(netPay)}) belum tembus.`;
      }

      window.PortalDB.addLog(
        `TOGEL ${this.selectedMarket}`,
        `${betLabel} • Keluar: ${drawn}`,
        netPay,
        winTotal > 0 ? `+${fmtKoin(winTotal)}` : '0'
      );
    });
  }
};

window.selectTogelMarket = function(code) {
  window.TogelEngine.selectedMarket = code;
  document.getElementById('togelMarketSelect').value = code;
  const m = MARKETS.find(x => x.code === code);
  if (m) {
    document.getElementById('selectedMarketBadge').textContent = `PASARAN: ${m.name.toUpperCase()}`;
    document.getElementById('liveDrawMarketName').textContent = m.name.toUpperCase();
  }
  window.TogelEngine.renderMarkets();
};

document.addEventListener('DOMContentLoaded', () => window.TogelEngine.init());
