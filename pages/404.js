import { useRouter } from 'next/router';

export default function Custom404() {
  const router = useRouter();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f4f8',
      fontFamily: 'system-ui, sans-serif',
      gap: '16px',
    }}>
      <div style={{ fontSize: '64px' }}>🏫</div>
      <h1 style={{ fontSize: '24px', color: '#1a2433', fontWeight: '700' }}>Halaman Tidak Ditemukan</h1>
      <p style={{ color: '#5a6a7e', fontSize: '15px' }}>Halaman yang Anda cari tidak ada.</p>
      <button
        onClick={() => router.push('/')}
        style={{
          background: '#1a3a5c',
          color: '#fff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Kembali ke Login
      </button>
    </div>
  );
}
