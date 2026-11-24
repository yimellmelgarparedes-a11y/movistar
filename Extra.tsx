import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sb, fmt, log, rng, history, type Bill, type User } from './lib'
type P = { user: User; bill: Bill }
const H = ({ t, s }: { t: string; s?: string }) => <header><h1>{t}</h1>{s && <p>{s}</p>}</header>

export function Usage({ user }: P) {
  const r = rng(user.phone, 'uso')
  const rows: [string, number, number, string][] = [['Datos', +(2 + r() * 16).toFixed(1), 20, 'GB'], ['Minutos', Math.round(r() * 300), 300, 'min'], ['SMS', Math.round(r() * 100), 100, 'SMS']]
  return (<><H t="Consumo" s="Valores ilustrativos del periodo" /><div className="scroll">{rows.map(([n, u, m, k]) => <div className="card" key={n}><div className="row"><b>{n}</b><span className="mute">{u} de {m} {k}</span></div><progress max={m} value={u} /></div>)}</div></>)
}

export function History({ user, bill }: P) {
  return (<><H t="Historial de recibos" s="Últimos 6 meses" /><div className="scroll">{[...history(bill, user.phone)].map((m, i) => ({ m, i })).reverse().map(({ m, i }) => <Link className="card row" to={`/historial/${i}`} key={m.label}><b>{m.label} de 2026</b><b>{fmt(m.total)}</b></Link>)}</div></>)
}

export function Plan({ bill }: P) {
  return (<><H t="Mi plan" /><div className="scroll"><div className="card"><b>Plan mensual</b><div className="big sm">{fmt(bill.items[0].amount)}</div>
    <ul><li>Datos, minutos y SMS según tu plan (ilustrativo)</li><li>Redes sociales sin consumir datos</li><li>Atención en línea</li></ul></div></div></>)
}

export function Notifs() {
  return (<><H t="Notificaciones" /><div className="scroll">{[['Tu recibo de octubre ya está disponible', 'Hoy'], ['Vence en 3 días', 'Hace 2 días'], ['Tu recibo subió: revisa el comparador', 'Hace 3 días']].map(([a, b]) => <div className="card" key={a}><b>{a}</b><span className="mute">{b}</span></div>)}</div></>)
}

