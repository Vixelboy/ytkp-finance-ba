import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { PAYMENT_TYPES, MONTHS, saveTransaction, getTransactions, filterTransactions } from '../lib/store';
import { formatRupiah, formatDateTime } from '../lib/format';

export default function UserPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('form'); // 'form' | 'confirm' | 'success'
  const [history, setHistory] = useState([]);

  // Form state
  const [paymentType, setPaymentType] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(new Date().getMonth().toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rekening, setRekening] = useState('');
  const [errors, setErrors] = useState({});
  const [lastTx, setLastTx] = useState(null);

  useEffect(() => {
    const session = sessionStorage.getItem('ytkp_session');
    if (!session) { router.replace('/'); return; }
    const u = JSON.parse(session);
    if (u.role === 'admin') { router.replace('/admin'); return; }
    setUser(u);
    loadHistory(u.school);
  }, []);

  function loadHistory(school) {
    const txs = getTransactions();
    const filtered = txs.filter(t => t.school === school).slice(0, 5);
    setHistory(filtered);
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

  function handlePreview(e) {
    e.preventDefault();
    if (validate()) setStep('confirm');
  }

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
    });
    setLastTx(tx);
    setStep('success');
    // Reset
    setPaymentType(''); setAmount(''); setNote(''); setRekening('');
    setMonth(new Date().getMonth().toString());
    setYear(new Date().getFullYear().toString());
    setDate(new Date().toISOString().split('T')[0]);
    loadHistory(user.school);
  }

  function handleNewEntry() {
    setStep('form');
    setErrors({});
  }

  function handleLogout() {
    sessionStorage.removeItem('ytkp_session');
    router.push('/');
  }

  function formatInput(val) {
    const num = val.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  const selectedType = PAYMENT_TYPES.find(t => t.id === paymentType);
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Memuat...</div>;

  const schoolColors = { SMP: '#2563a8', SMA: '#16a34a', SMK: '#d97706' };
  const schoolColor = schoolColors[user.school] || '#1a3a5c';

  return (
    <>
      <Head>
        <title>Input Setoran — YTKP Banjar Asri</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
        {/* Top Bar */}
        <header style={{ ...styles.header, borderBottomColor: schoolColor + '33' }}>
          <div style={styles.headerContent}>
            <div>
              <div style={{ ...styles.schoolTag, background: schoolColor }}>
                {user.school}
              </div>
              <div style={styles.headerUser}>{user.name}</div>
            </div>
            <div style={styles.headerRight}>
              <span style={styles.headerLogo}>YTKP</span>
              <button onClick={handleLogout} style={styles.logoutBtn}>Keluar</button>
            </div>
          </div>
        </header>

        <main style={styles.main}>
          <div style={styles.container}>

            {/* SUCCESS STATE */}
            {step === 'success' && (
              <div style={styles.successCard}>
                <div style={styles.successIcon}>✅</div>
                <h2 style={styles.successTitle}>Setoran Berhasil Dicatat!</h2>
                <p style={styles.successSub}>Data telah tersimpan ke sistem yayasan</p>
                {lastTx && (
                  <div style={styles.successDetail}>
                    <div style={styles.detailRow}>
                      <span>Sekolah</span><strong>{lastTx.school}</strong>
                    </div>
                    <div style={styles.detailRow}>
                      <span>Jenis</span><strong>{PAYMENT_TYPES.find(t => t.id === lastTx.paymentType)?.label}</strong>
                    </div>
                    <div style={styles.detailRow}>
                      <span>Nominal</span><strong style={{ color: '#16a34a' }}>{formatRupiah(lastTx.amount)}</strong>
                    </div>
                    <div style={styles.detailRow}>
                      <span>Periode</span><strong>{MONTHS[lastTx.month]} {lastTx.year}</strong>
                    </div>
                    <div style={styles.detailRow}>
                      <span>Tanggal Setor</span><strong>{formatDateTime(lastTx.createdAt)}</strong>
                    </div>
                  </div>
                )}
                <button onClick={handleNewEntry} style={{ ...styles.btnPrimary, marginTop: '20px' }}>
                  + Input Setoran Baru
                </button>
              </div>
            )}

            {/* CONFIRM STATE */}
            {step === 'confirm' && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Konfirmasi Setoran</h2>
                <p style={styles.cardSub}>Pastikan data berikut sudah benar sebelum menyimpan.</p>

                <div style={styles.confirmBox}>
                  <div style={styles.detailRow}>
                    <span>Sekolah</span><strong>{user.school}</strong>
                  </div>
                  <div style={styles.detailRow}>
                    <span>Jenis Setoran</span><strong>{selectedType?.icon} {selectedType?.label}</strong>
                  </div>
                  <div style={styles.detailRow}>
                    <span>Nominal</span>
                    <strong style={{ color: '#16a34a', fontSize: '18px' }}>
                      Rp {amount}
                    </strong>
                  </div>
                  <div style={styles.detailRow}>
                    <span>Periode</span><strong>{MONTHS[parseInt(month)]} {year}</strong>
                  </div>
                  <div style={styles.detailRow}>
                    <span>Tanggal Transfer</span><strong>{new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </div>
                  {rekening && <div style={styles.detailRow}><span>No. Rek / Ref</span><strong>{rekening}</strong></div>}
                  {note && <div style={styles.detailRow}><span>Keterangan</span><strong>{note}</strong></div>}
                </div>

                <div style={styles.btnRow}>
                  <button onClick={() => setStep('form')} style={styles.btnSecondary}>
                    ← Kembali
                  </button>
                  <button onClick={handleSubmit} style={styles.btnPrimary}>
                    Simpan Setoran ✓
                  </button>
                </div>
              </div>
            )}

            {/* FORM STATE */}
            {step === 'form' && (
              <>
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Input Setoran Dana</h2>
                  <p style={styles.cardSub}>Catat setoran dari <strong>{user.school}</strong> ke rekening utama yayasan.</p>

                  <form onSubmit={handlePreview} style={styles.form}>
                    {/* Payment Type */}
                    <div style={styles.field}>
                      <label style={styles.label}>Jenis Setoran <span style={{ color: '#dc2626' }}>*</span></label>
                      <div style={styles.typeGrid}>
                        {PAYMENT_TYPES.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => { setPaymentType(t.id); setErrors({ ...errors, paymentType: '' }); }}
                            style={{
                              ...styles.typeBtn,
                              ...(paymentType === t.id ? { ...styles.typeBtnActive, borderColor: schoolColor, background: schoolColor + '12' } : {}),
                            }}
                          >
                            <span style={{ fontSize: '20px' }}>{t.icon}</span>
                            <span style={{ fontSize: '11px', textAlign: 'center', lineHeight: 1.2 }}>{t.label}</span>
                          </button>
                        ))}
                      </div>
                      {errors.paymentType && <span style={styles.error}>{errors.paymentType}</span>}
                    </div>

                    {/* Amount */}
                    <div style={styles.field}>
                      <label style={styles.label} htmlFor="amount">Nominal (Rp) <span style={{ color: '#dc2626' }}>*</span></label>
                      <div style={styles.inputPrefix}>
                        <span style={styles.prefix}>Rp</span>
                        <input
                          id="amount"
                          type="text"
                          inputMode="numeric"
                          value={amount}
                          onChange={e => { setAmount(formatInput(e.target.value)); setErrors({ ...errors, amount: '' }); }}
                          placeholder="0"
                          style={{ ...styles.input, paddingLeft: '44px', borderColor: errors.amount ? '#dc2626' : '#e2e8f0' }}
                        />
                      </div>
                      {errors.amount && <span style={styles.error}>{errors.amount}</span>}
                      {amount && <span style={styles.amountPreview}>{formatRupiah(parseInt(amount.replace(/\./g, '')))}</span>}
                    </div>

                    {/* Period */}
                    <div style={styles.fieldRow}>
                      <div style={{ ...styles.field, flex: 1 }}>
                        <label style={styles.label}>Bulan <span style={{ color: '#dc2626' }}>*</span></label>
                        <select
                          value={month}
                          onChange={e => setMonth(e.target.value)}
                          style={styles.select}
                        >
                          {MONTHS.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ ...styles.field, flex: 1 }}>
                        <label style={styles.label}>Tahun <span style={{ color: '#dc2626' }}>*</span></label>
                        <select
                          value={year}
                          onChange={e => setYear(e.target.value)}
                          style={styles.select}
                        >
                          {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Transfer Date */}
                    <div style={styles.field}>
                      <label style={styles.label} htmlFor="date">Tanggal Transfer <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={e => { setDate(e.target.value); setErrors({ ...errors, date: '' }); }}
                        style={{ ...styles.input, borderColor: errors.date ? '#dc2626' : '#e2e8f0' }}
                      />
                      {errors.date && <span style={styles.error}>{errors.date}</span>}
                    </div>

                    {/* Rekening */}
                    <div style={styles.field}>
                      <label style={styles.label} htmlFor="rekening">No. Rekening / Kode Referensi <span style={{ color: '#5a6a7e', fontWeight: 400 }}>(opsional)</span></label>
                      <input
                        id="rekening"
                        type="text"
                        value={rekening}
                        onChange={e => setRekening(e.target.value)}
                        placeholder="Contoh: 1234-5678 atau REF-001"
                        style={styles.input}
                      />
                    </div>

                    {/* Note */}
                    <div style={styles.field}>
                      <label style={styles.label} htmlFor="note">Keterangan <span style={{ color: '#5a6a7e', fontWeight: 400 }}>(opsional)</span></label>
                      <textarea
                        id="note"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Tambahkan catatan jika diperlukan..."
                        rows={3}
                        style={{ ...styles.input, resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </div>

                    <button type="submit" style={{ ...styles.btnPrimary, background: `linear-gradient(135deg, ${schoolColor}, ${schoolColor}cc)` }}>
                      Lanjut & Preview →
                    </button>
                  </form>
                </div>

                {/* History */}
                {history.length > 0 && (
                  <div style={styles.card}>
                    <h3 style={styles.historyTitle}>Riwayat Terakhir — {user.school}</h3>
                    <div style={styles.historyList}>
                      {history.map(tx => {
                        const typeInfo = PAYMENT_TYPES.find(t => t.id === tx.paymentType);
                        return (
                          <div key={tx.id} style={styles.historyItem}>
                            <div style={styles.historyIcon}>{typeInfo?.icon || '💰'}</div>
                            <div style={styles.historyInfo}>
                              <div style={styles.historyName}>{typeInfo?.label || tx.paymentType}</div>
                              <div style={styles.historyMeta}>{MONTHS[tx.month]} {tx.year} · {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                            </div>
                            <div style={styles.historyAmount}>{formatRupiah(tx.amount)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

const styles = {
  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '12px 16px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  headerContent: {
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  schoolTag: {
    display: 'inline-block',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 10px',
    borderRadius: '20px',
    letterSpacing: '0.8px',
    marginBottom: '2px',
  },
  headerUser: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a2433',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerLogo: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#1a3a5c',
    letterSpacing: '1px',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    color: '#5a6a7e',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  main: { padding: '20px 16px 40px' },
  container: { maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e8edf2',
  },
  cardTitle: { fontSize: '18px', fontWeight: '700', color: '#1a2433', marginBottom: '4px' },
  cardSub: { fontSize: '13px', color: '#5a6a7e', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  fieldRow: { display: 'flex', gap: '12px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: {
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '15px',
    color: '#1a2433',
    background: '#f9fafb',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '15px',
    color: '#1a2433',
    background: '#f9fafb',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'auto',
  },
  inputPrefix: { position: 'relative' },
  prefix: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#5a6a7e',
    fontSize: '14px',
    fontWeight: '600',
    pointerEvents: 'none',
  },
  error: { fontSize: '12px', color: '#dc2626' },
  amountPreview: {
    fontSize: '13px',
    color: '#16a34a',
    fontWeight: '600',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  typeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '12px 6px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    background: '#f9fafb',
    cursor: 'pointer',
    color: '#374151',
    transition: 'all 0.15s',
    minHeight: '72px',
  },
  typeBtnActive: {
    borderWidth: '2px',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #1a3a5c, #2563a8)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    letterSpacing: '0.3px',
  },
  btnSecondary: {
    background: '#f0f4f8',
    color: '#374151',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
  },
  confirmBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '4px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#5a6a7e',
    padding: '4px 0',
    borderBottom: '1px solid #e8edf2',
    gap: '16px',
  },
  successCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '32px 24px',
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  successIcon: { fontSize: '56px', marginBottom: '12px' },
  successTitle: { fontSize: '22px', fontWeight: '700', color: '#1a2433', marginBottom: '6px' },
  successSub: { fontSize: '14px', color: '#5a6a7e', marginBottom: '20px' },
  successDetail: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyTitle: { fontSize: '15px', fontWeight: '700', color: '#1a2433', marginBottom: '12px' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    background: '#f8fafc',
    borderRadius: '10px',
  },
  historyIcon: { fontSize: '22px', width: '36px', textAlign: 'center' },
  historyInfo: { flex: 1 },
  historyName: { fontSize: '13px', fontWeight: '600', color: '#1a2433' },
  historyMeta: { fontSize: '11px', color: '#5a6a7e' },
  historyAmount: { fontSize: '13px', fontWeight: '700', color: '#16a34a' },
};
