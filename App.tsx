import { useEffect, useMemo, useState } from 'react'
import { HashRouter, Routes, Route, NavLink, Navigate, Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Usage, History, Plan, Notifs, Help, Survey, Admin } from './Extra'
import { buildBill, history, fmt, log, register, type Bill, type User } from './lib'

const load = (): User | null => { try { return JSON.parse(localStorage.getItem('mm_user') || 'null') } catch { return null } }
const fechaVence = (d: string) => `${+d.slice(8)} de noviembre de 2026`

export default function App() {
  const [user, setUser] = useState<User | null>(load)
  const [paid, setPaid] = useState(false)
  const bill = useMemo(() => (user ? buildBill(user.phone) : null), [user])
  const out = () => { log(user, 'logout'); localStorage.removeItem('mm_user'); setUser(null); setPaid(false) }
  return (
    <HashRouter>
      <div className="phone"><Routes><Route path="/admin" element={<Admin />} /><Route path="*" element={!user || !bill ? <Register onDone={u => { localStorage.setItem('mm_user', JSON.stringify(u)); setUser(u) }} /> : <Shell user={user} bill={bill} paid={paid} setPaid={setPaid} out={out} />} /></Routes></div>
    </HashRouter>
  )
}

function Register({ onDone }: { onDone: (u: User) => void }) {
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (name.trim().length < 2) return setErr('Escribe tu nombre (mínimo 2 letras).')
    if (!/^9\d{8}$/.test(phone)) return setErr('El celular debe tener 9 dígitos y empezar con 9.')
    setBusy(true); const pid = await register(name.trim(), phone, buildBill(phone)); const u = { name: name.trim(), phone, pid }
    log(u, 'register', 'registro'); onDone(u)
  }
  return (<div className="scroll"><div className="wordmark">movi<b>prototipo</b></div><h1>Bienvenido</h1>
    <div className="notice">Prototipo académico del curso Creatividad Empresarial. <b>No es la app oficial de Movistar.</b> Guardamos solo tu nombre, celular y cómo usas el prototipo, únicamente para esta prueba. Los datos del recibo son ilustrativos.</div>
    <label>Nombre<input value={name} maxLength={40} onChange={e => setName(e.target.value)} autoComplete="name" /></label>
    <label>Celular (+51)<input value={phone} inputMode="numeric" maxLength={9} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="9XXXXXXXX" /></label>
    {err && <p className="err" role="alert">{err}</p>}<button className="btn" disabled={busy} onClick={submit}>{busy ? 'Ingresando…' : 'Ingresar'}</button></div>)
}

function Shell({ user, bill, paid, setPaid, out }: { user: User; bill: Bill; paid: boolean; setPaid: (b: boolean) => void; out: () => void }) {
  const loc = useLocation()
  useEffect(() => { log(user, 'screen_view', loc.pathname) }, [loc.pathname])
  const p = { user, bill, paid }
  return (<>
    <Routes>
      <Route path="/" element={<Home {...p} />} /><Route path="/recibo" element={<Detail {...p} />} />
      <Route path="/comparar" element={<Compare {...p} />} /><Route path="/por-que" element={<Why {...p} />} />
      <Route path="/pagar" element={<Pay {...p} setPaid={setPaid} />} />
      <Route path="/perfil" element={<Profile user={user} out={out} />} /><Route path="/consumo" element={<Usage {...p} />} /><Route path="/historial/:i" element={<HDetail {...p} />} /><Route path="/historial" element={<History {...p} />} /><Route path="/plan" element={<Plan {...p} />} /><Route path="/avisos" element={<Notifs />} /><Route path="/ayuda" element={<Help {...p} />} /><Route path="/encuesta" element={<Survey {...p} />} /><Route path="*" element={<Navigate to="/" />} />
    </Routes>
    <nav>{[['/', 'Inicio'], ['/recibo', 'Mi recibo'], ['/comparar', 'Comparar'], ['/consumo', 'Consumo'], ['/perfil', 'Perfil']].map(([to, l]) => <NavLink key={to} to={to} end>{l}</NavLink>)}</nav></>)
}
type P = { user: User; bill: Bill; paid: boolean }
const diff = (b: Bill) => Math.round((b.total - b.prev_total) * 100) / 100

