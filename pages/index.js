import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { login, loginWithBackupCode } from '../lib/store';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !pin.trim()) {
      setError('Nama dan PIN harus diisi');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const user = login(name.trim(), pin.trim());
      if (!user) {
        setError('Nama atau PIN salah. Coba lagi.');
        setLoading(false);
        return;
      }
      sessionStorage.setItem('ytkp_session', JSON.stringify(user));
      router.push(user.role === 'admin' ? '/admin' : '/user');
    }, 300);
  }

  function handleBackupLogin(e) {
    e.preventDefault();
    setError('');
    if (!backupCode.trim()) {
      setError('Masukkan kode darurat admin');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const user = loginWithBackupCode(backupCode.trim());
      if (!user) {
        setError('Kode darurat salah. Hubungi pengelola yayasan.');
        setLoading(false);
        return;
      }
      sessionStorage.setItem('ytkp_session', JSON.stringify(user));
      router.push('/admin');
    }, 300);
  }

  return (
    <>
      <Head>
        <title>YTKP Banjar Asri — Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="Sistem Keuangan Yayasan YTKP Banjar Asri" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={styles.page}>
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.logoWrap}>
              <div style={styles.logoIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 2L3 9v6c0 8.5 5.5 16.5 13 19 7.5-2.5 13-10.5 13-19V9L16 2z" fill="#e8a020" opacity="0.2"/>
                  <path d="M16 2L3 9v6c0 8.5 5.5 16.5 13 19 7.5-2.5 13-10.5 13-19V9L16 2z" stroke="#e8a020" strokeWidth="2" fill="none"/>
                  <path d="M10 16h12M16 10v12" stroke="#1a3a5c" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <h1 style={styles.title}>YTKP Banjar Asri</h1>
            <p style={styles.subtitle}>Sistem Informasi Keuangan Yayasan</p>
            <div style={styles.schoolBadges}>
              {['SMP', 'SMA', 'SMK'].map(s => (
                <span key={s} style={styles.badge}>{s} Banjar Asri</span>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={styles.card}>
            {/* Toggle tabs */}
            <div style={styles.loginTabs}>
              <button
                style={{ ...styles.loginTab, ...(showBackup ? {} : styles.loginTabActive) }}
                onClick={() => { setShowBackup(false); setError(''); }}
              >
                Login Normal
              </button>
              <button
                style={{ ...styles.loginTab, ...(showBackup ? styles.loginTabActive : {}) }}
                onClick={() => { setShowBackup(true); setError(''); }}
              >
                🔐 Kode Darurat
              </button>
            </div>

            {!showBackup ? (
              <>
                <h2 style={styles.cardTitle}>Masuk ke Sistem</h2>
                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.field}>
                    <label style={styles.label} htmlFor="name">Nama Pengguna</label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => { setName(e.target.value); setError(''); }}
                      placeholder="Contoh: Admin Yayasan"
                      style={styles.input}
                      autoComplete="username"
                      autoCapitalize="words"
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label} htmlFor="pin">PIN</label>
                    <div style={styles.pinWrap}>
                      <input
                        id="pin"
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={e => { setPin(e.target.value); setError(''); }}
                        placeholder="Masukkan PIN"
                        style={{ ...styles.input, paddingRight: '48px' }}
                        autoComplete="current-password"
                        inputMode="numeric"
                        maxLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        style={styles.eyeBtn}
                        aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                      >
                        {showPin ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div style={styles.errorBox}>
                      <span>⚠️</span> {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
                    disabled={loading}
                  >
                    {loading ? 'Memproses...' : 'Masuk'}
                  </button>
                </form>

                {/* Demo hint */}
                <div style={styles.hint}>
                  <p style={styles.hintTitle}>Akun Demo:</p>
                  <div style={styles.hintGrid}>
                    <div style={styles.hintItem}><strong>Admin:</strong> Admin Yayasan / 1234</div>
                    <div style={styles.hintItem}><strong>SMP:</strong> Bendahara SMP / 1111</div>
                    <div style={styles.hintItem}><strong>SMA:</strong> Bendahara SMA / 2222</div>
                    <div style={styles.hintItem}><strong>SMK:</strong> Bendahara SMK / 3333</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 style={styles.cardTitle}>🔐 Login Kode Darurat Admin</h2>
                <p style={{ fontSize: '13px', color: '#5a6a7e', marginBottom: '16px', textAlign: 'center' }}>
                  Gunakan kode darurat jika lupa nama/PIN admin. Kode tersedia di halaman Pengaturan Admin.
                </p>
                <form onSubmit={handleBackupLogin} style={styles.form}>
                  <div style={styles.field}>
                    <label style={styles.label}>Kode Darurat Admin</label>
                    <input
                      type="text"
                      value={backupCode}
                      onChange={e => { setBackupCode(e.target.value.toUpperCase()); setError(''); }}
                      placeholder="Contoh: YTKP-ADMIN-2026"
                      style={{ ...styles.input, letterSpacing: '2px', fontFamily: 'monospace', fontSize: '16px' }}
                    />
                  </div>
                  {error && (
                    <div style={styles.errorBox}>
                      <span>⚠️</span> {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    style={{ ...styles.btn, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', opacity: loading ? 0.7 : 1 }}
                    disabled={loading}
                  >
                    {loading ? 'Memverifikasi...' : 'Masuk dengan Kode Darurat'}
                  </button>
                </form>
                <div style={styles.hint}>
                  <p style={{ fontSize: '12px', color: '#5a6a7e', textAlign: 'center' }}>
                    💡 Kode default: <code style={{ background: '#e8edf2', padding: '2px 6px', borderRadius: '4px' }}>YTKP-ADMIN-2026</code>
                  </p>
                </div>
              </>
            )}
          </div>

          <p style={styles.footer}>© 2026 Muhamad Ikbal T. Semua hak dilindungi.</p>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f2438 0%, #1a3a5c 50%, #2563a8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  container: { width: '100%', maxWidth: '420px' },
  header: { textAlign: 'center', marginBottom: '24px' },
  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: '12px' },
  logoIcon: {
    width: '72px', height: '72px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid rgba(232,160,32,0.4)',
  },
  title: { color: '#ffffff', fontSize: '24px', fontWeight: '700', marginBottom: '4px', letterSpacing: '-0.3px' },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '16px' },
  schoolBadges: { display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' },
  badge: {
    background: 'rgba(232,160,32,0.2)',
    border: '1px solid rgba(232,160,32,0.4)',
    color: '#f5b942',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.3px',
  },
  card: { background: '#ffffff', borderRadius: '20px', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  loginTabs: { display: 'flex', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' },
  loginTab: {
    flex: 1, padding: '9px', fontSize: '12px', fontWeight: '600',
    border: 'none', background: '#f9fafb', color: '#5a6a7e', cursor: 'pointer',
  },
  loginTabActive: { background: '#1a3a5c', color: '#fff' },
  cardTitle: { fontSize: '17px', fontWeight: '700', color: '#1a2433', marginBottom: '16px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: {
    border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px',
    fontSize: '15px', color: '#1a2433', outline: 'none',
    transition: 'border-color 0.2s', width: '100%', background: '#f9fafb',
    boxSizing: 'border-box',
  },
  pinWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1,
  },
  errorBox: {
    background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b',
    borderRadius: '8px', padding: '10px 14px', fontSize: '13px',
    display: 'flex', gap: '8px', alignItems: 'center',
  },
  btn: {
    background: 'linear-gradient(135deg, #1a3a5c, #2563a8)',
    color: '#ffffff', border: 'none', borderRadius: '10px', padding: '14px',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
    transition: 'transform 0.1s, opacity 0.2s', marginTop: '4px', letterSpacing: '0.3px',
  },
  hint: {
    marginTop: '16px', padding: '12px', background: '#f0f4f8',
    borderRadius: '10px', border: '1px solid #e2e8f0',
  },
  hintTitle: { fontSize: '11px', fontWeight: '700', color: '#5a6a7e', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' },
  hintGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' },
  hintItem: { fontSize: '11px', color: '#374151' },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '20px' },
};
