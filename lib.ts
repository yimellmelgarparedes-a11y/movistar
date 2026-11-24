import { createClient } from '@supabase/supabase-js'
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL || 'http://localhost', import.meta.env.VITE_SUPABASE_ANON_KEY || 'x')
export const fmt = (n: number) => 'S/ ' + n.toFixed(2)
export type Item = { concept_key: string; name: string; amount: number; prev_amount: number; explanation: string; reason: string; color: string }
export type Bill = { period: string; total: number; prev_total: number; due_date: string; items: Item[] }
export type User = { name: string; phone: string; pid?: string }
const BASE = { concept_key: 'plan', name: 'Plan mensual', color: '#019DF4', explanation: 'Es el precio fijo de tu plan. Se cobra todos los meses por tener tu servicio activo.', reason: 'Cargo fijo mensual. No cambió respecto al mes anterior.' }
const POOL = [
  { concept_key: 'datos', name: 'Paquete adicional de datos', color: '#5CB615', r: [5, 25], explanation: 'Corresponde a un paquete adicional de datos que se agregó a tu servicio durante el periodo.', reason: 'Se registró un paquete de datos extra este mes.' },
  { concept_key: 'prop', name: 'Cargo proporcional', color: '#F5A623', r: [3, 15], explanation: 'Es un cobro por los días en que usaste un servicio o cambio que empezó a mitad del periodo, no por el mes completo.', reason: 'Se calcula según los días de uso dentro del periodo.' },
  { concept_key: 'roam', name: 'Llamadas internacionales y roaming', color: '#8E5CF6', r: [6, 30], explanation: 'Es el costo de llamadas a otros países o del uso de tu línea fuera del Perú, que no están incluidos en tu plan.', reason: 'Se registró uso fuera de lo incluido en tu plan.' },
  { concept_key: 'deco', name: 'Decodificador adicional', color: '#E0475B', r: [9.9, 9.9], explanation: 'Es el alquiler mensual de un decodificador extra que se activó en tu servicio.', reason: 'Se agregó un equipo adicional durante el periodo.' },
  { concept_key: 'terc', name: 'Servicios de terceros', color: '#14B8A6', r: [4, 12], explanation: 'Son suscripciones con otras empresas (juegos, contenidos) que se cobran a través de tu línea.', reason: 'Se activó una suscripción durante el periodo. Puedes darla de baja.' },
]
const r2 = (n: number) => Math.round(n * 100) / 100
// Mismo celular = mismo recibo (datos ilustrativos)
export function buildBill(phone: string): Bill {
  let s = 7; for (const ch of phone) s = (s * 31 + ch.charCodeAt(0)) | 0
  const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const plan = [39.9, 49.9, 59.9, 69.9, 79.9, 99.9][Math.floor(r() * 6)]
  const pool = POOL.map(c => ({ c, k: r() })).sort((a, b) => a.k - b.k).map(x => x.c)
  const n = 1 + Math.floor(r() * 3)
  const items: Item[] = [{ ...BASE, amount: plan, prev_amount: plan }]
  pool.slice(0, n).forEach((c, i) => {
    const amount = r2(c.r[0] + r() * (c.r[1] - c.r[0]))
    const prev_amount = i === 0 && r() < 0.4 ? r2(amount * 0.5) : 0
    items.push({ concept_key: c.concept_key, name: c.name, color: c.color, explanation: c.explanation, reason: c.reason, amount, prev_amount })
  })
  const total = r2(items.reduce((t, i) => t + i.amount, 0))
  const prev_total = r2(items.reduce((t, i) => t + i.prev_amount, 0))
  return { period: '2026-10', total, prev_total, due_date: `2026-11-${10 + Math.floor(r() * 16)}`, items }
}
const session = crypto.randomUUID()
export function log(user: User | null, event: string, screen = '', props: object = {}) {
  try { sb.rpc('log_event', { p_participant: user?.pid ?? null, p_session: session, p_event: event, p_screen: screen, p_props: props }).then(() => {}, () => {}) } catch { /* nunca bloquear la UI */ }
}
export async function register(name: string, phone: string, bill: Bill): Promise<string | undefined> {
  try {
    const { data } = await sb.rpc('register_participant', { p_name: name, p_phone: phone, p_bill: { ...bill, items: bill.items.map(({ color, ...i }) => i) } })
    return (data as { participant_id?: string } | null)?.participant_id
  } catch { return undefined }
}
export function rng(phone: string, salt: string) {
  let s = 11; for (const ch of phone + salt) s = (s * 33 + ch.charCodeAt(0)) | 0
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export type Month = { label: string; total: number; items: Item[] }
export function history(bill: Bill, phone: string): Month[] {
  const r = rng(phone, 'hist'); const L = ['Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre']
  return L.map((label, i) => {
    const items = bill.items.map((it, k) => ({ ...it, amount: i === 5 ? it.amount : i === 4 ? it.prev_amount : k === 0 ? it.amount : r() < 0.5 ? Math.round(it.amount * (0.6 + r() * 0.6) * 100) / 100 : 0 }))
    return { label, total: Math.round(items.reduce((t, x) => t + x.amount, 0) * 100) / 100, items }
  })
}
