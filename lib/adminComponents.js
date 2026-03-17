import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PAYMENT_TYPES, MONTHS, SCHOOL_LABELS } from './store';
import { formatRupiah, formatDate } from './format';

const SC = { SMP: '#2563a8', SMA: '#16a34a', SMK: '#d97706' };
const SB = { SMP: '#eff6ff', SMA: '#f0fdf4', SMK: '#fffbeb' };

function fmt(v) { return v >= 1e6 ? `${(v/1e6).toFixed(1)}Jt` : v >= 1e3 ? `${(v/1e3).toFixed(0)}Rb` : v; }

export function ChartPanel({ allTxs, chartMode, setChartMode, T }) {
  const now = new Date();

  function monthly() {
    const out = [];
    for (let i = 11; i >= 0; i--) {
      let m = now.getMonth() - i, y = now.getFullYear();
      while (m < 0) { m += 12; y--; }
      const row = { label: `${MONTHS[m].slice(0,3)}'${String(y).slice(2)}` };
      let tot = 0;
      ['SMP','SMA','SMK'].forEach(s => {
        const v = allTxs.filter(tx => { const d = new Date(tx.date); return tx.school===s && d.getMonth()===m && d.getFullYear()===y; }).reduce((a,t)=>a+t.amount,0);
        row[s] = v; tot += v;
      });
      row.total = tot;
      out.push(row);
    }
    return out;
  }

  function weekly() {
    const out = [];
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(now); ws.setDate(now.getDate() - i*7 - now.getDay()); ws.setHours(0,0,0,0);
      const we = new Date(ws); we.setDate(ws.getDate()+6); we.setHours(23,59,59);
      const total = allTxs.filter(tx => { const d = new Date(tx.date); return d>=ws && d<=we; }).reduce((a,t)=>a+t.amount,0);
      out.push({ label: `${ws.getDate()}/${ws.getMonth()+1}`, total });
    }
    return out;
  }

  function yearly() {
    const map = {};
    allTxs.forEach(tx => { const y = new Date(tx.date).getFullYear(); map[y]=(map[y]||0)+tx.amount; });
    return Object.entries(map).sort().map(([y,v])=>({ label: y, total: v }));
  }

  const data = chartMode==='monthly' ? monthly() : chartMode==='weekly' ? weekly() : chartMode==='yearly' ? yearly() : (() => {
    const m = monthly(); return m.map(r=>({ label: r.label, total: r.total }));
  })();

  const total = data.reduce((a,r)=>a+(r.total||0),0);

  return (
    <div style={{ background: T.card, borderRadius: '14px', padding: '20px', border: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: T.text }}>📊 Grafik Pendapatan</div>
          <div style={{ fontSize: '12px', color: T.sub }}>Total: <strong style={{ color: '#16a34a' }}>{formatRupiah(total)}</strong></div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[['weekly','Mingguan'],['monthly','Bulanan'],['yearly','Tahunan'],['alltime','All Time']].map(([k,l])=>(
            <button key={k} onClick={()=>setChartMode(k)} style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '600', border: 'none', borderRadius: '6px', cursor: 'pointer', background: chartMode===k ? '#1a3a5c' : (T.input), color: chartMode===k ? '#fff' : T.sub }}>{l}</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        {chartMode === 'monthly' ? (
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: T.sub }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: T.sub }} />
            <Tooltip formatter={(v)=>formatRupiah(v)} contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {['SMP','SMA','SMK'].map(s=><Bar key={s} dataKey={s} fill={SC[s]} name={SCHOOL_LABELS[s]} radius={[3,3,0,0]} />)}
          </BarChart>
        ) : chartMode === 'alltime' ? (
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: T.sub }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: T.sub }} />
            <Tooltip formatter={(v)=>formatRupiah(v)} contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', fontSize: '12px' }} />
            <Area type="monotone" dataKey="total" fill="#2563a820" stroke="#2563a8" strokeWidth={2} name="Total" />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: T.sub }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: T.sub }} />
            <Tooltip formatter={(v)=>formatRupiah(v)} contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="total" fill="#2563a8" name="Total" radius={[3,3,0,0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function TxRow({ tx, onDelete, onViewProof, expanded, T }) {
  const ti = PAYMENT_TYPES.find(t => t.id === tx.paymentType);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: SC[tx.school]||'#888', marginTop: '6px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: T.text }}>{ti?.icon} {ti?.label || tx.paymentType}</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#16a34a' }}>{formatRupiah(tx.amount)}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: T.sub, alignItems: 'center' }}>
          <span style={{ background: SB[tx.school], color: SC[tx.school], fontWeight: '700', padding: '1px 8px', borderRadius: '10px', fontSize: '10px' }}>{SCHOOL_LABELS[tx.school]||tx.school}</span>
          <span>{MONTHS[tx.month]} {tx.year}</span>
          <span>Transfer: {formatDate(tx.date)}</span>
          {expanded && tx.submittedBy && <span>oleh {tx.submittedBy}</span>}
        </div>
        {expanded && tx.note && <div style={{ fontSize: '11px', color: T.sub, marginTop: '4px' }}>📝 {tx.note}</div>}
        {expanded && tx.rekening && <div style={{ fontSize: '11px', color: T.sub, marginTop: '2px' }}>🏦 {tx.rekening}</div>}
        {expanded && tx.proofImage && (
          <div style={{ marginTop: '6px' }}>
            <img src={tx.proofImage} alt="Bukti" style={{ maxHeight: '80px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${T.border}` }} onClick={() => onViewProof(tx.proofImage)} />
            <div style={{ fontSize: '10px', color: '#2563a8', marginTop: '2px' }}>📎 Lihat bukti TF</div>
          </div>
        )}
      </div>
      {onDelete && (
        <button onClick={() => onDelete(tx.id)} title="Hapus transaksi" style={{ flexShrink: 0, background: '#fee2e2', border: 'none', color: '#dc2626', borderRadius: '6px', padding: '5px 8px', fontSize: '14px', cursor: 'pointer' }}>🗑️</button>
      )}
    </div>
  );
}

