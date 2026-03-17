// lib/store.js - localStorage-based data store

export const SCHOOLS = ['SMP', 'SMA', 'SMK'];

export const SCHOOL_LABELS = {
  SMP: 'SMP Banjar Asri',
  SMA: 'SMA Banjar Asri',
  SMK: 'SMK Banjar Asri',
};

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

// Admin backup code (can be changed via settings)
export const DEFAULT_ADMIN_BACKUP_CODE = 'YTKP-ADMIN-2026';

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
  if (!localStorage.getItem('ytkp_messages')) {
    localStorage.setItem('ytkp_messages', JSON.stringify([]));
  }
  if (!localStorage.getItem('ytkp_settings')) {
    localStorage.setItem('ytkp_settings', JSON.stringify({
      theme: 'light',
      groqApiKey: '',
      adminBackupCode: DEFAULT_ADMIN_BACKUP_CODE,
    }));
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function getUsers() {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  initStore();
  return JSON.parse(localStorage.getItem('ytkp_users') || '[]');
}

export function createUser(data) {
  if (typeof window === 'undefined') return null;
  initStore();
  const users = getUsers();
  const newUser = {
    id: Date.now().toString(),
    name: data.name,
    pin: data.pin,
    role: data.role || 'user',
    school: data.school || null,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  localStorage.setItem('ytkp_users', JSON.stringify(users));
  return newUser;
}

export function updateUser(id, updates) {
  if (typeof window === 'undefined') return;
  initStore();
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    localStorage.setItem('ytkp_users', JSON.stringify(users));
    return users[idx];
  }
  return null;
}

export function deleteUser(id) {
  if (typeof window === 'undefined') return;
  initStore();
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem('ytkp_users', JSON.stringify(users));
}

export function login(name, pin) {
  const users = getUsers();
  return users.find(u =>
    u.name.toLowerCase() === name.toLowerCase() && u.pin === pin
  ) || null;
}

export function loginWithBackupCode(code) {
  const settings = getSettings();
  const backupCode = settings.adminBackupCode || DEFAULT_ADMIN_BACKUP_CODE;
  if (code === backupCode) {
    const users = getUsers();
    return users.find(u => u.role === 'admin') || null;
  }
  return null;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function getTransactions() {
  if (typeof window === 'undefined') return [];
  initStore();
  return JSON.parse(localStorage.getItem('ytkp_transactions') || '[]');
}

export function saveTransaction(tx) {
  if (typeof window === 'undefined') return;
  initStore();
  const txs = getTransactions();
  const newTx = {
    ...tx,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    proofImage: tx.proofImage || null,
  };
  txs.unshift(newTx);
  localStorage.setItem('ytkp_transactions', JSON.stringify(txs));
  return txs[0];
}

export function deleteTransaction(id) {
  if (typeof window === 'undefined') return;
  initStore();
  const txs = getTransactions().filter(t => t.id !== id);
  localStorage.setItem('ytkp_transactions', JSON.stringify(txs));
}

export function updateTransactionProof(id, proofImage) {
  if (typeof window === 'undefined') return;
  initStore();
  const txs = getTransactions();
  const idx = txs.findIndex(t => t.id === id);
  if (idx !== -1) {
    txs[idx].proofImage = proofImage;
    localStorage.setItem('ytkp_transactions', JSON.stringify(txs));
    return txs[idx];
  }
  return null;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function getMessages() {
  if (typeof window === 'undefined') return [];
  initStore();
  return JSON.parse(localStorage.getItem('ytkp_messages') || '[]');
}

/**
 * Save a message.
 * type: 'direct' (user ↔ admin) or 'group' (all users)
 * For direct: { type:'direct', from, fromName, fromRole, toSchool, content, createdAt }
 * For group:  { type:'group', from, fromName, fromRole, fromSchool, content, createdAt }
 */
export function saveMessage(msg) {
  if (typeof window === 'undefined') return;
  initStore();
  const msgs = getMessages();
  const newMsg = {
    ...msg,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  msgs.push(newMsg);
  localStorage.setItem('ytkp_messages', JSON.stringify(msgs));
  return newMsg;
}

export function markMessagesRead(school) {
  if (typeof window === 'undefined') return;
  initStore();
  const msgs = getMessages();
  const updated = msgs.map(m => {
    if (m.type === 'direct' && (m.toSchool === school || m.fromSchool === school)) {
      return { ...m, read: true };
    }
    return m;
  });
  localStorage.setItem('ytkp_messages', JSON.stringify(updated));
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSettings() {
  if (typeof window === 'undefined') return { theme: 'light', groqApiKey: '', adminBackupCode: DEFAULT_ADMIN_BACKUP_CODE };
  initStore();
  return JSON.parse(localStorage.getItem('ytkp_settings') || '{}');
}

export function saveSettings(updates) {
  if (typeof window === 'undefined') return;
  initStore();
  const settings = getSettings();
  const newSettings = { ...settings, ...updates };
  localStorage.setItem('ytkp_settings', JSON.stringify(newSettings));
  return newSettings;
}

// ─── Filter Helpers ───────────────────────────────────────────────────────────

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

// ─── Chart Data Helpers ───────────────────────────────────────────────────────

export function getMonthlyChartData(txs, months = 12) {
  const now = new Date();
  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    let m = now.getMonth() - i;
    let y = now.getFullYear();
    while (m < 0) { m += 12; y--; }
    const label = `${MONTHS[m].slice(0,3)} ${y}`;
    const total = txs
      .filter(tx => {
        const d = new Date(tx.date);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((a, t) => a + t.amount, 0);
    const schoolData = {};
    SCHOOLS.forEach(s => {
      schoolData[s] = txs
        .filter(tx => {
          const d = new Date(tx.date);
          return tx.school === s && d.getMonth() === m && d.getFullYear() === y;
        })
        .reduce((a, t) => a + t.amount, 0);
    });
    data.push({ label, total, ...schoolData });
  }
  return data;
}

export function getWeeklyChartData(txs, weeks = 8) {
  const now = new Date();
  const data = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7 - now.getDay());
    weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23,59,59);
    const label = `${weekStart.getDate()}/${weekStart.getMonth()+1}`;
    const total = txs
      .filter(tx => {
        const d = new Date(tx.date);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((a, t) => a + t.amount, 0);
    data.push({ label, total });
  }
  return data;
}

export function getYearlyChartData(txs) {
  const yearMap = {};
  txs.forEach(tx => {
    const y = new Date(tx.date).getFullYear();
    yearMap[y] = (yearMap[y] || 0) + tx.amount;
  });
  return Object.entries(yearMap)
    .sort(([a],[b]) => a-b)
    .map(([year, total]) => ({ label: year, total }));
}

// ─── SPP Notifications ────────────────────────────────────────────────────────

export function getSPPNotifications(txs) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const notifications = [];

  SCHOOLS.forEach(school => {
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
        notifications.push({
          school,
          month: MONTHS[month],
          year,
          severity: i === 0 ? (now.getDate() > 20 ? 'warning' : 'info') : 'danger',
          message: `${SCHOOL_LABELS[school]} belum setor SPP ${MONTHS[month]} ${year}`,
        });
      }
    }
  });

  return notifications;
}

// ─── AI (Groq) ────────────────────────────────────────────────────────────────

export async function askGroqAI(question, school) {
  const settings = getSettings();
  const apiKey = settings.groqApiKey;
  if (!apiKey) return { error: 'API Key Groq belum diatur. Silakan atur di Pengaturan.' };

  const systemPrompt = `Kamu adalah asisten keuangan yayasan pendidikan YTKP Banjar Asri. 
Kamu membantu bendahara dan admin dalam hal:
- Informasi cara transfer/setor dana ke rekening yayasan
- Rekening tujuan yayasan: BRI a.n. YTKP Banjar Asri No. 1234-5678-9012
- Jenis-jenis setoran: SPP (iuran bulanan), Dana Bangunan, Seragam, Dana Kegiatan, Dana Sumbangan Pendidikan, Dana Lainnya
- Panduan penggunaan sistem keuangan YTKP
- Informasi umum tentang keuangan sekolah
${school ? `- Kamu sedang membantu bendahara dari ${SCHOOL_LABELS[school] || school}` : '- Kamu membantu admin yayasan'}
Jawab dalam Bahasa Indonesia yang ramah dan singkat. Jika tidak tahu jawaban spesifik, berikan panduan umum yang berguna.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      return { error: err.error?.message || 'Gagal menghubungi AI.' };
    }
    const data = await res.json();
    return { answer: data.choices?.[0]?.message?.content || 'Tidak ada respons.' };
  } catch (e) {
    return { error: 'Koneksi gagal. Periksa internet Anda.' };
  }
}