const FAQ: [string, string][] = [['¿Qué es el cargo proporcional?', 'Es un cobro por los días de uso de un servicio que empezó a mitad del periodo.'], ['¿Cuándo vence mi recibo?', 'La fecha aparece en Inicio, debajo del monto a pagar.'], ['¿Cómo pago mi recibo?', 'En este prototipo el pago es simulado: Inicio > Pagar.']]
export function Help({ user }: P) {
  const [open, setOpen] = useState(-1); const [msg, setMsg] = useState(''); const [chat, setChat] = useState<string[]>(['Hola, soy el asistente de prueba. Pregúntame sobre tu recibo.'])
  const send = () => {
    if (!msg.trim()) return; log(user, 'chat_message', 'ayuda'); const q = msg.toLowerCase()
    const a = q.includes('cambi') || q.includes('sub') ? 'Tu recibo cambia cuando se agregan o quitan cargos. Mira Comparar meses.' : q.includes('pag') ? 'Puedes simular el pago desde Inicio.' : 'Respuesta de ejemplo: este chat es simulado. Prueba con «por qué subió» o «pagar».'
    setChat(c => [...c, 'Tú: ' + msg, a]); setMsg('')
  }
  return (<><H t="Ayuda" /><div className="scroll">
    <Link className="card" to="/comparar" onClick={() => log(user, 'faq_open', 'ayuda', { q: 'cambio' })}><b>¿Por qué cambió mi recibo?</b><span className="mute">Ver comparador →</span></Link>
    {FAQ.map(([q, a], i) => <button key={q} className="card" onClick={() => { setOpen(open === i ? -1 : i); log(user, 'faq_open', 'ayuda', { q }) }}><b>{q}</b>{open === i && <span className="mute">{a}</span>}</button>)}
    <div className="card">{chat.map((c, i) => <p key={i} className="mute">{c}</p>)}<input value={msg} maxLength={200} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Escribe tu duda" /><button className="btn" onClick={send}>Enviar</button></div></div></>)
}

export function Survey({ user }: P) {
  const [a, setA] = useState({ entendi: '', facil: 0, comentario: '' }); const [done, setDone] = useState(false)
  if (done) return <div className="scroll center"><h1>¡Gracias!</h1><p>Tus respuestas se guardaron.</p></div>
  return (<><H t="Cuestionario final" /><div className="scroll">
    <p>¿Entendiste por qué subió tu recibo?</p><div className="chips">{['Sí', 'Más o menos', 'No'].map(x => <button key={x} className={'chip' + (a.entendi === x ? ' on' : '')} onClick={() => setA({ ...a, entendi: x })}>{x}</button>)}</div>
    <p>¿Qué tan fácil fue (1 = difícil, 5 = muy fácil)?</p><div className="chips">{[1, 2, 3, 4, 5].map(n => <button key={n} className={'chip' + (a.facil === n ? ' on' : '')} onClick={() => setA({ ...a, facil: n })}>{n}</button>)}</div>
    <input value={a.comentario} maxLength={300} placeholder="Comentario (opcional)" onChange={e => setA({ ...a, comentario: e.target.value })} />
    <button className="btn" disabled={!a.entendi || !a.facil} onClick={async () => { try { await sb.rpc('submit_survey', { p_participant: user.pid ?? null, p_answers: a }) } catch { /* sigue */ } log(user, 'survey_submit', 'encuesta'); setDone(true) }}>Enviar</button></div></>)
}

type Row = Record<string, unknown>
export function Admin() {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [ses, setSes] = useState(false); const [err, setErr] = useState('')
  const [parts, setParts] = useState<Row[]>([]); const [evs, setEvs] = useState<Row[]>([])
  const load = async () => {
    const p = await sb.from('admin_summary').select('*').order('created_at', { ascending: false }); const e = await sb.from('events').select('*').order('id', { ascending: false }).limit(300)
    if (p.error) { setErr('Sin permiso de administrador.'); setSes(false); return }
    setParts(p.data ?? []); setEvs(e.data ?? []); setSes(true)
  }
  useEffect(() => { sb.auth.getSession().then(({ data }) => data.session && load()) }, [])
  const login = async () => { const { error } = await sb.auth.signInWithPassword({ email, password: pw }); if (error) setErr('Correo o contraseña incorrectos.'); else { setErr(''); load() } }
  const csv = () => {
    const rows = [Object.keys(parts[0] ?? {}).join(','), ...parts.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' })); a.download = 'participantes.csv'; a.click()
  }
  const wipe = async () => { if (!confirm('¿Borrar TODOS los datos de participantes? No se puede deshacer.')) return; await sb.from('participants').delete().not('id', 'is', null); await sb.from('events').delete().gt('id', 0); load() }
  if (!ses) return (<div className="scroll"><h1>Panel del investigador</h1><input value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo" /><input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Contraseña" />{err && <p className="err">{err}</p>}<button className="btn" onClick={login}>Entrar</button></div>)
  return (<div className="scroll"><h1>Panel del investigador</h1><p>{parts.length} participantes · {evs.length} eventos recientes · {parts.reduce((t, r) => t + Number(r.why_opened ?? 0), 0)} «¿Por qué?» abiertos</p>
    <div className="row"><button className="btn" onClick={csv}>Exportar CSV</button><button className="btn ghost" onClick={wipe}>Borrar todos los datos</button></div>
    {parts.map(r => <div className="card" key={String(r.id)}><b>{String(r.name)} · {String(r.phone)}</b><span className="mute">¿Por qué?: {String(r.why_opened)} · Comparar: {String(r.compare_opened)} · Llegó a «¿Por qué subió?»: {r.reached_why_up ? 'sí' : 'no'} · Tiempo: {String(r.time_to_why_up ?? '—')}</span></div>)}
    <h3>Últimos eventos</h3>{evs.slice(0, 50).map(e => <p className="mute" key={String(e.id)}>{String(e.created_at).slice(11, 19)} · {String(e.event)} · {String(e.screen ?? '')}</p>)}</div>)
}