export function SPPGrid({ txs, T }) {
  const now = new Date();
  const months = [];
  for (let i = 2; i >= 0; i--) {
    let m = now.getMonth() - i, y = now.getFullYear();
    if (m < 0) { m += 12; y--; }
    months.push({ m, y });
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px', background: T.input, color: T.sub, textAlign: 'left', borderBottom: `1px solid ${T.border}` }}>Sekolah</th>
            {months.map(({ m, y }) => (
              <th key={`${m}-${y}`} style={{ padding: '8px', background: T.input, color: T.sub, textAlign: 'center', borderBottom: `1px solid ${T.border}` }}>
                {MONTHS[m].slice(0,3)} {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {['SMP','SMA','SMK'].map(s => (
            <tr key={s}>
              <td style={{ padding: '10px 8px', borderBottom: `1px solid ${T.border}`, fontWeight: '600', color: SC[s] }}>{SCHOOL_LABELS[s]}</td>
              {months.map(({ m, y }) => {
                const ok = txs.some(tx => { const d=new Date(tx.date); return tx.school===s && tx.paymentType==='spp' && d.getMonth()===m && d.getFullYear()===y; });
                const tot = txs.filter(tx => { const d=new Date(tx.date); return tx.school===s && tx.paymentType==='spp' && d.getMonth()===m && d.getFullYear()===y; }).reduce((a,t)=>a+t.amount,0);
                return (
                  <td key={`${m}-${y}`} style={{ padding: '10px 8px', textAlign: 'center', borderBottom: `1px solid ${T.border}` }}>
                    {ok ? <div><div style={{ color: '#16a34a', fontWeight: '700', fontSize: '15px' }}>✓</div><div style={{ fontSize: '10px', color: '#16a34a' }}>{formatRupiah(tot)}</div></div>
                        : <div style={{ color: '#dc2626', fontWeight: '700', fontSize: '15px' }}>✗</div>}
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
