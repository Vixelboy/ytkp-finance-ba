import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  SCHOOLS, PAYMENT_TYPES, MONTHS,
  getTransactions, filterTransactions, getSummary, getSPPNotifications
} from '../lib/store';
import { formatRupiah, formatDate, formatDateTime } from '../lib/format';

const SCHOOL_COLORS = { SMP: '#2563a8', SMA: '#16a34a', SMK: '#d97706' };
const SCHOOL_BG = { SMP: '#eff6ff', SMA: '#f0fdf4', SMK: '#fffbeb' };

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allTxs, setAllTxs] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifs, setDismissedNotifs] = useState([]);

  // Filter state
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth().toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  useEffect(() => {
    const session = sessionStorage.getItem('ytkp_session');
    if (!session) { router.replace('/'); return; }
    const u = JSON.parse(session);
    if (u.role !== 'admin') { router.replace('/user'); return; }
    setUser(u);
    loadData();
  }, []);

  function loadData() {
    const txs = getTransactions();
    setAllTxs(txs);
    const notifs = getSPPNotifications(txs);
    setNotifications(notifs);
  }

  const filtered = useMemo(() => {
    return filterTransactions(allTxs, {
      school: filterSchool,
      type: filterType,
      period: filterPeriod,
      from: filterFrom,
      to: filterTo,
      month: filterMonth,
      year: filterYear,
    });
  }, [allTxs, filterPeriod, filterSchool, filterType, filterFrom, filterTo, filterMonth, filterYear]);

  const summary = useMemo(() => getSummary(filtered), [filtered]);

  const activeNotifs = notifications.filter(n => !dismissedNotifs.includes(n.message));

  function handleLogout() {
    sessionStorage.removeItem('ytkp_session');
    router.push('/');
  }

  // Period label
  const periodLabels = {
    all: 'Semua Waktu',
    today: 'Hari Ini',
    week: '7 Hari Terakhir',
    month: 'Bulan Ini',
    year: 'Tahun Ini',
    specificMonth: `${MONTHS[parseInt(filterMonth)]} ${filterYear}`,
    custom: filterFrom && filterTo ? `${new Date(filterFrom).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${new Date(filterTo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Kustom',
  };

  if (!user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Memuat...</div>;

  return (
    <>
      <Head>
        <title>Dashboard Admin — YTKP Banjar Asri</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.logoMark}>
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                  <path d="M16 2L3 9v6c0 8.5 5.5 16.5 13 19 7.5-2.5 13-10.5 13-19V9L16 2z" fill="#e8a020" opacity="0.3"/>
                  <path d="M16 2L3 9v6c0 8.5 5.5 16.5 13 19 7.5-2.5 13-10.5 13-19V9L16 2z" stroke="#e8a020" strokeWidth="1.5" fill="none"/>
                  <path d="M10 16h12M16 10v12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={styles.headerTitle}>YTKP Banjar Asri</div>
                <div style={styles.headerSub}>Dashboard Admin</div>
              </div>
            </div>
            <div style={styles.headerRight}>
              {activeNotifs.length > 0 && (
                <div style={styles.notifBadge} onClick={() => setActiveTab('notifikasi')}>
                  <span>🔔</span>
                  <span style={styles.notifCount}>{activeNotifs.length}</span>
                </div>
              )}
              <span style={styles.adminName}>{user.name}</span>
              <button onClick={handleLogout} style={styles.logoutBtn}>Keluar</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            {[
              { id: 'dashboard', label: '📊 Ringkasan' },
              { id: 'transaksi', label: '📋 Transaksi' },
              { id: 'notifikasi', label: `🔔 Notifikasi${activeNotifs.length > 0 ? ` (${activeNotifs.length})` : ''}` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.id ? styles.tabActive : {}),
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main style={styles.main}>
          <div style={styles.container}>

            {/* FILTER BAR */}
            <div style={styles.filterCard}>
              <div style={styles.filterRow}>
                <div style={styles.filterField}>
                  <label style={styles.filterLabel}>Periode</label>
                  <select
                    value={filterPeriod}
                    onChange={e => setFilterPeriod(e.target.value)}
                    style={styles.select}
                  >
                    <option value="all">Semua Waktu</option>
                    <option value="today">Hari Ini</option>
                    <option value="week">7 Hari Terakhir</option>
                    <option value="month">Bulan Ini</option>
                    <option value="year">Tahun Ini</option>
                    <option value="specificMonth">Pilih Bulan</option>
                    <option value="custom">Rentang Tanggal</option>
                  </select>
                </div>

                {filterPeriod === 'specificMonth' && (
                  <>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabel}>Bulan</label>
                      <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={styles.select}>
                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                    </div>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabel}>Tahun</label>
                      <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={styles.select}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {filterPeriod === 'custom' && (
                  <>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabel}>Dari</label>
                      <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={styles.input} />
                    </div>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabel}>Sampai</label>
                      <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={styles.input} />
                    </div>
                  </>
                )}

                <div style={styles.filterField}>
                  <label style={styles.filterLabel}>Sekolah</label>
                  <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} style={styles.select}>
                    <option value="">Semua Sekolah</option>
                    {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div style={styles.filterField}>
                  <label style={styles.filterLabel}>Jenis</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} style={styles.select}>
                    <option value="">Semua Jenis</option>
                    {PAYMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.filterInfo}>
                <span style={styles.filterInfoText}>
                  Menampilkan: <strong>{periodLabels[filterPeriod]}</strong>
                  {filterSchool ? ` · ${filterSchool}` : ''}
                  {filterType ? ` · ${PAYMENT_TYPES.find(t => t.id === filterType)?.label}` : ''}
                </span>
                <span style={styles.filterCount}>{filtered.length} transaksi</span>
              </div>
            </div>

            {/* ===== DASHBOARD TAB ===== */}
            {activeTab === 'dashboard' && (
              <div style={styles.tabContent}>
                {/* Total Card */}
                <div style={styles.totalCard}>
                  <div style={styles.totalLabel}>Total Dana Masuk</div>
                  <div style={styles.totalAmount}>{formatRupiah(summary.total)}</div>
                  <div style={styles.totalPeriod}>{periodLabels[filterPeriod]}</div>
                </div>

                {/* Per School Cards */}
                <div style={styles.schoolGrid}>
                  {SCHOOLS.map(school => (
                    <div
                      key={school}
                      style={{ ...styles.schoolCard, borderTopColor: SCHOOL_COLORS[school] }}
                    >
                      <div style={{ ...styles.schoolBadge, background: SCHOOL_BG[school], color: SCHOOL_COLORS[school] }}>
                        {school}
                      </div>
                      <div style={styles.schoolAmount}>{formatRupiah(summary[school] || 0)}</div>
                      <div style={styles.schoolCount}>
                        {filtered.filter(t => t.school === school).length} transaksi
                      </div>
                      {summary.total > 0 && (
                        <div style={styles.schoolBar}>
                          <div style={{
                            ...styles.schoolBarFill,
                            width: `${Math.round((summary[school] || 0) / summary.total * 100)}%`,
                            background: SCHOOL_COLORS[school],
                          }} />
                        </div>
                      )}
                      <div style={styles.schoolPct}>
                        {summary.total > 0 ? Math.round((summary[school] || 0) / summary.total * 100) : 0}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Per Type Breakdown */}
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>Rincian per Jenis Setoran</h3>
                  {PAYMENT_TYPES.map(type => {
                    const typeTxs = filtered.filter(t => t.paymentType === type.id);
                    const typeTotal = typeTxs.reduce((a, t) => a + t.amount, 0);
                    if (typeTotal === 0) return null;
                    return (
                      <div key={type.id} style={styles.breakdownRow}>
                        <span style={styles.breakdownIcon}>{type.icon}</span>
                        <div style={styles.breakdownInfo}>
                          <div style={styles.breakdownName}>{type.label}</div>
                          <div style={styles.breakdownBar}>
                            <div style={{
                              ...styles.breakdownBarFill,
                              width: `${summary.total > 0 ? (typeTotal / summary.total * 100) : 0}%`,
                            }} />
                          </div>
                        </div>
                        <div style={styles.breakdownAmount}>
                          <div style={styles.breakdownAmountNum}>{formatRupiah(typeTotal)}</div>
                          <div style={styles.breakdownAmountCount}>{typeTxs.length}x</div>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div style={styles.empty}>Tidak ada data untuk periode ini</div>
                  )}
                </div>

                {/* Recent transactions preview */}
                <div style={styles.card}>
                  <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>Transaksi Terbaru</h3>
                    <button onClick={() => setActiveTab('transaksi')} style={styles.viewAllBtn}>
                      Lihat Semua →
                    </button>
                  </div>
                  {filtered.slice(0, 5).map(tx => <TxRow key={tx.id} tx={tx} />)}
                  {filtered.length === 0 && <div style={styles.empty}>Belum ada transaksi</div>}
                </div>
              </div>
            )}

            {/* ===== TRANSAKSI TAB ===== */}
            {activeTab === 'transaksi' && (
              <div style={styles.tabContent}>
                <div style={styles.card}>
                  <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>Semua Transaksi</h3>
                    <span style={styles.txCountBadge}>{filtered.length}</span>
                  </div>
                  {filtered.length === 0 ? (
                    <div style={styles.empty}>
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
                      Tidak ada transaksi ditemukan
                    </div>
                  ) : (
                    <div>
                      {filtered.map(tx => <TxRow key={tx.id} tx={tx} expanded />)}
                    </div>
                  )}
                </div>

                {/* Summary at bottom */}
                <div style={styles.summaryBar}>
                  <div style={styles.summaryBarItem}>
                    <span>Total {filtered.length} transaksi</span>
                    <strong>{formatRupiah(summary.total)}</strong>
                  </div>
                  {SCHOOLS.map(s => summary[s] > 0 ? (
                    <div key={s} style={styles.summaryBarItem}>
                      <span style={{ color: SCHOOL_COLORS[s] }}>{s}</span>
                      <strong>{formatRupiah(summary[s])}</strong>
                    </div>
                  ) : null)}
                </div>
              </div>
            )}

            {/* ===== NOTIFIKASI TAB ===== */}
            {activeTab === 'notifikasi' && (
              <div style={styles.tabContent}>
                <div style={styles.card}>
                  <h3 style={styles.sectionTitle}>Notifikasi & Peringatan SPP</h3>
                  <p style={{ fontSize: '13px', color: '#5a6a7e', marginBottom: '16px' }}>
                    Sistem memonitor setoran SPP 3 bulan terakhir. Berikut status tiap sekolah:
                  </p>

                  {activeNotifs.length === 0 ? (
                    <div style={{ ...styles.empty, color: '#16a34a' }}>
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
                      Semua setoran SPP sudah lengkap!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {activeNotifs.map((notif, i) => (
                        <div
                          key={i}
                          style={{
                            ...styles.notifCard,
                            borderLeftColor: notif.severity === 'danger' ? '#dc2626'
                              : notif.severity === 'warning' ? '#d97706' : '#0891b2',
                            background: notif.severity === 'danger' ? '#fef2f2'
                              : notif.severity === 'warning' ? '#fffbeb' : '#f0f9ff',
                          }}
                        >
                          <div style={styles.notifContent}>
                            <span style={{ fontSize: '20px' }}>
                              {notif.severity === 'danger' ? '🔴' : notif.severity === 'warning' ? '🟡' : '🔵'}
                            </span>
                            <div>
                              <div style={styles.notifMessage}>{notif.message}</div>
                              <div style={styles.notifSub}>
                                Harap segera setorkan SPP {notif.school} bulan {notif.month} {notif.year}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setDismissedNotifs([...dismissedNotifs, notif.message])}
                            style={styles.dismissBtn}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* SPP Status Grid */}
                  <div style={{ marginTop: '24px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1a2433', marginBottom: '12px' }}>
                      Status SPP Per Sekolah (3 Bulan Terakhir)
                    </h4>
                    <SPPStatusGrid txs={allTxs} />
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}

function TxRow({ tx, expanded }) {
  const typeInfo = PAYMENT_TYPES.find(t => t.id === tx.paymentType);
  return (
    <div style={styles.txRow}>
      <div style={{ ...styles.txSchoolDot, background: SCHOOL_COLORS[tx.school] || '#888' }} />
      <div style={styles.txInfo}>
        <div style={styles.txTop}>
          <span style={styles.txType}>{typeInfo?.icon} {typeInfo?.label || tx.paymentType}</span>
          <span style={styles.txAmount}>{formatRupiah(tx.amount)}</span>
        </div>
        <div style={styles.txMeta}>
          <span style={{ ...styles.txSchoolTag, background: SCHOOL_BG[tx.school], color: SCHOOL_COLORS[tx.school] }}>
            {tx.school}
          </span>
          <span>{MONTHS[tx.month]} {tx.year}</span>
          <span>Transfer: {formatDate(tx.date)}</span>
          {expanded && tx.submittedBy && <span>oleh {tx.submittedBy}</span>}
        </div>
        {expanded && tx.note && (
          <div style={styles.txNote}>📝 {tx.note}</div>
        )}
        {expanded && tx.rekening && (
          <div style={styles.txNote}>🏦 {tx.rekening}</div>
        )}
      </div>
    </div>
  );
}

function SPPStatusGrid({ txs }) {
  const now = new Date();
  const months = [];
  for (let i = 2; i >= 0; i--) {
    let m = now.getMonth() - i;
    let y = now.getFullYear();
    if (m < 0) { m += 12; y--; }
    months.push({ month: m, year: y });
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <th style={{ ...styles.th, textAlign: 'left' }}>Sekolah</th>
            {months.map(({ month, year }) => (
              <th key={`${month}-${year}`} style={styles.th}>
                {MONTHS[month].slice(0, 3)} {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCHOOLS.map(school => (
            <tr key={school}>
              <td style={{ ...styles.td, fontWeight: '600', color: SCHOOL_COLORS[school] }}>{school}</td>
              {months.map(({ month, year }) => {
                const hasSPP = txs.some(tx =>
                  tx.school === school &&
                  tx.paymentType === 'spp' &&
                  new Date(tx.date).getMonth() === month &&
                  new Date(tx.date).getFullYear() === year
                );
                const sppTx = txs.filter(tx =>
                  tx.school === school &&
                  tx.paymentType === 'spp' &&
                  new Date(tx.date).getMonth() === month &&
                  new Date(tx.date).getFullYear() === year
                );
                const total = sppTx.reduce((a, t) => a + t.amount, 0);
                return (
                  <td key={`${month}-${year}`} style={styles.td}>
                    {hasSPP ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={styles.statusOk}>✓</div>
                        <div style={{ fontSize: '11px', color: '#16a34a' }}>{formatRupiah(total)}</div>
                      </div>
                    ) : (
                      <div style={styles.statusMissing}>✗</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  header: {
    background: '#1a3a5c',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  headerContent: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoMark: {
    width: '40px', height: '40px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: '16px', fontWeight: '700', lineHeight: 1.2 },
  headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: '11px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  notifBadge: {
    position: 'relative',
    cursor: 'pointer',
    padding: '6px',
    fontSize: '18px',
  },
  notifCount: {
    position: 'absolute',
    top: '0', right: '0',
    background: '#dc2626',
    color: '#fff',
    fontSize: '9px',
    fontWeight: '700',
    width: '16px', height: '16px',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  adminName: { color: 'rgba(255,255,255,0.8)', fontSize: '13px', display: 'none' },
  logoutBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.8)',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tabs: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 16px',
    display: 'flex',
    gap: '4px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  tab: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: '#f5b942',
    borderBottomColor: '#f5b942',
  },
  main: { padding: '16px' },
  container: { maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' },
  tabContent: { display: 'flex', flexDirection: 'column', gap: '16px' },
  filterCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e8edf2',
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '10px',
  },
  filterField: { display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 140px', minWidth: '130px' },
  filterLabel: { fontSize: '11px', fontWeight: '600', color: '#5a6a7e', textTransform: 'uppercase', letterSpacing: '0.5px' },
  select: {
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    color: '#1a2433',
    background: '#f9fafb',
    outline: 'none',
    cursor: 'pointer',
  },
  input: {
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    color: '#1a2433',
    background: '#f9fafb',
    outline: 'none',
  },
  filterInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '8px',
    borderTop: '1px solid #f0f4f8',
  },
  filterInfoText: { fontSize: '12px', color: '#5a6a7e' },
  filterCount: { fontSize: '12px', color: '#1a3a5c', fontWeight: '600', background: '#e8f0fe', padding: '2px 10px', borderRadius: '12px' },
  card: {
    background: '#ffffff',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e8edf2',
  },
  sectionTitle: { fontSize: '15px', fontWeight: '700', color: '#1a2433', marginBottom: '14px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  viewAllBtn: {
    background: 'none', border: 'none',
    color: '#2563a8', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer',
  },
  totalCard: {
    background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)',
    borderRadius: '16px',
    padding: '24px',
    color: '#ffffff',
    textAlign: 'center',
  },
  totalLabel: { fontSize: '14px', opacity: 0.8, marginBottom: '8px' },
  totalAmount: { fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '4px' },
  totalPeriod: { fontSize: '13px', opacity: 0.6 },
  schoolGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  schoolCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e8edf2',
    borderTop: '3px solid',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  schoolBadge: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '700',
    padding: '3px 10px',
    borderRadius: '20px',
    marginBottom: '8px',
    letterSpacing: '0.5px',
  },
  schoolAmount: { fontSize: '20px', fontWeight: '700', color: '#1a2433', marginBottom: '4px' },
  schoolCount: { fontSize: '12px', color: '#5a6a7e', marginBottom: '10px' },
  schoolBar: { height: '4px', background: '#f0f4f8', borderRadius: '2px', marginBottom: '4px' },
  schoolBarFill: { height: '100%', borderRadius: '2px', transition: 'width 0.5s' },
  schoolPct: { fontSize: '12px', color: '#5a6a7e', textAlign: 'right' },
  breakdownRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid #f0f4f8',
  },
  breakdownIcon: { fontSize: '22px', width: '32px', textAlign: 'center' },
  breakdownInfo: { flex: 1 },
  breakdownName: { fontSize: '13px', fontWeight: '600', color: '#1a2433', marginBottom: '4px' },
  breakdownBar: { height: '4px', background: '#f0f4f8', borderRadius: '2px' },
  breakdownBarFill: { height: '100%', background: '#2563a8', borderRadius: '2px', transition: 'width 0.5s' },
  breakdownAmount: { textAlign: 'right' },
  breakdownAmountNum: { fontSize: '13px', fontWeight: '700', color: '#1a2433' },
  breakdownAmountCount: { fontSize: '11px', color: '#5a6a7e' },
  txRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid #f0f4f8',
  },
  txSchoolDot: {
    width: '8px', height: '8px',
    borderRadius: '50%',
    marginTop: '5px',
    flexShrink: 0,
  },
  txInfo: { flex: 1 },
  txTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  txType: { fontSize: '14px', fontWeight: '600', color: '#1a2433' },
  txAmount: { fontSize: '14px', fontWeight: '700', color: '#16a34a' },
  txMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    fontSize: '11px',
    color: '#5a6a7e',
    alignItems: 'center',
  },
  txSchoolTag: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '10px',
    letterSpacing: '0.3px',
  },
  txNote: { fontSize: '12px', color: '#5a6a7e', marginTop: '4px' },
  txCountBadge: {
    background: '#1a3a5c',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    padding: '2px 10px',
    borderRadius: '12px',
  },
  summaryBar: {
    background: '#1a3a5c',
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  },
  summaryBarItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
  },
  notifCard: {
    borderLeft: '4px solid',
    borderRadius: '8px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  notifContent: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  notifMessage: { fontSize: '14px', fontWeight: '600', color: '#1a2433', marginBottom: '2px' },
  notifSub: { fontSize: '12px', color: '#5a6a7e' },
  dismissBtn: {
    background: 'none', border: 'none',
    color: '#5a6a7e', fontSize: '16px',
    cursor: 'pointer', padding: '4px',
    flexShrink: 0,
  },
  empty: {
    textAlign: 'center',
    color: '#5a6a7e',
    fontSize: '14px',
    padding: '32px 0',
  },
  th: {
    padding: '8px 12px',
    background: '#f8fafc',
    fontSize: '12px',
    fontWeight: '600',
    color: '#5a6a7e',
    textAlign: 'center',
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f0f4f8',
    fontSize: '13px',
    textAlign: 'center',
    color: '#374151',
  },
  statusOk: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: '16px',
  },
  statusMissing: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: '16px',
  },
};
