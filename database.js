// Local Multi-User Database, Wallet & Admin Management
const DB_KEYS = {
  USERS: 'alexis_vip_users_v1',
  SESSION: 'alexis_vip_session_v1',
  RTP: 'alexis_vip_global_rtp_v1'
};

window.PortalDB = {
  init() {
    let users = this.getUsers();
    if (!users.length) {
      users = [
        {
          username: 'vip88',
          password: '123456',
          phone: '081234567890',
          vip: 'VIP 3',
          balance: 2500000,
          spins: 14,
          logs: [
            { time: '14:20:10', cat: 'DEPOSIT', desc: 'Bonus New Member VIP +50%', amount: 2500000, status: 'BERHASIL' }
          ]
        },
        {
          username: 'admin',
          password: 'admin123',
          phone: '080000000000',
          vip: 'ADMIN',
          balance: 99000000,
          spins: 0,
          logs: []
        }
      ];
      this.saveUsers(users);
    }
    if (!localStorage.getItem(DB_KEYS.RTP)) {
      localStorage.setItem(DB_KEYS.RTP, '65');
    }
  },

  getUsers() {
    return JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  },

  saveUsers(users) {
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  },

  getGlobalRtp() {
    return Number(localStorage.getItem(DB_KEYS.RTP) || 65);
  },

  setGlobalRtp(val) {
    localStorage.setItem(DB_KEYS.RTP, String(val));
  },

  getCurrentUser() {
    const uname = localStorage.getItem(DB_KEYS.SESSION);
    if (!uname) return null;
    return this.getUsers().find(u => u.username === uname) || null;
  },

  login(username, password) {
    const user = this.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) return { ok: false, msg: 'Username atau password salah!' };
    localStorage.setItem(DB_KEYS.SESSION, user.username);
    return { ok: true, user };
  },

  register(username, password, phone) {
    const users = this.getUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, msg: 'Username sudah digunakan!' };
    }
    const newUser = {
      username,
      password,
      phone,
      vip: 'VIP 1',
      balance: 500000,
      spins: 0,
      logs: [
        {
          time: new Date().toLocaleTimeString('id-ID'),
          cat: 'BONUS DAFTAR',
          desc: 'Saldo Awal Member Baru VIP',
          amount: 500000,
          status: '+500.000'
        }
      ]
    };
    users.push(newUser);
    this.saveUsers(users);
    localStorage.setItem(DB_KEYS.SESSION, newUser.username);
    return { ok: true, user: newUser };
  },

  logout() {
    localStorage.removeItem(DB_KEYS.SESSION);
  },

  updateActiveUser(mutatorFn) {
    const active = this.getCurrentUser();
    if (!active) return null;
    const users = this.getUsers();
    const idx = users.findIndex(u => u.username === active.username);
    if (idx === -1) return null;
    mutatorFn(users[idx]);
    this.saveUsers(users);
    return users[idx];
  },

  addLog(cat, desc, amount, status) {
    const time = new Date().toLocaleTimeString('id-ID');
    this.updateActiveUser(u => {
      u.logs.unshift({ time, cat, desc, amount, status });
      if (u.logs.length > 60) u.logs.pop();
    });
  }
};

function fmtKoin(n) {
  return Math.floor(n).toLocaleString('id-ID');
}

function showToast(msg) {
  const box = document.getElementById('toastBox');
  box.textContent = msg;
  box.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => box.classList.add('hidden'), 3200);
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function switchAuthTab(mode) {
  document.getElementById('tabLoginBtn').classList.toggle('active', mode === 'login');
  document.getElementById('tabRegBtn').classList.toggle('active', mode === 'register');
  document.getElementById('loginForm').classList.toggle('hidden', mode !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', mode !== 'register');
}

function switchSection(sectionId) {
  window.sfx.click();
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === sectionId);
  });
  if (sectionId === 'historySection') renderUserHistory();
}

function syncAccountUI() {
  const user = window.PortalDB.getCurrentUser();
  const guestBox = document.getElementById('guestBox');
  const userBox = document.getElementById('userBox');

  if (user) {
    guestBox.classList.add('hidden');
    userBox.classList.remove('hidden');
    document.getElementById('displayUsername').textContent = user.username;
    document.getElementById('userVipBadge').textContent = user.vip;
    document.getElementById('displayBalance').textContent = fmtKoin(user.balance);
  } else {
    guestBox.classList.remove('hidden');
    userBox.classList.add('hidden');
  }
}

function renderUserHistory() {
  const tbody = document.getElementById('fullHistoryBody');
  const user = window.PortalDB.getCurrentUser();
  if (!user || !user.logs.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="center-muted">Silakan login atau mulai bermain untuk melihat riwayat.</td></tr>';
    return;
  }
  tbody.innerHTML = user.logs.map(l => `
    <tr>
      <td>${l.time}</td>
      <td><strong>${l.cat}</strong></td>
      <td>${l.desc}</td>
      <td>${fmtKoin(l.amount)}</td>
      <td class="gold-text">${l.status}</td>
    </tr>
  `).join('');
}

