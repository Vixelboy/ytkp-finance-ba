// lib/store.js - localStorage-based data store

export const SCHOOLS = ['SMP', 'SMA', 'SMK'];

export const PAYMENT_TYPES = [
  { id: 'spp', label: 'SPP (Iuran Bulanan)', icon: '📅' },
  { id: 'bangunan', label: 'Dana Bangunan', icon: '🏗️' },
  { id: 'seragam', label: 'Seragam', icon: '👔' },
  { id: 'kegiatan', label: 'Dana Kegiatan', icon: '🎯' },
  { id: 'dsp', label: 'Dana Sumbangan Pendidikan', icon: '📚' },
  { id: 'lainnya', label: 'Dana Lainnya', icon: '💼' },
];

export const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

// Default users
const DEFAULT_USERS = [
  { id: 'admin', name: 'Admin Yayasan', pin: '1234', role: 'admin' },
  { id: 'smp', name: 'Bendahara SMP', pin: '1111', role: 'user', school: 'SMP' },
  { id: 'sma', name: 'Bendahara SMA', pin: '2222', role: 'user', school: 'SMA' },
  { id: 'smk', name: 'Bendahara SMK', pin: '3333', role: 'user', school: 'SMK' },
];

function initStore() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('ytkp_users')) {
    localStorage.setItem('ytkp_users', JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem('ytkp_transactions')) {
    localStorage.setItem('ytkp_transactions', JSON.stringify([]));
  }
}

export function getUsers() {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  initStore();
  return JSON.parse(localStorage.getItem('ytkp_users') || '[]');
}

export function getTransactions() {
  if (typeof window === 'undefined') return [];
  initStore();
  return JSON.parse(localStorage.getItem('ytkp_transactions') || '[]');
}

export function saveTransaction(tx) {
  if (typeof window === 'undefined') return;
  initStore();
  const txs = getTransactions();
  txs.unshift({ ...tx, id: Date.now().toString(), createdAt: new Date().toISOString() });
  localStorage.setItem('ytkp_transactions', JSON.stringify(txs));
  return txs[0];
}

export function login(name, pin) {
  const users = getUsers();
  return users.find(u =>
    u.name.toLowerCase() === name.toLowerCase() && u.pin === pin
  ) || null;
}

// Filter helpers
export function filterTransactions(txs, filter) {
  const now = new Date();
  return txs.filter(tx => {
    const d = new Date(tx.date);
    if (filter.school && tx.school !== filter.school) return false;
    if (filter.type && tx.paymentType !== filter.type) return false;
    if (filter.period === 'today') {
      return d.toDateString() === now.toDateString();
    }
    if (filter.period === 'week') {
      const weekAgo = new Date(now - 7 * 86400000);
      return d >= weekAgo;
    }
    if (filter.period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (filter.period === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    if (filter.period === 'custom' && filter.from && filter.to) {
      const from = new Date(filter.from);
      const to = new Date(filter.to);
      to.setHours(23,59,59);
      return d >= from && d <= to;
    }
    if (filter.period === 'specificMonth') {
      return d.getMonth() === parseInt(filter.month) && d.getFullYear() === parseInt(filter.year);
    }
    return true;
  });
}

export function getSummary(txs) {
  const summary = { total: 0 };
  SCHOOLS.forEach(s => summary[s] = 0);
  txs.forEach(tx => {
    summary.total += tx.amount;
    summary[tx.school] = (summary[tx.school] || 0) + tx.amount;
  });
  return summary;
}

// Generate SPP notifications
export function getSPPNotifications(txs) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const notifications = [];

  SCHOOLS.forEach(school => {
    // Check last 3 months including current
    for (let i = 0; i < 3; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      if (month < 0) { month += 12; year -= 1; }

      const hasSPP = txs.some(tx => {
        const d = new Date(tx.date);
        return tx.school === school &&
          tx.paymentType === 'spp' &&
          d.getMonth() === month &&
          d.getFullYear() === year;
      });

      if (!hasSPP) {
        const isPastMonth = i > 0 || now.getDate() > 10;
        notifications.push({
          school,
          month: MONTHS[month],
          year,
          severity: i === 0 ? (now.getDate() > 20 ? 'warning' : 'info') : 'danger',
          message: `${school} belum setor SPP ${MONTHS[month]} ${year}`,
        });
      }
    }
  });

  return notifications;
}
