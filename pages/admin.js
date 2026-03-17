import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  SCHOOLS, PAYMENT_TYPES, MONTHS, SCHOOL_LABELS,
  getTransactions, filterTransactions, getSummary, getSPPNotifications,
  deleteTransaction, getSettings, saveSettings, askGroqAI,
} from '../lib/store';
import { formatRupiah } from '../lib/format';
import { DashboardTab, TransaksiTab, PesanTab } from '../components/AdminTabs';
import { GrafikTab, UserTab, GrupTab, SettingsTab } from '../components/AdminTabs2';

const TABS = [
  { id:'dashboard', label:'📊 Ringkasan' },
  { id:'transaksi', label:'📋 Transaksi' },
  { id:'grafik', label:'📈 Grafik' },
  { id:'pengguna', label:'👥 Pengguna' },
  { id:'pesan', label:'💬 Pesan' },
  { id:'grup', label:'👫 Grup' },
  { id:'settings', label:'⚙️ Lainnya' },
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allTxs, setAllTxs] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifs, setDismissedNotifs] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [proofModal, setProofModal] = useState(null);
  const [theme, setTheme] = useState('light');

  // Filters
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth().toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // AI
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiHistory, setAiHistory] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = [currentYear-2, currentYear-1, currentYear, currentYear+1];

  useEffect(() => {
    const session = sessionStorage.getItem('ytkp_session');
    if (!session) { router.replace('/'); return; }
    const u = JSON.parse(session);
    if (u.role !== 'admin') { router.replace('/user'); return; }
    setUser(u);
    const s = getSettings();
    setTheme(s.theme || 'light');
    loadData();
  }, []);

  function loadData() {
    const txs = getTransactions();
    setAllTxs(txs);
    setNotifications(getSPPNotifications(txs));
  }

  const filtered = useMemo(() =>
    filterTransactions(allTxs, { school:filterSchool, type:filterType, period:filterPeriod, from:filterFrom, to:filterTo, month:filterMonth, year:filterYear }),
    [allTxs, filterPeriod, filterSchool, filterType, filterFrom, filterTo, filterMonth, filterYear]
  );

  const summary = useMemo(() => getSummary(filtered), [filtered]);
  const activeNotifs = notifications.filter(n => !dismissedNotifs.includes(n.message));

  function handleLogout() { sessionStorage.removeItem('ytkp_session'); router.push('/'); }

  function toggleTheme() {
    const t = theme==='light'?'dark':'light';
    setTheme(t); saveSettings({ theme:t });
  }

  function handleDeleteConfirm(id) {
    deleteTransaction(id);
    setConfirmDelete(null);
    loadData();
  }

  async function handleAsk() {
    if (!aiInput.trim() || aiLoading) return;
    const q = aiInput.trim();
    setAiHistory(h => [...h, { role:'user', content:q }]);
    setAiInput('');
    setAiLoading(true);
    const res = await askGroqAI(q, null);
    setAiLoading(false);
    setAiHistory(h => [...h, { role:'ai', content: res.error ? '⚠️ '+res.error : res.answer }]);
  }

  if (!user) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>Memuat...</div>;

  const isDark = theme === 'dark';
  const T = {
    bg: isDark?'#111827':'#f0f4f8',
    card: isDark?'#1f2937':'#ffffff',
    text: isDark?'#f3f4f6':'#1a2433',
    sub: isDark?'#9ca3af':'#5a6a7e',
    border: isDark?'#374151':'#e8edf2',
    input: isDark?'#374151':'#f9fafb',
    inputBorder: isDark?'#4b5563':'#e2e8f0',
    header: isDark?'#0f172a':'#1a3a5c',
  };

  const periodLabel = { all:'Semua Waktu', today:'Hari Ini', week:'7 Hari', month:'Bulan Ini', year:'Tahun Ini',
    specificMonth:`${MONTHS[parseInt(filterMonth)]} ${filterYear}`,
    custom: filterFrom&&filterTo ? `${filterFrom} – ${filterTo}` : 'Kustom' };

  return (
    <>
      <Head>
        <title>Dashboard Admin — YTKP Banjar Asri</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <style>{`@media print{.no-print{display:none!important}.print-only{display:block!important}}#__next{background:${T.bg}}.print-only{display:none}`}</style>

      <div style={{ minHeight:'100vh', background:T.bg, transition:'background 0.3s' }}>
        {/* Header */}
        <header className="no-print" style={{ background:T.header, position:'sticky', top:0, zIndex:100, boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'38px', height:'38px', background:'rgba(255,255,255,0.1)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                  <path d="M16 2L3 9v6c0 8.5 5.5 16.5 13 19 7.5-2.5 13-10.5 13-19V9L16 2z" fill="#e8a020" opacity="0.3"/>
                  <path d="M16 2L3 9v6c0 8.5 5.5 16.5 13 19 7.5-2.5 13-10.5 13-19V9L16 2z" stroke="#e8a020" strokeWidth="1.5" fill="none"/>
                  <path d="M10 16h12M16 10v12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{ color:'#fff', fontSize:'15px', fontWeight:'700', lineHeight:1.2 }}>YTKP Banjar Asri</div>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'11px' }}>Dashboard Admin</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              {activeNotifs.length > 0 && (
                <div style={{ position:'relative', cursor:'pointer', padding:'6px', fontSize:'18px' }} onClick={()=>setActiveTab('dashboard')}>
                  🔔<span style={{ position:'absolute', top:0, right:0, background:'#dc2626', color:'#fff', fontSize:'9px', fontWeight:'700', width:'16px', height:'16px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>{activeNotifs.length}</span>
                </div>
              )}
              <button onClick={toggleTheme} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.8)', padding:'6px 10px', borderRadius:'8px', fontSize:'13px', cursor:'pointer' }}>{isDark?'☀️':'🌙'}</button>
              <button onClick={handleLogout} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.8)', padding:'6px 12px', borderRadius:'8px', fontSize:'12px', cursor:'pointer' }}>Keluar</button>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'0 8px', display:'flex', borderTop:'1px solid rgba(255,255,255,0.1)', overflowX:'auto' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                style={{ flex:'0 0 auto', background:'none', border:'none', color:activeTab===tab.id?'#f5b942':'rgba(255,255,255,0.6)', padding:'9px 12px', fontSize:'12px', fontWeight:'600', cursor:'pointer', borderBottom:`2px solid ${activeTab===tab.id?'#f5b942':'transparent'}`, whiteSpace:'nowrap', transition:'all 0.15s' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main style={{ padding:'14px', maxWidth:'1100px', margin:'0 auto' }}>

          {/* Filter Bar — show on dashboard/transaksi/grafik */}
          {['dashboard','transaksi','grafik'].includes(activeTab) && (
            <div className="no-print" style={{ background:T.card, borderRadius:'12px', padding:'14px', marginBottom:'14px', border:`1px solid ${T.border}`, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'10px', marginBottom:'10px' }}>
                {[
                  <div key="p" style={{ display:'flex', flexDirection:'column', gap:'4px', flex:'1 1 130px', minWidth:'120px' }}>
                    <label style={{ fontSize:'10px', fontWeight:'700', color:T.sub, textTransform:'uppercase', letterSpacing:'0.5px' }}>Periode</label>
                    <select value={filterPeriod} onChange={e=>setFilterPeriod(e.target.value)} style={{ border:`1.5px solid ${T.inputBorder}`, borderRadius:'8px', padding:'7px 10px', fontSize:'12px', color:T.text, background:T.input, outline:'none' }}>
                      <option value="all">Semua Waktu</option><option value="today">Hari Ini</option>
                      <option value="week">7 Hari Terakhir</option><option value="month">Bulan Ini</option>
                      <option value="year">Tahun Ini</option><option value="specificMonth">Pilih Bulan</option>
                      <option value="custom">Rentang Tanggal</option>
                    </select>
                  </div>,
                  filterPeriod==='specificMonth' && <>
                    <div key="sm" style={{ display:'flex', flexDirection:'column', gap:'4px', flex:'1 1 100px' }}>
                      <label style={{ fontSize:'10px', fontWeight:'700', color:T.sub, textTransform:'uppercase', letterSpacing:'0.5px' }}>Bulan</label>
                      <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{ border:`1.5px solid ${T.inputBorder}`, borderRadius:'8px', padding:'7px 10px', fontSize:'12px', color:T.text, background:T.input, outline:'none' }}>
                        {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
                      </select>
                    </div>
                    <div key="sy" style={{ display:'flex', flexDirection:'column', gap:'4px', flex:'1 1 80px' }}>
                      <label style={{ fontSize:'10px', fontWeight:'700', color:T.sub, textTransform:'uppercase', letterSpacing:'0.5px' }}>Tahun</label>
                      <select value={filterYear} onChange={e=>setFilterYear(e.target.value)} style={{ border:`1.5px solid ${T.inputBorder}`, borderRadius:'8px', padding:'7px 10px', fontSize:'12px', color:T.text, background:T.input, outline:'none' }}>
                        {years.map(y=><option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </>,
                  filterPeriod==='custom' && <>
                    <div key="cf" style={{ display:'flex', flexDirection:'column', gap:'4px', flex:'1 1 120px' }}>
                      <label style={{ fontSize:'10px', fontWeight:'700', color:T.sub, textTransform:'uppercase', letterSpacing:'0.5px' }}>Dari</label>
                      <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} style={{ border:`1.5px solid ${T.inputBorder}`, borderRadius:'8px', padding:'7px 10px', fontSize:'12px', color:T.text, background:T.input, outline:'none' }} />
                    </div>
                    <div key="ct" style={{ display:'flex', flexDirection:'column', gap:'4px', flex:'1 1 120px' }}>
                      <label style={{ fontSize:'10px', fontWeight:'700', color:T.sub, textTransform:'uppercase', letterSpacing:'0.5px' }}>Sampai</label>
                      <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} style={{ border:`1.5px solid ${T.inputBorder}`, borderRadius:'8px', padding:'7px 10px', fontSize:'12px', color:T.text, background:T.input, outline:'none' }} />
                    </div>
                  </>,
                  <div key="s" style={{ display:'flex', flexDirection:'column', gap:'4px', flex:'1 1 130px', minWidth:'120px' }}>
                    <label style={{ fontSize:'10px', fontWeight:'700', color:T.sub, textTransform:'uppercase', letterSpacing:'0.5px' }}>Sekolah</label>
                    <select value={filterSchool} onChange={e=>setFilterSchool(e.target.value)} style={{ border:`1.5px solid ${T.inputBorder}`, borderRadius:'8px', padding:'7px 10px', fontSize:'12px', color:T.text, background:T.input, outline:'none' }}>
                      <option value="">Semua Sekolah</option>
                      {SCHOOLS.map(s=><option key={s} value={s}>{SCHOOL_LABELS[s]}</option>)}
                    </select>
                  </div>,
                  <div key="t" style={{ display:'flex', flexDirection:'column', gap:'4px', flex:'1 1 130px', minWidth:'120px' }}>
                    <label style={{ fontSize:'10px', fontWeight:'700', color:T.sub, textTransform:'uppercase', letterSpacing:'0.5px' }}>Jenis</label>
                    <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ border:`1.5px solid ${T.inputBorder}`, borderRadius:'8px', padding:'7px 10px', fontSize:'12px', color:T.text, background:T.input, outline:'none' }}>
                      <option value="">Semua Jenis</option>
                      {PAYMENT_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>,
                ]}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'8px', borderTop:`1px solid ${T.border}` }}>
                <span style={{ fontSize:'12px', color:T.sub }}>Menampilkan: <strong style={{ color:T.text }}>{periodLabel[filterPeriod]}</strong>{filterSchool?` · ${SCHOOL_LABELS[filterSchool]||filterSchool}`:''}</span>
                <span style={{ fontSize:'11px', color:'#1a3a5c', fontWeight:'600', background:'#e8f0fe', padding:'2px 10px', borderRadius:'12px' }}>{filtered.length} transaksi</span>
              </div>
            </div>
          )}

          {/* Notification strip */}
          {activeTab==='dashboard' && activeNotifs.length>0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'14px' }}>
              {activeNotifs.slice(0,2).map((n,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', borderLeft:`4px solid ${n.severity==='danger'?'#dc2626':'#d97706'}`, background:n.severity==='danger'?'#fef2f2':'#fffbeb', borderRadius:'8px', padding:'10px 14px' }}>
                  <span style={{ fontSize:'13px', color:'#1a2433' }}>{n.severity==='danger'?'🔴':'🟡'} {n.message}</span>
                  <button onClick={()=>setDismissedNotifs([...dismissedNotifs,n.message])} style={{ background:'none', border:'none', color:'#5a6a7e', cursor:'pointer', fontSize:'15px' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {activeTab==='dashboard' && <DashboardTab filtered={filtered} summary={summary} allTxs={allTxs} setActiveTab={setActiveTab} T={T} />}
          {activeTab==='transaksi' && <TransaksiTab filtered={filtered} summary={summary} onDelete={id=>setConfirmDelete(id)} onViewProof={img=>setProofModal(img)} T={T} />}
          {activeTab==='grafik' && <GrafikTab allTxs={filtered} T={T} />}
          {activeTab==='pengguna' && <UserTab T={T} />}
          {activeTab==='pesan' && user && <PesanTab T={T} adminId={user.id} adminName={user.name} />}
          {activeTab==='grup' && user && <GrupTab userId={user.id} userName={user.name} userRole="admin" userSchool={null} T={T} />}
          {activeTab==='settings' && user && <SettingsTab user={user} theme={theme} toggleTheme={toggleTheme} onPrint={()=>window.print()} T={T} />}
        </main>

        {/* AI Float */}
        <button className="no-print" onClick={()=>setShowAI(true)} title="Tanya AI YTKP"
          style={{ position:'fixed', bottom:'24px', right:'20px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:'50%', width:'52px', height:'52px', fontSize:'22px', cursor:'pointer', boxShadow:'0 4px 16px rgba(109,40,217,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          🤖
        </button>

        {/* AI Panel */}
        {showAI && (
          <div style={{ position:'fixed', bottom:'90px', right:'16px', width:'320px', maxWidth:'calc(100vw - 32px)', background:T.card, borderRadius:'16px', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', border:`1px solid ${T.border}`, zIndex:300, display:'flex', flexDirection:'column', maxHeight:'440px' }}>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius:'16px 16px 0 0' }}>
              <div><div style={{ fontSize:'14px', fontWeight:'700', color:'#fff' }}>🤖 Asisten AI YTKP</div><div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)' }}>Tanya seputar keuangan yayasan</div></div>
              <button onClick={()=>setShowAI(false)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', borderRadius:'6px', padding:'4px 8px', cursor:'pointer', fontSize:'13px' }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:'8px', minHeight:'180px' }}>
              {aiHistory.length===0 && (
                <div style={{ textAlign:'center', padding:'16px 10px' }}>
                  <div style={{ fontSize:'28px', marginBottom:'8px' }}>🤖</div>
                  <div style={{ fontSize:'12px', color:T.sub }}>Halo Admin! Tanya saya seputar keuangan, laporan, atau panduan sistem YTKP.</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px', marginTop:'10px' }}>
                    {['Rekap keuangan bulan ini?','Cara membuat user baru?','Info rekening yayasan?'].map(q=>(
                      <button key={q} onClick={()=>setAiInput(q)} style={{ background:isDark?'#374151':'#f0f4f8', border:`1px solid ${T.border}`, borderRadius:'7px', padding:'6px 10px', fontSize:'11px', color:T.text, cursor:'pointer', textAlign:'left' }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {aiHistory.map((h,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:h.role==='user'?'flex-end':'flex-start' }}>
                  <div style={{ maxWidth:'85%', background:h.role==='user'?'#7c3aed':(isDark?'#374151':'#f0f4f8'), color:h.role==='user'?'#fff':T.text, borderRadius:h.role==='user'?'12px 4px 12px 12px':'4px 12px 12px 12px', padding:'8px 12px', fontSize:'12px', lineHeight:1.5 }}>{h.content}</div>
                </div>
              ))}
              {aiLoading && <div style={{ display:'flex' }}><div style={{ background:isDark?'#374151':'#f0f4f8', borderRadius:'4px 12px 12px 12px', padding:'8px 14px', fontSize:'18px' }}>⏳</div></div>}
            </div>
            <div style={{ padding:'10px 12px', borderTop:`1px solid ${T.border}`, display:'flex', gap:'8px' }}>
              <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAsk()} placeholder="Ketik pertanyaan..." style={{ flex:1, border:`1.5px solid ${T.border}`, borderRadius:'20px', padding:'8px 12px', fontSize:'12px', color:T.text, background:T.input, outline:'none' }} />
              <button onClick={handleAsk} disabled={aiLoading} style={{ background:'#7c3aed', color:'#fff', border:'none', borderRadius:'20px', padding:'8px 14px', fontSize:'12px', fontWeight:'600', cursor:'pointer', opacity:aiLoading?0.6:1 }}>➤</button>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        {confirmDelete && (
          <div onClick={()=>setConfirmDelete(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
            <div onClick={e=>e.stopPropagation()} style={{ background:T.card, borderRadius:'16px', padding:'24px', maxWidth:'340px', width:'100%', boxShadow:'0 20px 40px rgba(0,0,0,0.3)', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:'36px', textAlign:'center', marginBottom:'12px' }}>🗑️</div>
              <h3 style={{ fontSize:'16px', fontWeight:'700', color:T.text, textAlign:'center', marginBottom:'8px' }}>Hapus Transaksi?</h3>
              <p style={{ fontSize:'13px', color:T.sub, textAlign:'center', marginBottom:'20px' }}>Tindakan ini tidak bisa dibatalkan. Data transaksi akan dihapus permanen.</p>
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={()=>setConfirmDelete(null)} style={{ flex:1, background:isDark?'#374151':'#f0f4f8', border:`1px solid ${T.border}`, color:T.text, borderRadius:'10px', padding:'12px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>Batal</button>
                <button onClick={()=>handleDeleteConfirm(confirmDelete)} style={{ flex:1, background:'#dc2626', color:'#fff', border:'none', borderRadius:'10px', padding:'12px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>Ya, Hapus</button>
              </div>
            </div>
          </div>
        )}

        {/* Proof Modal */}
        {proofModal && (
          <div onClick={()=>setProofModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
            <img src={proofModal} alt="Bukti TF" style={{ maxWidth:'100%', maxHeight:'90vh', borderRadius:'12px', boxShadow:'0 0 40px rgba(0,0,0,0.5)' }} />
            <button onClick={()=>setProofModal(null)} style={{ position:'absolute', top:'20px', right:'20px', background:'#fff', border:'none', borderRadius:'50%', width:'36px', height:'36px', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>
        )}

        {/* Print area */}
        <div className="print-only" style={{ padding:'20px' }}>
          <h1>Laporan Keuangan — YTKP Banjar Asri</h1>
          <p>Dicetak: {new Date().toLocaleDateString('id-ID',{dateStyle:'full'})} | Admin: {user?.name}</p>
          <table style={{ width:'100%', borderCollapse:'collapse', marginTop:'16px', fontSize:'12px' }}>
            <thead>
              <tr style={{ background:'#f0f4f8' }}>
                {['No','Sekolah','Jenis','Nominal','Periode','Tgl Transfer','Keterangan'].map(h=>(
                  <th key={h} style={{ border:'1px solid #ddd', padding:'7px', textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx,i)=>{
                const ti = PAYMENT_TYPES.find(t=>t.id===tx.paymentType);
                return (
                  <tr key={tx.id}>
                    <td style={{ border:'1px solid #ddd', padding:'7px' }}>{i+1}</td>
                    <td style={{ border:'1px solid #ddd', padding:'7px' }}>{SCHOOL_LABELS[tx.school]||tx.school}</td>
                    <td style={{ border:'1px solid #ddd', padding:'7px' }}>{ti?.label}</td>
                    <td style={{ border:'1px solid #ddd', padding:'7px' }}>{formatRupiah(tx.amount)}</td>
                    <td style={{ border:'1px solid #ddd', padding:'7px' }}>{MONTHS[tx.month]} {tx.year}</td>
                    <td style={{ border:'1px solid #ddd', padding:'7px' }}>{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                    <td style={{ border:'1px solid #ddd', padding:'7px' }}>{tx.note||'-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop:'14px', fontWeight:'bold', fontSize:'14px' }}>
            Total: {formatRupiah(summary.total)} | {filtered.length} Transaksi
          </div>
        </div>
      </div>
    </>
  );
}
