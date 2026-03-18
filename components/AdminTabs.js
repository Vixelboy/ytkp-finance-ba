import { PAYMENT_TYPES, MONTHS, SCHOOL_LABELS, deleteTransaction, getMessages, saveMessage, getSettings, saveSettings, getUsers, createUser, deleteUser, askGroqAI } from '../lib/store';
import { formatRupiah } from '../lib/format';
import { ChartPanel, TxRow, SPPGrid } from '../lib/adminComponents';
import { useState, useRef, useEffect } from 'react';

const SC = { SMP:'#2563a8', SMA:'#16a34a', SMK:'#d97706' };
const SB = { SMP:'#eff6ff', SMA:'#f0fdf4', SMK:'#fffbeb' };

export function DashboardTab({ filtered, summary, allTxs, setActiveTab, T }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
      <div style={{ background:'linear-gradient(135deg,#1a3a5c,#2563a8)', borderRadius:'16px', padding:'24px', color:'#fff', textAlign:'center' }}>
        <div style={{ fontSize:'13px', opacity:.7, marginBottom:'6px' }}>Total Dana Masuk</div>
        <div style={{ fontSize:'32px', fontWeight:'800', letterSpacing:'-1px', marginBottom:'4px' }}>{formatRupiah(summary.total)}</div>
        <div style={{ fontSize:'12px', opacity:.6 }}>{filtered.length} transaksi</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'10px' }}>
        {['SMP','SMA','SMK'].map(s=>(
          <div key={s} style={{ background:T.card, borderRadius:'12px', padding:'14px', border:`1px solid ${T.border}`, borderTop:`3px solid ${SC[s]}` }}>
            <div style={{ display:'inline-block', background:SB[s], color:SC[s], fontSize:'11px', fontWeight:'700', padding:'2px 10px', borderRadius:'20px', marginBottom:'8px' }}>{SCHOOL_LABELS[s]}</div>
            <div style={{ fontSize:'18px', fontWeight:'700', color:T.text }}>{formatRupiah(summary[s]||0)}</div>
            <div style={{ fontSize:'11px', color:T.sub }}>{filtered.filter(t=>t.school===s).length} transaksi</div>
            {summary.total>0 && <div style={{ height:'4px', background:T.border, borderRadius:'2px', marginTop:'8px' }}><div style={{ height:'100%', width:`${Math.round((summary[s]||0)/summary.total*100)}%`, background:SC[s], borderRadius:'2px' }} /></div>}
          </div>
        ))}
      </div>
      <div style={{ background:T.card, borderRadius:'14px', padding:'18px', border:`1px solid ${T.border}` }}>
        <h3 style={{ fontSize:'14px', fontWeight:'700', color:T.text, marginBottom:'12px' }}>Rincian per Jenis Setoran</h3>
        {PAYMENT_TYPES.map(type=>{
          const tot=filtered.filter(t=>t.paymentType===type.id).reduce((a,t)=>a+t.amount,0);
          if(!tot) return null;
          return (
            <div key={type.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:'20px', width:'28px', textAlign:'center' }}>{type.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'12px', fontWeight:'600', color:T.text, marginBottom:'3px' }}>{type.label}</div>
                <div style={{ height:'4px', background:T.border, borderRadius:'2px' }}><div style={{ height:'100%', width:`${summary.total>0?tot/summary.total*100:0}%`, background:'#2563a8', borderRadius:'2px' }} /></div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'12px', fontWeight:'700', color:T.text }}>{formatRupiah(tot)}</div>
                <div style={{ fontSize:'10px', color:T.sub }}>{filtered.filter(t=>t.paymentType===type.id).length}x</div>
              </div>
            </div>
          );
        })}
        {filtered.length===0 && <div style={{ textAlign:'center', color:T.sub, padding:'20px 0', fontSize:'13px' }}>Tidak ada data</div>}
      </div>
      <div style={{ background:T.card, borderRadius:'14px', padding:'18px', border:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'700', color:T.text }}>Transaksi Terbaru</h3>
          <button onClick={()=>setActiveTab('transaksi')} style={{ background:'none', border:'none', color:'#2563a8', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>Lihat Semua →</button>
        </div>
        {filtered.slice(0,5).map(tx=><TxRow key={tx.id} tx={tx} T={T} />)}
        {filtered.length===0 && <div style={{ textAlign:'center', color:T.sub, padding:'20px 0', fontSize:'13px' }}>Belum ada transaksi</div>}
      </div>
      <div style={{ background:T.card, borderRadius:'14px', padding:'18px', border:`1px solid ${T.border}` }}>
        <h3 style={{ fontSize:'14px', fontWeight:'700', color:T.text, marginBottom:'12px' }}>Status SPP 3 Bulan Terakhir</h3>
        <SPPGrid txs={allTxs} T={T} />
      </div>
    </div>
  );
}