function Home({ user, bill, paid }: P) {
  const d = diff(bill)
  return (<><header><div className="wordmark">movi<b>prototipo</b></div><h1>¡Hola, {user.name.split(' ')[0]}!</h1></header>
    <div className="scroll">
      {d !== 0 && <Link to="/por-que" className="promo" onClick={() => log(user, 'why_up_open', 'inicio')}>Tu recibo {d > 0 ? 'subió' : 'bajó'} {fmt(Math.abs(d))} · ¿Por qué? →</Link>}
      <div className="card"><div className="row"><h3>Recibo de octubre de 2026</h3><span className={'badge' + (paid ? ' ok' : '')}>{paid ? 'Pagado' : 'Pendiente'}</span></div>
        <p className="mute">Total a pagar</p><div className="big">{fmt(bill.total)}</div><p className="mute">Vence el {fechaVence(bill.due_date)}</p>
        <Link className="btn" to="/recibo">Ver detalle</Link>{!paid && <Link className="btn ghost" to="/pagar">Pagar (simulado)</Link>}</div>
      <div className="chips">{[['/historial', 'Historial'], ['/plan', 'Mi plan'], ['/ayuda', 'Ayuda'], ['/avisos', 'Avisos']].map(([to, l]) => <Link key={to} className="chip" to={to}>{l}</Link>)}</div>
      <p className="foot">Prototipo académico, no es la app oficial de Movistar.</p></div></>)
}

function HDetail({ user, bill }: P) {
  const { i } = useParams(); const m = history(bill, user.phone)[+(i ?? 5)] ?? history(bill, user.phone)[5]
  return <Detail user={user} paid={false} label={m.label} bill={{ ...bill, total: m.total, items: m.items.filter(x => x.amount > 0) }} />
}
function Detail({ user, bill, label = 'Octubre' }: P & { label?: string }) {
  const [sel, setSel] = useState<string | null>(null)
  const c = bill.items.find(i => i.concept_key === sel)
  return (<><header><h1>Mi recibo</h1><p>{label} de 2026 · {fmt(bill.total)}</p></header><div className="scroll">
    {bill.items.map(i => <div className="card" key={i.concept_key}><div className="row"><b><i className="dot" style={{ background: i.color }} />{i.name}</b><b>{fmt(i.amount)}</b></div>
      <button className="btn ghost" onClick={() => { setSel(i.concept_key); log(user, 'why_open', 'recibo', { concepto: i.concept_key }) }}>¿Por qué me cobran esto?</button></div>)}</div>
    {c && <div className="scrim" onClick={() => { log(user, 'why_close', 'recibo'); setSel(null) }}><div className="sheet" role="dialog" aria-modal onClick={e => e.stopPropagation()}>
      <h2>¿Por qué me cobran {fmt(c.amount)}?</h2><p className="mute">{c.name}</p><p className="quote">«{c.explanation}»</p><p><b>Motivo:</b> {c.reason}</p>
      <div className="chips">{bill.items.map(i => <button key={i.concept_key} className={'chip' + (i.concept_key === sel ? ' on' : '')} onClick={() => { setSel(i.concept_key); log(user, 'why_switch_concept', 'recibo', { concepto: i.concept_key }) }}>{i.name}</button>)}</div>
      <button className="btn" onClick={() => { log(user, 'why_close', 'recibo'); setSel(null) }}>Entendido</button></div></div>}</>)
}

const r2 = (n: number) => Math.round(n * 100) / 100
function Compare({ user, bill }: P) {
  const ms = useMemo(() => history(bill, user.phone), [])
  const [a, setA] = useState(4); const [b, setB] = useState(5)
  useEffect(() => { log(user, 'compare_open', 'comparar') }, [])
  const A = ms[a], B = ms[b], d = r2(B.total - A.total)
  const sel = (v: number, f: (n: number) => void, l: string) => <label>{l}<select value={v} onChange={e => { f(+e.target.value); log(user, 'compare_change_months', 'comparar') }}>{ms.map((m, i) => <option key={i} value={i}>{m.label}</option>)}</select></label>
  return (<><header><h1>Comparar meses</h1><p>{A.label} vs {B.label} de 2026</p></header><div className="scroll">
    <div className="two">{sel(a, setA, 'Mes anterior')}{sel(b, setB, 'Mes actual')}</div>
    <div className="two"><div className="card"><p className="mute">{A.label}</p><div className="big sm">{fmt(A.total)}</div></div><div className="card"><p className="mute">{B.label}</p><div className="big sm">{fmt(B.total)}</div></div></div>
    <div className={'card diff ' + (d > 0 ? 'up' : 'down')}>Diferencia: {d > 0 ? '+' : ''}{fmt(d)}</div>
    <div className="card">{B.items.map((it, k) => <div className="row t" key={it.concept_key}><span>{it.name} {A.items[k].amount === 0 && it.amount > 0 && <span className="badge new">NUEVO</span>}</span><span>{fmt(A.items[k].amount)} → <b>{fmt(it.amount)}</b></span></div>)}</div>
    <Link className="btn" to={`/por-que?a=${a}&b=${b}`} onClick={() => log(user, 'why_up_open', 'comparar')}>¿Por qué {d >= 0 ? 'subió' : 'bajó'} tu recibo?</Link></div></>)
}

