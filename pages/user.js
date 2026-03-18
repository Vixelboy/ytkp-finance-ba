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

  async function loadAll(school) {
    const txs = await getTransactions();
    setHistory(txs.filter(t => t.school === school));
    const msgs = await getMessages();
    setMessages(msgs.filter(m => m.type === 'direct' && (m.from_school === school || m.to_school === school)));
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

  async function handleSubmit() {
    const numAmount = parseInt(amount.replace(/\./g, ''));
    const tx = await saveTransaction({
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

  async function handleSendMsg() {
    if (!msgText.trim()) return;
    await saveMessage({ type: 'direct', from: user.id, fromName: user.name, fromRole: 'user', fromSchool: user.school, toSchool: user.school, content: msgText.trim() });
    setMsgText('');
    loadAll(user.school);
  }

  async function handleSendGroup() {
    if (!groupMsgText.trim()) return;
    await saveMessage({ type: 'group', from: user.id, fromName: user.name, fromRole: 'user', fromSchool: user.school, content: groupMsgText.trim() });
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

  if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Memuat...</div>;

  const isDark = theme === 'dark';
  const schoolColor = SCHOOL_COLORS[user.school] || '#2563a8';
  const schoolLabel = SCHOOL_LABELS[user.school] || user.school;

  const T = {
    bg: isDark ? '#111827' : '#f0f4f8',
    card: isDark ? '#1f2937' : '#ffffff',
    text: isDark ? '#f3f4f6' : '#1a2433',
    sub: isDark ? '#9ca3af' : '#5a6a7e',
    border: isDark ? '#374151' : '#e8edf2',
    input: isDark ? '#374151' : '#f9fafb',
    inputBorder: isDark ? '#4b5563' : '#e2e8f0',
  };

  function handlePrint() { window.print(); }

  const TABS_USER = [
    { id: 'form', label: '➕ Setoran' },
    { id: 'history', label: '📋 Riwayat' },
    { id: 'pesan', label: '💬 Pesan' },
    { id: 'grup', label: '👫 Grup' },
    { id: 'settings', label: '⚙️ Lainnya' },
  ];

  return (
    <>
      <Head>
        <title>{schoolLabel} — YTKP Banjar Asri</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <style>{`@media print{.no-print{display:none!important}.print-only{display:block!important}}#__next{background:${T.bg}}.print-only{display:none}`}</style>

      <div style={{ minHeight: '100vh', background: T.bg }}>
        {/* Header */}
        <header className="no-print" style={{ background: schoolColor, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          <div style={{ maxWidth: '480px', margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{schoolLabel}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>Halo, {user.name}</div>
            </div>
            <button onClick={() => { sessionStorage.removeItem('ytkp_session'); router.push('/'); }}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              Keluar
            </button>
          </div>
        </header>

        {/* Tab Nav */}
        <nav className="no-print" style={{ background: T.card, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: '52px', zIndex: 99 }}>
          <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', overflowX: 'auto' }}>
            {TABS_USER.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ flex: '0 0 auto', padding: '12px 14px', fontSize: '12px', fontWeight: activeTab === tab.id ? '700' : '500', color: activeTab === tab.id ? schoolColor : T.sub, background: 'none', border: 'none', borderBottom: activeTab === tab.id ? `2.5px solid ${schoolColor}` : '2.5px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <main style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>

          {/* ===== FORM TAB ===== */}
          {activeTab === 'form' && step === 'form' && (
            <div style={{ background: T.card, borderRadius: '16px', padding: '20px', border: `1px solid ${T.border}` }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: T.text, marginBottom: '18px' }}>➕ Input Setoran</h2>

              {/* Jenis Setoran */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '8px' }}>Jenis Setoran *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {PAYMENT_TYPES.map(pt => (
                    <button key={pt.id} onClick={() => setPaymentType(pt.id)}
                      style={{ padding: '10px 8px', borderRadius: '10px', border: `2px solid ${paymentType === pt.id ? schoolColor : T.border}`, background: paymentType === pt.id ? (isDark ? '#1e3a5f' : '#eff6ff') : T.input, color: T.text, fontSize: '12px', fontWeight: paymentType === pt.id ? '700' : '500', cursor: 'pointer', textAlign: 'left' }}>
                      {pt.icon} {pt.label}
                    </button>
                  ))}
                </div>
                {errors.paymentType && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{errors.paymentType}</div>}
              </div>

              {/* Nominal */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Nominal (Rp) *</label>
                <input value={amount} onChange={e => {
                  const raw = e.target.value.replace(/\./g, '');
                  if (isNaN(raw)) return;
                  setAmount(raw ? parseInt(raw).toLocaleString('id-ID') : '');
                }}
                  placeholder="Contoh: 500.000"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1.5px solid ${errors.amount ? '#dc2626' : T.inputBorder}`, background: T.input, color: T.text, fontSize: '14px', boxSizing: 'border-box' }} />
                {errors.amount && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{errors.amount}</div>}
              </div>

              {/* Periode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Bulan</label>
                  <select value={month} onChange={e => setMonth(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1.5px solid ${T.inputBorder}`, background: T.input, color: T.text, fontSize: '13px' }}>
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Tahun</label>
                  <select value={year} onChange={e => setYear(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1.5px solid ${T.inputBorder}`, background: T.input, color: T.text, fontSize: '13px' }}>
                    {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Tanggal Transfer */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Tanggal Transfer *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1.5px solid ${errors.date ? '#dc2626' : T.inputBorder}`, background: T.input, color: T.text, fontSize: '14px', boxSizing: 'border-box' }} />
                {errors.date && <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>{errors.date}</div>}
              </div>

              {/* Rekening */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>No. Rekening Pengirim</label>
                <input value={rekening} onChange={e => setRekening(e.target.value)} placeholder="Opsional"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1.5px solid ${T.inputBorder}`, background: T.input, color: T.text, fontSize: '14px', boxSizing: 'border-box' }} />
              </div>

              {/* Catatan */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Catatan</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Opsional"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1.5px solid ${T.inputBorder}`, background: T.input, color: T.text, fontSize: '14px', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Bukti */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: T.text, display: 'block', marginBottom: '6px' }}>Bukti Transfer</label>
                <input type="file" accept="image/*" onChange={handleImageUpload}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1.5px dashed ${T.inputBorder}`, background: T.input, color: T.text, fontSize: '13px', boxSizing: 'border-box' }} />
                {proofImage && <img src={proofImage} alt="preview" style={{ marginTop: '8px', width: '100%', borderRadius: '8px', maxHeight: '160px', objectFit: 'cover' }} />}
              </div>

              <button onClick={handlePreview}
                style={{ width: '100%', padding: '14px', background: schoolColor, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                Preview & Kirim
              </button>
            </div>
          )}

          {/* ===== CONFIRM STEP ===== */}
          {activeTab === 'form' && step === 'confirm' && (
            <div style={{ background: T.card, borderRadius: '16px', padding: '20px', border: `1px solid ${T.border}` }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: T.text, marginBottom: '18px' }}>✅ Konfirmasi Setoran</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {[
                  ['Sekolah', schoolLabel],
                  ['Jenis', PAYMENT_TYPES.find(p => p.id === paymentType)?.label],
                  ['Nominal', `Rp ${amount}`],
                  ['Periode', `${MONTHS[parseInt(month)]} ${year}`],
                  ['Tanggal', new Date(date).toLocaleDateString('id-ID', { dateStyle: 'long' })],
                  ['Rekening', rekening || '-'],
                  ['Catatan', note || '-'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: '13px', color: T.sub }}>{k}</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: T.text, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                  </div>
                ))}
              </div>
              {proofImage && <img src={proofImage} alt="bukti" style={{ width: '100%', borderRadius: '8px', marginBottom: '16px', maxHeight: '180px', objectFit: 'cover' }} />}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep('form')}
                  style={{ flex: 1, padding: '12px', background: T.input, border: `1px solid ${T.border}`, borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: T.text }}>
                  Kembali
                </button>
                <button onClick={handleSubmit}
                  style={{ flex: 2, padding: '12px', background: schoolColor, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  ✅ Konfirmasi & Kirim
                </button>
              </div>
            </div>
          )}

          {/* ===== SUCCESS STEP ===== */}
          {activeTab === 'form' && step === 'success' && (
            <div style={{ background: T.card, borderRadius: '16px', padding: '28px 20px', border: `1px solid ${T.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a', marginBottom: '8px' }}>Setoran Berhasil!</h2>
              <p style={{ fontSize: '13px', color: T.sub, marginBottom: '20px' }}>Data telah tersimpan ke sistem.</p>
              <button onClick={() => setStep('form')}
                style={{ padding: '12px 28px', background: schoolColor, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                Input Lagi
              </button>
            </div>
          )}

          {/* ===== HISTORY TAB ===== */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: T.text, margin: '0 0 4px' }}>📋 Riwayat Setoran</h2>
              {history.length === 0 ? (
                <div style={{ background: T.card, borderRadius: '14px', padding: '32px', textAlign: 'center', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
                  <div style={{ fontSize: '14px', color: T.sub }}>Belum ada riwayat setoran.</div>
                </div>
              ) : history.map(tx => {
                const typeInfo = PAYMENT_TYPES.find(t => t.id === tx.paymentType);
                return (
                  <div key={tx.id} style={{ background: T.card, borderRadius: '14px', padding: '14px 16px', border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: T.text }}>{typeInfo?.icon} {typeInfo?.label}</span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: schoolColor }}>{formatRupiah(tx.amount)}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: T.sub }}>{MONTHS[tx.month]} {tx.year} · {new Date(tx.date).toLocaleDateString('id-ID')}</div>
                    {tx.note && <div style={{ fontSize: '12px', color: T.sub, marginTop: '4px' }}>📝 {tx.note}</div>}
                    {tx.proofImage && (
                      <img src={tx.proofImage} alt="bukti" onClick={() => setProofModal(tx.proofImage)}
                        style={{ marginTop: '8px', width: '100%', borderRadius: '8px', maxHeight: '120px', objectFit: 'cover', cursor: 'pointer' }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== PESAN TAB ===== */}
          {activeTab === 'pesan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: T.text }}>💬 Pesan ke Admin</h2>
              <div style={{ background: T.card, borderRadius: '14px', padding: '14px', border: `1px solid ${T.border}`, minHeight: '200px', maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.length === 0 && <div style={{ color: T.sub, fontSize: '13px', textAlign: 'center', marginTop: '60px' }}>Belum ada pesan.</div>}
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === user.id ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '80%', background: m.from === user.id ? schoolColor : (isDark ? '#374151' : '#f0f4f8'), color: m.from === user.id ? '#fff' : T.text, borderRadius: '12px', padding: '8px 12px', fontSize: '13px' }}>
                      <div>{m.content}</div>
                      <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '3px' }}>{m.from_name}</div>
                    </div>
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMsg()} placeholder="Tulis pesan..."
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: `1.5px solid ${T.inputBorder}`, background: T.input, color: T.text, fontSize: '13px' }} />
                <button onClick={handleSendMsg} style={{ background: schoolColor, color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 16px', fontWeight: '700', cursor: 'pointer' }}>➤</button>
              </div>
            </div>
          )}

          {/* ===== GRUP TAB ===== */}
          {activeTab === 'grup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', color: T.text }}>👫 Chat Grup</h2>
              <div style={{ background: T.card, borderRadius: '14px', padding: '14px', border: `1px solid ${T.border}`, minHeight: '200px', maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {groupMessages.length === 0 && <div style={{ color: T.sub, fontSize: '13px', textAlign: 'center', marginTop: '60px' }}>Belum ada pesan grup.</div>}
                {groupMessages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === user.id ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '80%', background: m.from === user.id ? schoolColor : (isDark ? '#374151' : '#f0f4f8'), color: m.from === user.id ? '#fff' : T.text, borderRadius: '12px', padding: '8px 12px', fontSize: '13px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '3px', opacity: 0.8 }}>{m.from_name} ({m.from_school || 'Admin'})</div>
                      <div>{m.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={groupMsgText} onChange={e => setGroupMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendGroup()} placeholder="Tulis pesan grup..."
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: `1.5px solid ${T.inputBorder}`, background: T.input, color: T.text, fontSize: '13px' }} />
                <button onClick={handleSendGroup} style={{ background: schoolColor, color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 16px', fontWeight: '700', cursor: 'pointer' }}>➤</button>
              </div>
            </div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