export function TransaksiTab({ filtered, summary, onDelete, onViewProof, T }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      <div style={{ background:T.card, borderRadius:'14px', padding:'18px', border:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'700', color:T.text }}>Semua Transaksi</h3>
          <span style={{ background:'#1a3a5c', color:'#fff', fontSize:'11px', fontWeight:'600', padding:'2px 10px', borderRadius:'12px' }}>{filtered.length}</span>
        </div>
        {filtered.length===0 ? (
          <div style={{ textAlign:'center', color:T.sub, padding:'40px 0' }}><div style={{ fontSize:'36px', marginBottom:'8px' }}>📭</div>Tidak ada transaksi</div>
        ) : filtered.map(tx=><TxRow key={tx.id} tx={tx} expanded onDelete={onDelete} onViewProof={onViewProof} T={T} />)}
      </div>
      {filtered.length>0 && (
        <div style={{ background:'#1a3a5c', borderRadius:'12px', padding:'14px 18px', display:'flex', flexWrap:'wrap', gap:'14px' }}>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,.7)' }}>Total {filtered.length} transaksi<strong style={{ display:'block', color:'#fff', fontSize:'14px' }}>{formatRupiah(summary.total)}</strong></div>
          {['SMP','SMA','SMK'].map(s=>summary[s]>0 ? (
            <div key={s} style={{ fontSize:'12px', color:SC[s] }}>{SCHOOL_LABELS[s]}<strong style={{ display:'block', color:'#fff', fontSize:'13px' }}>{formatRupiah(summary[s])}</strong></div>
          ):null)}
        </div>
      )}
    </div>
  );
}

export function PesanTab({ T, adminId, adminName }) {
  const [selected, setSelected] = useState('SMP');
  const [text, setText] = useState('');
  const [allMsgs, setAllMsgs] = useState([]);
  const endRef = useRef(null);

  useEffect(() => { loadMsgs(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [selected, allMsgs]);

  async function loadMsgs() {
    const msgs = await getMessages();
    setAllMsgs(msgs);
  }

  const conv = allMsgs.filter(m=>m.type==='direct' && (m.to_school===selected||m.from_school===selected));

  async function send() {
    if(!text.trim()) return;
    await saveMessage({ type:'direct', from:adminId, fromName:adminName, fromRole:'admin', toSchool:selected, content:text.trim() });
    setText('');
    loadMsgs();
  }

  return (
    <div style={{ background:T.card, borderRadius:'14px', border:`1px solid ${T.border}`, overflow:'hidden' }}>
      <div style={{ display:'flex', borderBottom:`1px solid ${T.border}` }}>
        {['SMP','SMA','SMK'].map(s=>(
          <button key={s} onClick={()=>setSelected(s)} style={{ flex:1, padding:'10px', border:'none', background:selected===s?SC[s]:(T.input), color:selected===s?'#fff':T.sub, fontWeight:'700', cursor:'pointer', fontSize:'12px', borderRight:`1px solid ${T.border}` }}>{SCHOOL_LABELS[s]}</button>
        ))}
      </div>
      <div style={{ height:'300px', overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
        {conv.length===0 && <div style={{ textAlign:'center', color:T.sub, fontSize:'13px', marginTop:'30px' }}>Belum ada pesan dari {SCHOOL_LABELS[selected]}</div>}
        {conv.map((m,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:m.from_role==='admin'?'flex-end':'flex-start' }}>
            <div style={{ maxWidth:'78%', background:m.from_role==='admin'?SC[selected]:(T.input), color:m.from_role==='admin'?'#fff':T.text, borderRadius:m.from_role==='admin'?'12px 4px 12px 12px':'4px 12px 12px 12px', padding:'8px 12px', fontSize:'13px' }}>
              <div style={{ fontSize:'10px', opacity:.7, marginBottom:'3px', fontWeight:'600' }}>{m.from_name}</div>
              {m.content}
              <div style={{ fontSize:'10px', opacity:.6, marginTop:'3px', textAlign:'right' }}>{new Date(m.created_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ padding:'10px 12px', borderTop:`1px solid ${T.border}`, display:'flex', gap:'8px' }}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={`Balas ke ${SCHOOL_LABELS[selected]}...`} style={{ flex:1, border:`1.5px solid ${T.border}`, borderRadius:'20px', padding:'8px 14px', fontSize:'13px', color:T.text, background:T.input, outline:'none' }} />
        <button onClick={send} style={{ background:SC[selected], color:'#fff', border:'none', borderRadius:'20px', padding:'8px 16px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>Kirim</button>
      </div>
    </div>
  );
}