function Why({ user, bill }: P) {
  const [q] = useSearchParams(); const ms = history(bill, user.phone); const A = ms[+(q.get('a') ?? 4)] ?? ms[4], B = ms[+(q.get('b') ?? 5)] ?? ms[5]
  const d = r2(B.total - A.total), max = Math.max(A.total, B.total, 1), H = 200
  const bar = (x: number, m: typeof A) => { let y = H; return m.items.map(i => { const h = (i.amount / max) * H; y -= h; return <rect key={i.concept_key + x} x={x} y={y} width={70} height={h} fill={i.color} /> }) }
  const ch = B.items.map((i, k) => ({ i, k })).filter(({ i, k }) => i.amount !== A.items[k].amount)
  return (<><header><h1>¿Por qué {d >= 0 ? 'subió' : 'bajó'} tu recibo?</h1><p>{fmt(Math.abs(d))} {d >= 0 ? 'más' : 'menos'} que en {A.label}</p></header><div className="scroll">
    <div className="card"><svg viewBox="0 0 260 230" role="img" aria-label={`Barras apiladas de ${A.label} y ${B.label}`}>{bar(30, A)}{bar(160, B)}
      <text x="65" y="222" textAnchor="middle">{A.label.slice(0, 3)}</text><text x="195" y="222" textAnchor="middle">{B.label.slice(0, 3)}</text></svg>
      {B.items.map((i, k) => <div key={i.concept_key} className="row t"><span><i className="dot" style={{ background: i.color }} />{i.name}</span><span>{fmt(i.amount - A.items[k].amount)}</span></div>)}</div>
    {ch.map(({ i }) => <div className="card" key={i.concept_key}><b>{i.name}</b><p>{i.explanation}</p><p className="mute">{i.reason}</p></div>)}</div></>)
}

function Pay({ user, bill, paid, setPaid }: P & { setPaid: (b: boolean) => void }) {
  const nav = useNavigate(); const [m, setM] = useState(''); const [done, setDone] = useState(paid)
  useEffect(() => { log(user, 'pay_start', 'pagar') }, [])
  if (done) return <div className="scroll center"><h1>✅ Pago simulado</h1><p>No se hizo ningún cobro real.</p><button className="btn" onClick={() => nav('/')}>Volver al inicio</button></div>
  return (<><header><h1>Pagar recibo</h1><p>SIMULADO · {fmt(bill.total)}</p></header><div className="scroll">
    {['Tarjeta', 'Yape / Plin', 'Agente'].map(x => <button key={x} className={'card opt' + (m === x ? ' on' : '')} onClick={() => setM(x)}>{x}</button>)}
    <p className="mute">No ingreses datos reales: este prototipo no pide ni guarda datos de pago.</p>
    <button className="btn" disabled={!m} onClick={() => { setPaid(true); setDone(true); log(user, 'pay_done', 'pagar', { metodo: m }) }}>Simular pago</button></div></>)
}

function Profile({ user, out }: { user: User; out: () => void }) {
  return (<><header><h1>Perfil</h1></header><div className="scroll"><div className="card"><p><b>{user.name}</b></p><p className="mute">+51 {user.phone}</p></div>
    <div className="card"><b>Acerca de este prototipo</b><p className="mute">Proyecto académico de Creatividad Empresarial. No es la app oficial de Movistar. Los datos son ilustrativos y se usan solo para la prueba con usuarios.</p></div>
    <Link className="btn ghost" to="/encuesta">Cuestionario final</Link><button className="btn ghost" onClick={out}>Cerrar sesión</button></div></>)
}