function renderAdminTable() {
  const users = window.PortalDB.getUsers();
  document.getElementById('adminTotalUsers').textContent = users.length;
  document.getElementById('adminRtpInput').value = window.PortalDB.getGlobalRtp();
  const tbody = document.getElementById('adminUsersTable');
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.vip}</td>
      <td class="gold-text">${fmtKoin(u.balance)}</td>
      <td>${u.spins}x</td>
      <td>
        <button class="btn-gold small" onclick="adminInjectCoins('${u.username}', 1000000)">+1 Juta Koin</button>
      </td>
    </tr>
  `).join('');
}

window.adminInjectCoins = function(username, amount) {
  const users = window.PortalDB.getUsers();
  const target = users.find(u => u.username === username);
  if (target) {
    target.balance += amount;
    window.PortalDB.saveUsers(users);
    renderAdminTable();
    syncAccountUI();
    showToast(`✅ Berhasil kirim +${fmtKoin(amount)} koin ke ${username}`);
  }
};

window.setDepAmt = function(val) {
  document.getElementById('depAmount').value = val;
};

document.addEventListener('DOMContentLoaded', () => {
  window.PortalDB.init();
  syncAccountUI();

  // Clock
  setInterval(() => {
    const now = new Date();
    document.getElementById('clockDisplay').textContent = now.toLocaleTimeString('id-ID') + ' WIB';
  }, 1000);

  // Nav tabs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  // Auth modals
  document.getElementById('btnOpenLogin').addEventListener('click', () => { switchAuthTab('login'); openModal('authModal'); });
  document.getElementById('btnOpenRegister').addEventListener('click', () => { switchAuthTab('register'); openModal('authModal'); });
  document.getElementById('btnQuickDeposit').addEventListener('click', () => switchSection('walletSection'));

  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const res = window.PortalDB.login(
      document.getElementById('loginUsername').value.trim(),
      document.getElementById('loginPassword').value.trim()
    );
    if (!res.ok) return showToast('⚠️ ' + res.msg);
    window.sfx.win();
    closeModal('authModal');
    syncAccountUI();
    showToast(`👑 Selamat datang kembali, ${res.user.username}!`);
  });

  document.getElementById('registerForm').addEventListener('submit', e => {
    e.preventDefault();
    const res = window.PortalDB.register(
      document.getElementById('regUsername').value.trim(),
      document.getElementById('regPassword').value.trim(),
      document.getElementById('regPhone').value.trim()
    );
    if (!res.ok) return showToast('⚠️ ' + res.msg);
    window.sfx.jackpot();
    closeModal('authModal');
    syncAccountUI();
    showToast(`🎉 Akun ${res.user.username} berhasil dibuat! Bonus +500.000 Koin aktif.`);
  });

  document.getElementById('btnLogout').addEventListener('click', () => {
    window.PortalDB.logout();
    syncAccountUI();
    showToast('Anda telah keluar dari akun.');
  });

  // Admin panel
  document.getElementById('btnAdminPanel').addEventListener('click', () => {
    renderAdminTable();
    openModal('adminModal');
  });

  document.getElementById('btnSaveRtp').addEventListener('click', () => {
    const val = Number(document.getElementById('adminRtpInput').value);
    window.PortalDB.setGlobalRtp(val);
    showToast(`🛡️ Global Winrate/RTP server diubah menjadi ${val}%`);
  });

  document.getElementById('btnPromoModal').addEventListener('click', () => {
    showToast('🎁 Promo Aktif: Bonus New Member +50% & Cashback Kekalahan Mingguan 10%!');
  });

  document.getElementById('btnSoundToggle').addEventListener('click', e => {
    window.sfx.enabled = !window.sfx.enabled;
    e.currentTarget.textContent = window.sfx.enabled ? '🔊 AUDIO: ON' : '🔇 AUDIO: OFF';
  });

  // Deposit & Withdraw Forms
  document.getElementById('depositForm').addEventListener('submit', e => {
    e.preventDefault();
    const user = window.PortalDB.getCurrentUser();
    if (!user) { openModal('authModal'); return showToast('⚠️ Silakan login terlebih dahulu untuk Deposit.'); }
    const amt = Number(document.getElementById('depAmount').value);
    const bonusRate = Number(document.getElementById('depPromo').value);
    const method = document.getElementById('depMethod').value;
    const totalAdd = amt + Math.floor(amt * bonusRate);

    window.PortalDB.updateActiveUser(u => { u.balance += totalAdd; });
    window.PortalDB.addLog('DEPOSIT', `${method} (Bonus ${bonusRate * 100}%)`, totalAdd, 'SUKSES');
    window.sfx.win();
    syncAccountUI();
    showToast(`💰 Deposit +${fmtKoin(totalAdd)} Koin berhasil masuk ke saldo!`);
  });

  document.getElementById('withdrawForm').addEventListener('submit', e => {
    e.preventDefault();
    const user = window.PortalDB.getCurrentUser();
    if (!user) { openModal('authModal'); return showToast('⚠️ Silakan login terlebih dahulu.'); }
    const amt = Number(document.getElementById('wdAmount').value);
    const bank = document.getElementById('wdBank').value.trim();
    if (amt > user.balance) return showToast('⚠️ Saldo koin tidak mencukupi untuk penarikan!');

    window.PortalDB.updateActiveUser(u => { u.balance -= amt; });
    window.PortalDB.addLog('WITHDRAW', `Transfer ke ${bank}`, amt, 'DIPROSES');
    window.sfx.click();
    syncAccountUI();
    showToast(`💸 Pengajuan Withdraw ${fmtKoin(amt)} Koin ke ${bank} berhasil!`);
  });

  document.getElementById('btnResetUserLogs').addEventListener('click', () => {
    window.PortalDB.updateActiveUser(u => { u.logs = []; });
    renderUserHistory();
    showToast('Riwayat aktivitas dibersihkan.');
  });

  // Live Jackpot Ticker
  let jp = 884920500;
  setInterval(() => {
    jp += Math.floor(Math.random() * 850);
    document.getElementById('topJackpot').textContent = fmtKoin(jp);
    document.getElementById('heroJackpot').textContent = fmtKoin(jp);
  }, 1800);
});
