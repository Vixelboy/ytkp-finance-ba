// lib/store.js - Supabase-based data store

import { supabase } from './supabaseClient';

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

export const DEFAULT_ADMIN_BACKUP_CODE = 'YTKP-ADMIN-2026';

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) { console.error('getUsers error:', error); return []; }
  return data;
}

export async function createUser(userData) {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      name: userData.name,
      pin: userData.pin,
      role: userData.role || 'user',
      school: userData.school || null,
    }])
    .select()
    .single();
  if (error) { console.error('createUser error:', error); return null; }
  return data;
}

export async function updateUser(id, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('updateUser error:', error); return null; }
  return data;
}

export async function deleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) console.error('deleteUser error:', error);
}

export async function login(name, pin) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('name', name)
    .eq('pin', pin)
    .single();
  if (error) return null;
  return data;
}

export async function loginWithBackupCode(code) {
  const settings = await getSettings();
  const backupCode = settings.adminBackupCode || DEFAULT_ADMIN_BACKUP_CODE;
  if (code === backupCode) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .single();
    return data || null;
  }
  return null;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getTransactions error:', error); return []; }
  // Normalize field names to match existing app logic
  return data.map(tx => ({
    ...tx,
    paymentType: tx.payment_type,
    proofImage: tx.bukti_url,
    createdAt: tx.created_at,
  }));
}

export async function saveTransaction(tx) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      school: tx.school,
      payment_type: tx.paymentType,
      amount: tx.amount,
      date: tx.date,
      month: tx.month,
      year: tx.year,
      note: tx.note || null,
      rekening: tx.rekening || null,
      bukti_url: tx.proofImage || null,
      submitted_by: tx.submittedBy || null,
    }])
    .select()
    .single();
  if (error) { console.error('saveTransaction error:', error); return null; }
  return { ...data, paymentType: data.payment_type, proofImage: data.bukti_url, createdAt: data.created_at };
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) console.error('deleteTransaction error:', error);
}

export async function updateTransactionProof(id, proofImage) {
  const { data, error } = await supabase
    .from('transactions')
    .update({ bukti_url: proofImage })
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('updateTransactionProof error:', error); return null; }
  return { ...data, paymentType: data.payment_type, proofImage: data.bukti_url };
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('getMessages error:', error); return []; }
  return data.map(m => ({ ...m, createdAt: m.created_at }));
}

export async function saveMessage(msg) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      type: msg.type,
      from: msg.from,
      from_name: msg.fromName,
      from_role: msg.fromRole,
      from_school: msg.fromSchool || null,
      to_school: msg.toSchool || null,
      content: msg.content,
      read: false,
    }])
    .select()
    .single();
  if (error) { console.error('saveMessage error:', error); return null; }
  return { ...data, createdAt: data.created_at, fromName: data.from_name, fromRole: data.from_role, fromSchool: data.from_school, toSchool: data.to_school };
}

export async function markMessagesRead(school) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .or(`to_school.eq.${school},from_school.eq.${school}`)
    .eq('type', 'direct');
  if (error) console.error('markMessagesRead error:', error);
}

// ─── Settings ─────────────────────────────────────────────────────────────────
// Settings tetap pakai localStorage karena bersifat per-device (theme, api key)

export function getSettings() {
  if (typeof window === 'undefined') return {
    theme: 'light',
    groqApiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
    adminBackupCode: DEFAULT_ADMIN_BACKUP_CODE,
  };
  const raw = localStorage.getItem('ytkp_settings');
  const settings = raw ? JSON.parse(raw) : {
    theme: 'light',
    groqApiKey: '',
    adminBackupCode: DEFAULT_ADMIN_BACKUP_CODE,
  };
  const envKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (envKey && (!settings.groqApiKey || settings.groqApiKey.length < 10)) {
    settings.groqApiKey = envKey;
    localStorage.setItem('ytkp_settings', JSON.stringify(settings));
  }
  return settings;
}

export function saveSettings(updates) {
  if (typeof window === 'undefined') return;
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
      .filter(tx => { const d = new Date(tx.date); return d.getMonth() === m && d.getFullYear() === y; })
      .reduce((a, t) => a + t.amount, 0);
    const schoolData = {};
    SCHOOLS.forEach(s => {
      schoolData[s] = txs
        .filter(tx => { const d = new Date(tx.date); return tx.school === s && d.getMonth() === m && d.getFullYear() === y; })
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
      .filter(tx => { const d = new Date(tx.date); return d >= weekStart && d <= weekEnd; })
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

  const systemPrompt = `Kamu adalah asisten keuangan cerdas untuk Yayasan Tri Karya Pembangunan (YTKP) Banjar Asri Cimaung. 
Kamu membantu bendahara dan admin dalam mengelola sistem keuangan ini.

### PROFIL SEKOLAH (BANJAR ASRI CIMAUNG):
- **Lokasi:** Jl. Gunung Puntang Km. 1, Desa Cimaung, Kec. Cimaung, Kab. Bandung.
- **SMP Banjar Asri:** Berdiri sejak 1988, Akreditasi A. Fokus pada pendidikan karakter dan standar nasional.
- **SMA Banjar Asri:** Akreditasi B. Menyediakan jenjang pendidikan menengah atas berkualitas.
- **SMK Banjar Asri:** Akreditasi B. Memiliki program keahlian:
  1. Teknik Audio Video (TAV)
  2. Teknik Komputer Jaringan (TKJ)
  3. Teknik Kendaraan Ringan (TKR)

### PANDUAN NAVIGASI WEB (DIMANA INI ITU):
- **Input Setoran:** Dashboard Utama (User) -> Tombol "Tambah Setoran" atau "Input Baru".
- **Bukti Transfer:** Download laporan di Admin atau di riwayat transaksi untuk melihat lampiran gambar.
- **Laporan Grafik:** Tab "Grafik" di halaman Admin (untuk melihat tren bulanan/tahunan).
- **Manajemen User:** Tab "User" di halaman Admin (untuk tambah/hapus bendahara sekolah).
- **Pesan/Chat:** Tab "Grup" atau "Pesan" untuk komunikasi antar bendahara & admin.
- **Cetak Laporan:** Tombol "Cetak" atau "Download PDF" di Tab Pengaturan Admin.

### INFORMASI PEMBAYARAN:
- **Rekening Yayasan:** BRI a.n. YTKP Banjar Asri, Nomor: 1234-5678-9012.
- **Jenis Dana:** SPP (Bulanan), Bangunan, Seragam, Kegiatan, DSP, dan Dana Lainnya.

${school ? `- Kamu sedang membantu bendahara ${SCHOOL_LABELS[school] || school}` : '- Kamu membantu Admin Yayasan'}
Jawab dalam Bahasa Indonesia yang ramah, profesional, dan informatif. Jika ditanya hal teknis web, arahkan ke menu yang sesuai di atas.`;

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
