import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  PAYMENT_TYPES, MONTHS, SCHOOL_LABELS,
  saveTransaction, getTransactions,
  saveMessage, getMessages,
  getSettings, saveSettings,
  askGroqAI,
} from '../lib/store';
import { formatRupiah, formatDateTime } from '../lib/format';

const SCHOOL_COLORS = { SMP: '#2563a8', SMA: '#16a34a', SMK: '#d97706' };

export default function UserPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('form');
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('form');
  const [theme, setTheme] = useState('light');

  // Form
  const [paymentType, setPaymentType] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(new Date().getMonth().toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rekening, setRekening] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [lastTx, setLastTx] = useState(null);

  // Messages
  const [msgText, setMsgText] = useState('');
  const [messages, setMessages] = useState([]);
  const [groupMsgText, setGroupMsgText] = useState('');
  const [groupMessages, setGroupMessages] = useState([]);
  const msgEndRef = useRef(null);

  // AI
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiHistory, setAiHistory] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Modal
  const [proofModal, setProofModal] = useState(null);

  useEffect(() => {
    const session = sessionStorage.getItem('ytkp_session');
    if (!session) { router.replace('/'); return; }
    const u = JSON.parse(session);
    if (u.role === 'admin') { router.replace('/admin'); return; }
    setUser(u);
    const s = getSettings();
    setTheme(s.theme || 'light');
    loadAll(u.school);
  }, []);

  function loadAll(school) {
    const txs = getTransactions().filter(t => t.school === school);
    setHistory(txs);
    const msgs = getMessages();
    setMessages(msgs.filter(m => m.type === 'direct' && (m.fromSchool === school || m.toSchool === school)));
    setGroupMessages(msgs.filter(m => m.type === 'group'));
  }

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, groupMessages]);

  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    saveSettings({ theme: newTheme });
  }

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Ukuran gambar maks 2MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => setProofImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  function validate() {
    const e = {};
    if (!paymentType) e.paymentType = 'Pilih jenis setoran';
    if (!amount || isNaN(amount.replace(/\./g, '')) || parseInt(amount.replace(/\./g, '')) <= 0)
      e.amount = 'Nominal tidak valid';
    if (!date) e.date = 'Pilih tanggal';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handlePreview(e) { e.preventDefault(); if (validate()) setStep('confirm'); }

  function handleSubmit() {
    const numAmount = parseInt(amount.replace(/\./g, ''));
    const tx = saveTransaction({
      school: user.school,
      paymentType,
      amount: numAmount,
      month: parseInt(month),
      year: parseInt(year),
      date,
      note: note.trim(),
      rekening: rekening.trim(),
      submittedBy: user.name,
      proofImage: proofImage || null,
    });
    setLastTx(tx);
    setStep('success');
    setPaymentType(''); setAmount(''); setNote(''); setRekening(''); setProofImage(null);
    setMonth(new Date().getMonth().toString());
    setYear(new Date().getFullYear().toString());
    setDate(new Date().toISOString().split('T')[0]);
    loadAll(user.school);
  }

  function handleSendMsg() {
    if (!msgText.trim()) return;
    saveMessage({ type: 'direct', from: user.id, fromName: user.name, fromRole: 'user', fromSchool: user.school, toSchool: user.school, content: msgText.trim() });
    setMsgText('');
    loadAll(user.school);
  }

  function handleSendGroup() {
    if (!groupMsgText.trim()) return;
    saveMessage({ type: 'group', from: user.id, fromName: user.name, fromRole: 'user', fromSchool: user.school, content: groupMsgText.trim() });
    setGroupMsgText('');
    loadAll(user.school);
  }

  async function handleAsk() {
    if (!aiInput.trim() || aiLoading) return;
    const q = aiInput.trim();
    setAiHistory(h => [...h, { role: 'user', content: q }]);
    setAiInput('');
    setAiLoading(true);
    const res = await askGroqAI(q, user?.school);
    setAiLoading(false);
    if (res.error) setAiHistory(h => [...h, { role: 'ai', content: '⚠️ ' + res.error }]);
    else setAiHistory(h => [...h, { role: 'ai', content: res.answer }]);
  }

  function handlePrint() {
    window.print();
  }

  function handleLogout() { sessionStorage.removeItem('ytkp_session'); router.push('/'); }

  function formatInput(val) {
    const num = val.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  const selectedType = PAYMENT_TYPES.find(t => t.id === paymentType);
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Memuat...</div>;

  const schoolColor = SCHOOL_COLORS[user.school] || '#1a3a5c';
  const schoolLabel = SCHOOL_LABELS[user.school] || user.school;
  const isDark = theme === 'dark';

  const T = {
    bg: isDark ? '#111827' : '#f0f4f8',
    card: isDark ? '#1f2937' : '#ffffff',
    text: isDark ? '#f3f4f6' : '#1a2433',
    sub: isDark ? '#9ca3af' : '#5a6a7e',
    border: isDark ? '#374151' : '#e8edf2',
    input: isDark ? '#374151' : '#f9fafb',
    inputBorder: isDark ? '#4b5563' : '#e2e8f0',
    header: isDark ? '#111827' : '#ffffff',
  };

  const TABS = [
    { id: 'form', label: '✏️ Setor' },
    { id: 'history', label: '📋 Riwayat' },
    { id: 'pesan', label: '💬 Pesan' },
    { id: 'grup', label: '👥 Grup' },
    { id: 'settings', label: '⚙️ Lainnya' },
  ];

  return (
    <>
      <Head>
        <title>Input Setoran — {schoolLabel}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div style={{ minHeight: '100vh', background: T.bg, transition: 'background 0.3s' }}>
        {/* Header */}
        <header className="no-print" style={{ background: T.header, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'inline-block', background: schoolColor, color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                {schoolLabel}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: T.text, marginTop: '2px' }}>{user.name}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={toggleTheme} title="Ganti Tema" style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', color: T.text }}>{isDark ? '☀️' : '🌙'}</button>
              <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.sub, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Keluar</button>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', maxWidth: '600px', margin: '0 auto', padding: '0 8px', overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'form') setStep('form'); }}
                style={{ flex: '0 0 auto', background: 'none', border: 'none', color: activeTab === tab.id ? schoolColor : T.sub, padding: '8px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', borderBottom: activeTab === tab.id ? `2px solid ${schoolColor}` : '2px solid transparent', whiteSpace: 'nowrap' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>

          {/* ===== FORM TAB ===== */}
          {activeTab === 'form' && (
            <>
              {step === 'success' && (
                <div style={{ background: T.card, borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '56px', marginBottom: '12px' }}>✅</div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: T.text, marginBottom: '6px' }}>Setoran Berhasil Dicatat!</h2>
                  <p style={{ fontSize: '13px', color: T.sub, marginBottom: '20px' }}>Data telah tersimpan ke sistem yayasan</p>
                  {lastTx && (
                    <div style={{ background: isDark ? '#064e3b' : '#f0fdf4', border: `1px solid ${isDark ? '#065f46' : '#bbf7d0'}`, borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '16px' }}>
                      {[
                        ['Sekolah', schoolLabel],
                        ['Jenis', PAYMENT_TYPES.find(t => t.id === lastTx.paymentType)?.label],
                        ['Nominal', formatRupiah(lastTx.amount)],
                        ['Periode', `${MONTHS[lastTx.month]} ${lastTx.year}`],
                        ['Waktu', formatDateTime(lastTx.createdAt)],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: `1px solid ${T.border}`, color: T.sub }}>
                          <span>{k}</span><strong style={{ color: T.text }}>{v}</strong>
                        </div>
                      ))}
                      {lastTx.proofImage && (
                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                          <img src={lastTx.proofImage} alt="Bukti TF" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', cursor: 'pointer' }} onClick={() => setProofModal(lastTx.proofImage)} />
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handlePrint} style={{ flex: 1, background: isDark ? '#374151' : '#f0f4f8', border: `1px solid ${T.border}`, color: T.text, borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>🖨️ Cetak / PDF</button>
                    <button onClick={() => setStep('form')} style={{ flex: 1, background: `linear-gradient(135deg, ${schoolColor}, ${schoolColor}cc)`, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ Input Baru</button>
                  </div>
                </div>
              )}

              {step === 'confirm' && (
                <div style={{ background: T.card, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${T.border}` }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: T.text, marginBottom: '4px' }}>Konfirmasi Setoran</h2>
                  <p style={{ fontSize: '13px', color: T.sub, marginBottom: '16px' }}>Pastikan data berikut sudah benar.</p>
                  <div style={{ background: isDark ? '#111827' : '#f8fafc', border: `1px solid ${T.border}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                    {[
                      ['Sekolah', schoolLabel],
                      ['Jenis', `${selectedType?.icon} ${selectedType?.label}`],
                      ['Nominal', `Rp ${amount}`],
                      ['Periode', `${MONTHS[parseInt(month)]} ${year}`],
                      ['Tanggal Transfer', new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })],
                      ...(rekening ? [['No. Rek / Ref', rekening]] : []),
                      ...(note ? [['Keterangan', note]] : []),
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: `1px solid ${T.border}`, color: T.sub }}>
                        <span>{k}</span><strong style={{ color: T.text, textAlign: 'right', maxWidth: '60%' }}>{v}</strong>
                      </div>
                    ))}
                    {proofImage && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '12px', color: T.sub, marginBottom: '6px' }}>📎 Bukti Transfer</div>
                        <img src={proofImage} alt="Bukti" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setStep('form')} style={{ flex: 1, background: isDark ? '#374151' : '#f0f4f8', border: `1px solid ${T.border}`, color: T.text, borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>← Kembali</button>
                    <button onClick={handleSubmit} style={{ flex: 2, background: `linear-gradient(135deg, ${schoolColor}, ${schoolColor}cc)`, color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Simpan Setoran ✓</button>
                  </div>
                </div>
              )}

              {step === 'form' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: T.card, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${T.border}` }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: T.text, marginBottom: '4px' }}>Input Setoran Dana</h2>
                    <p style={{ fontSize: '13px', color: T.sub, marginBottom: '20px' }}>Catat setoran dari <strong>{schoolLabel}</strong> ke rekening yayasan.</p>
                    <form onSubmit={handlePreview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Payment Type */}
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '8px' }}>Jenis Setoran <span style={{ color: '#dc2626' }}>*</span></label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {PAYMENT_TYPES.map(t => (
                            <button key={t.id} type="button" onClick={() => { setPaymentType(t.id); setErrors({ ...errors, paymentType: '' }); }}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 4px', border: `${paymentType === t.id ? '2px' : '1.5px'} solid ${paymentType === t.id ? schoolColor : T.inputBorder}`, borderRadius: '10px', background: paymentType === t.id ? schoolColor + '18' : T.input, cursor: 'pointer', color: T.text, minHeight: '68px' }}>
                              <span style={{ fontSize: '20px' }}>{t.icon}</span>
                              <span style={{ fontSize: '10px', textAlign: 'center', lineHeight: 1.2, fontWeight: paymentType === t.id ? 700 : 400 }}>{t.label}</span>
                            </button>
                          ))}
                        </div>
                        {errors.paymentType && <span style={{ fontSize: '12px', color: '#dc2626' }}>{errors.paymentType}</span>}
                      </div>

                      {/* Amount */}
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Nominal (Rp) <span style={{ color: '#dc2626' }}>*</span></label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: T.sub, fontSize: '14px', fontWeight: '600' }}>Rp</span>
                          <input type="text" inputMode="numeric" value={amount} onChange={e => { setAmount(formatInput(e.target.value)); setErrors({ ...errors, amount: '' }); }} placeholder="0"
                            style={{ border: `1.5px solid ${errors.amount ? '#dc2626' : T.inputBorder}`, borderRadius: '10px', padding: '11px 14px 11px 44px', fontSize: '15px', color: T.text, background: T.input, width: '100%', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        {errors.amount && <span style={{ fontSize: '12px', color: '#dc2626' }}>{errors.amount}</span>}
                        {amount && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>{formatRupiah(parseInt(amount.replace(/\./g, '')))}</span>}
                      </div>

                      {/* Period */}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Bulan</label>
                          <select value={month} onChange={e => setMonth(e.target.value)} style={{ border: `1.5px solid ${T.inputBorder}`, borderRadius: '10px', padding: '11px 14px', fontSize: '14px', color: T.text, background: T.input, width: '100%', outline: 'none' }}>
                            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Tahun</label>
                          <select value={year} onChange={e => setYear(e.target.value)} style={{ border: `1.5px solid ${T.inputBorder}`, borderRadius: '10px', padding: '11px 14px', fontSize: '14px', color: T.text, background: T.input, width: '100%', outline: 'none' }}>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Date */}
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Tanggal Transfer <span style={{ color: '#dc2626' }}>*</span></label>
                        <input type="date" value={date} onChange={e => { setDate(e.target.value); setErrors({ ...errors, date: '' }); }}
                          style={{ border: `1.5px solid ${errors.date ? '#dc2626' : T.inputBorder}`, borderRadius: '10px', padding: '11px 14px', fontSize: '14px', color: T.text, background: T.input, width: '100%', outline: 'none', boxSizing: 'border-box' }} />
                        {errors.date && <span style={{ fontSize: '12px', color: '#dc2626' }}>{errors.date}</span>}
                      </div>

                      {/* Rekening */}
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>No. Rekening / Kode Ref <span style={{ fontSize: '11px', color: T.sub, fontWeight: 400 }}>(opsional)</span></label>
                        <input type="text" value={rekening} onChange={e => setRekening(e.target.value)} placeholder="Contoh: 1234-5678 atau REF-001"
                          style={{ border: `1.5px solid ${T.inputBorder}`, borderRadius: '10px', padding: '11px 14px', fontSize: '14px', color: T.text, background: T.input, width: '100%', outline: 'none', boxSizing: 'border-box' }} />
                      </div>

                      {/* Note */}
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Keterangan <span style={{ fontSize: '11px', color: T.sub, fontWeight: 400 }}>(opsional)</span></label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Tambahkan catatan jika diperlukan..." rows={3}
                          style={{ border: `1.5px solid ${T.inputBorder}`, borderRadius: '10px', padding: '11px 14px', fontSize: '14px', color: T.text, background: T.input, width: '100%', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
                      </div>

                      {/* Proof Image */}
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>📎 Upload Bukti Transfer <span style={{ fontSize: '11px', color: T.sub, fontWeight: 400 }}>(opsional, maks 2MB)</span></label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: '13px', color: T.text }} />
                        {proofImage && (
                          <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                            <img src={proofImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: `2px solid ${schoolColor}` }} />
                            <button type="button" onClick={() => setProofImage(null)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                          </div>
                        )}
                      </div>

                      <button type="submit" style={{ background: `linear-gradient(135deg, ${schoolColor}, ${schoolColor}cc)`, color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                        Lanjut & Preview →
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== HISTORY TAB ===== */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: T.text }}>Riwayat Setoran — {schoolLabel}</h3>
                <button onClick={handlePrint} style={{ background: schoolColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>📄 Cetak PDF</button>
              </div>
              {history.length === 0 ? (
                <div style={{ background: T.card, borderRadius: '14px', padding: '40px 24px', textAlign: 'center', color: T.sub, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
                  Belum ada riwayat setoran
                </div>
              ) : history.map(tx => {
                const typeInfo = PAYMENT_TYPES.find(t => t.id === tx.paymentType);
                return (
                  <div key={tx.id} style={{ background: T.card, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: T.text }}>{typeInfo?.icon} {typeInfo?.label}</span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#16a34a' }}>{formatRupiah(tx.amount)}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: T.sub, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span>{MONTHS[tx.month]} {tx.year}</span>
                      <span>Transfer: {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {tx.submittedBy && <span>oleh {tx.submittedBy}</span>}
                    </div>
                    {tx.note && <div style={{ fontSize: '12px', color: T.sub, marginTop: '4px' }}>📝 {tx.note}</div>}
                    {tx.rekening && <div style={{ fontSize: '12px', color: T.sub, marginTop: '2px' }}>🏦 {tx.rekening}</div>}
                    {tx.proofImage && (
                      <div style={{ marginTop: '8px' }}>
                        <img src={tx.proofImage} alt="Bukti TF" style={{ maxHeight: '100px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${T.border}` }} onClick={() => setProofModal(tx.proofImage)} />
                        <div style={{ fontSize: '11px', color: schoolColor, marginTop: '2px' }}>📎 Tap untuk perbesar</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== PESAN TAB ===== */}
          {activeTab === 'pesan' && (
            <div style={{ background: T.card, borderRadius: '14px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, background: isDark ? '#1f2937' : '#f8fafc' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: T.text }}>💬 Pesan ke Admin</div>
                <div style={{ fontSize: '12px', color: T.sub }}>Kirim pesan langsung ke admin yayasan</div>
              </div>
              <div style={{ height: '320px', overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.length === 0 && <div style={{ textAlign: 'center', color: T.sub, fontSize: '13px', marginTop: '40px' }}>Belum ada pesan. Mulai percakapan!</div>}
                {messages.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.fromRole === 'admin' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ maxWidth: '75%', background: m.fromRole === 'admin' ? (isDark ? '#374151' : '#f0f4f8') : schoolColor, color: m.fromRole === 'admin' ? T.text : '#fff', borderRadius: m.fromRole === 'admin' ? '4px 12px 12px 12px' : '12px 4px 12px 12px', padding: '8px 12px', fontSize: '13px' }}>
                      <div style={{ fontWeight: '600', fontSize: '11px', marginBottom: '3px', opacity: 0.7 }}>{m.fromName}</div>
                      {m.content}
                      <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>{new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>
              <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: '8px' }}>
                <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMsg()} placeholder="Ketik pesan..." style={{ flex: 1, border: `1.5px solid ${T.inputBorder}`, borderRadius: '20px', padding: '9px 14px', fontSize: '13px', color: T.text, background: T.input, outline: 'none' }} />
                <button onClick={handleSendMsg} style={{ background: schoolColor, color: '#fff', border: 'none', borderRadius: '20px', padding: '9px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Kirim</button>
              </div>
            </div>
          )}

          {/* ===== GRUP TAB ===== */}
          {activeTab === 'grup' && (
            <div style={{ background: T.card, borderRadius: '14px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, background: isDark ? '#1f2937' : '#f8fafc' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: T.text }}>👥 Grup YTKP Banjar Asri</div>
                <div style={{ fontSize: '12px', color: T.sub }}>Pesan grup semua bendahara & admin</div>
              </div>
              <div style={{ height: '320px', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {groupMessages.length === 0 && <div style={{ textAlign: 'center', color: T.sub, fontSize: '13px', marginTop: '40px' }}>Belum ada pesan di grup.</div>}
                {groupMessages.map(m => {
                  const isMe = m.from === user.id;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '75%', background: isMe ? schoolColor : (isDark ? '#374151' : '#f0f4f8'), color: isMe ? '#fff' : T.text, borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px', padding: '8px 12px', fontSize: '13px' }}>
                        <div style={{ fontWeight: '600', fontSize: '11px', marginBottom: '3px', opacity: 0.7 }}>{m.fromName} ({SCHOOL_LABELS[m.fromSchool] || m.fromSchool || 'Admin'})</div>
                        {m.content}
                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>{new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: '8px' }}>
                <input value={groupMsgText} onChange={e => setGroupMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendGroup()} placeholder="Pesan ke grup..." style={{ flex: 1, border: `1.5px solid ${T.inputBorder}`, borderRadius: '20px', padding: '9px 14px', fontSize: '13px', color: T.text, background: T.input, outline: 'none' }} />
                <button onClick={handleSendGroup} style={{ background: schoolColor, color: '#fff', border: 'none', borderRadius: '20px', padding: '9px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Kirim</button>
              </div>
            </div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Tema */}
              <div style={{ background: T.card, borderRadius: '14px', padding: '18px', border: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: T.text, marginBottom: '14px' }}>⚙️ Pengaturan</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: T.text }}>Tema Tampilan</div>
                    <div style={{ fontSize: '12px', color: T.sub }}>{isDark ? 'Mode Gelap aktif' : 'Mode Terang aktif'}</div>
                  </div>
                  <button onClick={toggleTheme} style={{ background: isDark ? '#4b5563' : '#e2e8f0', border: 'none', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: T.text }}>
                    {isDark ? '☀️ Terang' : '🌙 Gelap'}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: T.text }}>Download Laporan PDF</div>
                    <div style={{ fontSize: '12px', color: T.sub }}>Cetak data setoran {schoolLabel}</div>
                  </div>
                  <button onClick={handlePrint} style={{ background: schoolColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>📄 Cetak</button>
                </div>
              </div>

              {/* Help */}
              <div style={{ background: T.card, borderRadius: '14px', padding: '18px', border: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: T.text, marginBottom: '14px' }}>❓ Bantuan</h3>
                <div style={{ fontSize: '13px', color: T.sub, marginBottom: '14px', lineHeight: 1.6 }}>
                  Butuh bantuan? Hubungi tim Customer Service YTKP Banjar Asri melalui WhatsApp.
                </div>
                <a href="https://wa.me/628817835601" target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#25D366', color: '#fff', borderRadius: '10px', padding: '12px 16px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                  <span style={{ fontSize: '22px' }}>💬</span>
                  Chat WhatsApp CS — 08817835601
                </a>
              </div>

              {/* Info rekening */}
              <div style={{ background: T.card, borderRadius: '14px', padding: '18px', border: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: T.text, marginBottom: '14px' }}>🏦 Info Rekening Yayasan</h3>
                <div style={{ background: isDark ? '#111827' : '#f8fafc', borderRadius: '10px', padding: '14px', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '13px', color: T.sub, marginBottom: '4px' }}>Bank BRI</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: T.text, letterSpacing: '1px' }}>1234-5678-9012</div>
                  <div style={{ fontSize: '12px', color: T.sub, marginTop: '4px' }}>a.n. YTKP Banjar Asri</div>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* AI Floating Button */}
        <button className="no-print" onClick={() => setShowAI(true)} title="Tanya AI YTKP"
          style={{ position: 'fixed', bottom: '24px', right: '20px', background: `linear-gradient(135deg, #7c3aed, #6d28d9)`, color: '#fff', border: 'none', borderRadius: '50%', width: '52px', height: '52px', fontSize: '22px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(109,40,217,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          🤖
        </button>

        {/* AI Panel */}
        {showAI && (
          <div style={{ position: 'fixed', bottom: '90px', right: '16px', width: '320px', maxWidth: 'calc(100vw - 32px)', background: T.card, borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', border: `1px solid ${T.border}`, zIndex: 300, display: 'flex', flexDirection: 'column', maxHeight: '440px' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '16px 16px 0 0' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>🤖 Asisten AI YTKP</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Tanya seputar setoran & keuangan</div>
              </div>
              <button onClick={() => setShowAI(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px' }}>
              {aiHistory.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
                  <div style={{ fontSize: '13px', color: T.sub }}>Halo! Saya asisten AI YTKP.<br />Tanya saya seputar cara setor, rekening, atau informasi keuangan yayasan.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                    {['Transfer ke mana?', 'Cara input setoran SPP?', 'Apa itu Dana DSP?'].map(q => (
                      <button key={q} onClick={() => { setAiInput(q); }} style={{ background: isDark ? '#374151' : '#f0f4f8', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: T.text, cursor: 'pointer', textAlign: 'left' }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {aiHistory.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: h.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', background: h.role === 'user' ? '#7c3aed' : (isDark ? '#374151' : '#f0f4f8'), color: h.role === 'user' ? '#fff' : T.text, borderRadius: h.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px', padding: '8px 12px', fontSize: '13px', lineHeight: 1.5 }}>
                    {h.content}
                  </div>
                </div>
              ))}
              {aiLoading && <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: isDark ? '#374151' : '#f0f4f8', borderRadius: '4px 12px 12px 12px', padding: '8px 16px', fontSize: '20px' }}>⏳</div></div>}
            </div>
            <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: '8px' }}>
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAsk()} placeholder="Ketik pertanyaan..." style={{ flex: 1, border: `1.5px solid ${T.inputBorder}`, borderRadius: '20px', padding: '8px 14px', fontSize: '13px', color: T.text, background: T.input, outline: 'none' }} />
              <button onClick={handleAsk} disabled={aiLoading} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: aiLoading ? 0.6 : 1 }}>➤</button>
            </div>
          </div>
        )}

        {/* Proof Image Modal */}
        {proofModal && (
          <div onClick={() => setProofModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <img src={proofModal} alt="Bukti TF" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }} />
            <button onClick={() => setProofModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        )}

        {/* Print area */}
        <div className="print-only" style={{ padding: '20px' }}>
          <h2>Laporan Setoran — {schoolLabel}</h2>
          <p>Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f0f4f8' }}>
                {['No', 'Jenis', 'Nominal', 'Periode', 'Tgl Transfer', 'Keterangan'].map(h => (
                  <th key={h} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((tx, i) => {
                const typeInfo = PAYMENT_TYPES.find(t => t.id === tx.paymentType);
                return (
                  <tr key={tx.id}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{i + 1}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{typeInfo?.label}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatRupiah(tx.amount)}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{MONTHS[tx.month]} {tx.year}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tx.note || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: '16px', fontWeight: 'bold' }}>
            Total: {formatRupiah(history.reduce((a, t) => a + t.amount, 0))}
          </div>
        </div>
      </div>
    </>
  );
}
