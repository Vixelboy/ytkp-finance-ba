import { useState, useEffect } from 'react';
import { getMessages, saveMessage, getSettings, saveSettings, getUsers, createUser, deleteUser } from '../lib/store';
import { formatRupiah } from '../lib/format';
import { ChartPanel } from '../lib/adminComponents';

const SC = { SMP:'#2563a8', SMA:'#16a34a', SMK:'#d97706' };

export function GrafikTab({ allTxs, T }) {
  const [chartMode, setChartMode] = useState('monthly');
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
      <ChartPanel allTxs={allTxs} chartMode={chartMode} setChartMode={setChartMode} T={T} />
    </div>
  );
}

export function UserTab({ T }) {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', pin:'', role:'user', school:'SMP' });
  const [msg, setMsg] = useState('');

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const data = await getUsers();
    setUsers(data);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if(!form.name.trim()||!form.pin.trim()) { setMsg('Nama dan PIN wajib diisi'); return; }
    await createUser(form);
    setMsg('User berhasil dibuat!');
    setShowForm(false);
    setForm({ name:'', pin:'', role:'user', school:'SMP' });
    loadUsers();
  }

  async function handleDelete(id) {
    if(!confirm('Hapus user ini?')) return;
    await deleteUser(id);
    loadUsers();
  }

  const inp = { border:`1.5px solid ${T.border}`, borderRadius:'8px', padding:'9px 12px', fontSize:'13px', color:T.text, background:T.input, width:'100%', outline:'none', boxSizing:'border-box' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      {msg && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#166534', borderRadius:'8px', padding:'10px 14px', fontSize:'13px' }}>{msg}</div>}
      <div style={{ background:T.card, borderRadius:'14px', padding:'18px', border:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'700', color:T.text }}>👥 Manajemen Pengguna</h3>
          <button onClick={()=>setShowForm(!showForm)} style={{ background:'#1a3a5c', color:'#fff', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>{showForm?'✕ Batal':'+ User Baru'}</button>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} style={{ background:T.input, borderRadius:'10px', padding:'14px', marginBottom:'14px', display:'flex', flexDirection:'column', gap:'10px' }}>
            <div style={{ fontSize:'13px', fontWeight:'700', color:T.text, marginBottom:'4px' }}>Buat Pengguna Baru</div>
            <input style={inp} placeholder="Nama Pengguna*" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            <input style={inp} placeholder="PIN*" value={form.pin} onChange={e=>setForm({...form,pin:e.target.value})} maxLength={8} />
            <select style={inp} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              <option value="user">User (Bendahara Sekolah)</option>
              <option value="admin">Admin</option>
            </select>
            {form.role==='user' && (
              <select style={inp} value={form.school} onChange={e=>setForm({...form,school:e.target.value})}>
                <option value="SMP">SMP Banjar Asri</option>
                <option value="SMA">SMA Banjar Asri</option>
                <option value="SMK">SMK Banjar Asri</option>
              </select>
            )}
            <button type="submit" style={{ background:'#1a3a5c', color:'#fff', border:'none', borderRadius:'8px', padding:'10px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>Simpan User</button>
          </form>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {users.map(u=>(
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:T.input, borderRadius:'10px', border:`1px solid ${T.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13px', fontWeight:'700', color:T.text }}>{u.name}</div>
                <div style={{ fontSize:'11px', color:T.sub, display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'3px' }}>
                  <span style={{ background:u.role==='admin'?'#fde68a':'#e0f2fe', color:u.role==='admin'?'#92400e':'#0369a1', padding:'1px 8px', borderRadius:'20px', fontWeight:'700', fontSize:'10px' }}>{u.role}</span>
                  {u.school && <span style={{ color:SC[u.school] }}>{u.school} Banjar Asri</span>}
                  <span>PIN: <strong style={{ fontFamily:'monospace', color:T.text }}>{u.pin}</strong></span>
                </div>
              </div>
              {u.role!=='admin' && (
                <button onClick={()=>handleDelete(u.id)} style={{ background:'#fee2e2', border:'none', color:'#dc2626', borderRadius:'6px', padding:'5px 8px', fontSize:'13px', cursor:'pointer' }}>🗑️</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GrupTab({ userId, userName, userRole, userSchool, T }) {
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);

  useEffect(() => { loadMsgs(); }, []);

  async function loadMsgs() {
    const all = await getMessages();
    setMsgs(all.filter(m=>m.type==='group'));
  }

  async function send() {
    if(!text.trim()) return;
    await saveMessage({ type:'group', from:userId, fromName:userName, fromRole:userRole, fromSchool:userSchool, content:text.trim() });
    setText('');
    loadMsgs();
  }

  return (
    <div style={{ background:T.card, borderRadius:'14px', border:`1px solid ${T.border}`, overflow:'hidden' }}>
      <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.border}`, background:T.input }}>
        <div style={{ fontSize:'14px', fontWeight:'700', color:T.text }}>👥 Grup YTKP Banjar Asri</div>
        <div style={{ fontSize:'12px', color:T.sub }}>Pesan grup semua bendahara & admin</div>
      </div>
      <div style={{ height:'320px', overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
        {msgs.length===0 && <div style={{ textAlign:'center', color:T.sub, fontSize:'13px', marginTop:'30px' }}>Belum ada pesan di grup</div>}
        {msgs.map((m,i)=>{
          const isMe = m.from===userId;
          return (
            <div key={i} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:'78%', background:isMe?'#1a3a5c':(T.input), color:isMe?'#fff':T.text, borderRadius:isMe?'12px 4px 12px 12px':'4px 12px 12px 12px', padding:'8px 12px', fontSize:'13px' }}>
                <div style={{ fontSize:'10px', opacity:.7, marginBottom:'3px', fontWeight:'600' }}>{m.from_name} {m.from_school?`(${m.from_school} Banjar Asri)`:''}</div>
                {m.content}
                <div style={{ fontSize:'10px', opacity:.6, marginTop:'3px', textAlign:'right' }}>{new Date(m.created_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding:'10px 12px', borderTop:`1px solid ${T.border}`, display:'flex', gap:'8px' }}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Pesan ke grup..." style={{ flex:1, border:`1.5px solid ${T.border}`, borderRadius:'20px', padding:'8px 14px', fontSize:'13px', color:T.text, background:T.input, outline:'none' }} />
        <button onClick={send} style={{ background:'#1a3a5c', color:'#fff', border:'none', borderRadius:'20px', padding:'8px 16px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>Kirim</button>
      </div>
    </div>
  );
}

export function SettingsTab({ user, theme, toggleTheme, onPrint, T }) {
  const [settings, setSettings] = useState(getSettings());
  const [saved, setSaved] = useState(false);

  function save() {
    saveSettings({ groqApiKey:settings.groqApiKey, adminBackupCode:settings.adminBackupCode });
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  }

  const inp = { border:`1.5px solid ${T.border}`, borderRadius:'8px', padding:'9px 12px', fontSize:'13px', color:T.text, background:T.input, width:'100%', outline:'none', boxSizing:'border-box', fontFamily:'monospace' };
  const row = (label, sub, el) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:`1px solid ${T.border}`, gap:'12px' }}>
      <div><div style={{ fontSize:'13px', fontWeight:'600', color:T.text }}>{label}</div>{sub && <div style={{ fontSize:'11px', color:T.sub, marginTop:'2px' }}>{sub}</div>}</div>
      <div style={{ flexShrink:0 }}>{el}</div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      {saved && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#166534', borderRadius:'8px', padding:'10px 14px', fontSize:'13px' }}>✅ Pengaturan tersimpan!</div>}
      <div style={{ background:T.card, borderRadius:'14px', padding:'18px', border:`1px solid ${T.border}` }}>
        <h3 style={{ fontSize:'14px', fontWeight:'700', color:T.text, marginBottom:'4px' }}>⚙️ Pengaturan Umum</h3>
        {row('Tema Tampilan', `${theme==='dark'?'Mode Gelap':'Mode Terang'} aktif`,
          <button onClick={toggleTheme} style={{ background:T.input, border:`1px solid ${T.border}`, color:T.text, borderRadius:'8px', padding:'7px 14px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>{theme==='dark'?'☀️ Terang':'🌙 Gelap'}</button>
        )}
        {row('Download PDF / Cetak','Cetak laporan semua sekolah',
          <button onClick={onPrint} style={{ background:'#1a3a5c', color:'#fff', border:'none', borderRadius:'8px', padding:'7px 14px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>📄 Cetak</button>
        )}
      </div>
      <div style={{ background:T.card, borderRadius:'14px', padding:'18px', border:`1px solid ${T.border}` }}>
        <h3 style={{ fontSize:'14px', fontWeight:'700', color:T.text, marginBottom:'14px' }}>🔐 Keamanan Admin</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <div>
            <label style={{ fontSize:'12px', fontWeight:'600', color:T.sub, display:'block', marginBottom:'6px' }}>KODE DARURAT ADMIN</label>
            <input style={inp} value={settings.adminBackupCode||''} onChange={e=>setSettings({...settings,adminBackupCode:e.target.value.toUpperCase()})} placeholder="Contoh: YTKP-ADMIN-2026" />
            <div style={{ fontSize:'11px', color:T.sub, marginTop:'4px' }}>💡 Gunakan kode ini jika admin lupa nama/PIN</div>
          </div>
        </div>
      </div>
      <div style={{ background:T.card, borderRadius:'14px', padding:'18px', border:`1px solid ${T.border}` }}>
        <h3 style={{ fontSize:'14px', fontWeight:'700', color:T.text, marginBottom:'14px' }}>🤖 Konfigurasi AI (Groq)</h3>
        <div>
          <label style={{ fontSize:'12px', fontWeight:'600', color:T.sub, display:'block', marginBottom:'6px' }}>GROQ API KEY</label>
          <input style={inp} type="password" value={settings.groqApiKey||''} onChange={e=>setSettings({...settings,groqApiKey:e.target.value})} placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" />
          <div style={{ fontSize:'11px', color:T.sub, marginTop:'4px' }}>Dapatkan gratis di <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color:'#2563a8' }}>console.groq.com</a></div>
        </div>
        <button onClick={save} style={{ marginTop:'14px', background:'linear-gradient(135deg,#1a3a5c,#2563a8)', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'13px', fontWeight:'600', cursor:'pointer', width:'100%' }}>💾 Simpan Pengaturan</button>
      </div>
      <div style={{ background:T.card, borderRadius:'14px', padding:'18px', border:`1px solid ${T.border}` }}>
        <h3 style={{ fontSize:'14px', fontWeight:'700', color:T.text, marginBottom:'14px' }}>❓ Bantuan & CS</h3>
        <p style={{ fontSize:'13px', color:T.sub, marginBottom:'14px', lineHeight:1.6 }}>Hubungi tim Customer Service YTKP Banjar Asri melalui WhatsApp untuk bantuan teknis.</p>
        <a href="https://wa.me/628817835601" target="_blank" rel="noreferrer"
          style={{ display:'flex', alignItems:'center', gap:'10px', background:'#25D366', color:'#fff', borderRadius:'10px', padding:'12px 16px', textDecoration:'none', fontWeight:'600', fontSize:'14px' }}>
          <span style={{ fontSize:'22px' }}>💬</span>Chat WhatsApp CS — 08817835601
        </a>
      </div>
    </div>
  );
}
