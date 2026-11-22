/**
 * Unidades do negócio (D1): cada uma com nome, endereço, telefones, WhatsApp, horário da semana e
 * datas especiais (feriados e horário diferente). Ficam em Configurações › Contato e valem no site,
 * no painel e no servidor.
 *
 * A primeira unidade é a principal: o rodapé, o topo, a seção "Contato e endereço" e os botões de
 * WhatsApp usam os dados dela, copiados para os campos de sempre do contato (`mainContact`).
 */

import { normalizeWhatsApp } from './links'

export const UNITS_MAX = 12
export const SPECIALS_MAX = 30

/** O horário de um dia: aberto das tantas às tantas, ou `null` (fechado). */
export type DayHours = { open: string; close: string } | null

/** A semana, de domingo (0) a sábado (6). */
export type Schedule = DayHours[]

/** Um dia com horário diferente: feriado (fechado) ou horário especial. */
export type SpecialDay = {
  date: string
  label: string
  closed: boolean
  open: string
  close: string
}

/** Uma unidade como o Payload guarda (o horário e as datas especiais ficam em JSON). */
export type UnitData = {
  id?: string | null
  name?: string | null
  address?: string | null
  phone?: string | null
  phone2?: string | null
  whatsapp?: string | null
  schedule?: unknown
  hoursNote?: string | null
  specials?: unknown
}

/** Uma unidade pronta para desenhar: tudo conferido, texto vazio em vez de `null`. */
export type Unit = {
  id: string
  name: string
  address: string
  phone: string
  phone2: string
  whatsapp: string
  schedule: Schedule | null
  hoursNote: string
  specials: SpecialDay[]
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

const validTime = (value: unknown): value is string => typeof value === 'string' && TIME.test(value)
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

/** O horário de uma unidade nova: seg a sex das 8h às 18h, sábado das 8h às 12h, domingo fechado. */
export const DEFAULT_SCHEDULE: Schedule = [
  null,
  { open: '08:00', close: '18:00' },
  { open: '08:00', close: '18:00' },
  { open: '08:00', close: '18:00' },
  { open: '08:00', close: '18:00' },
  { open: '08:00', close: '18:00' },
  { open: '08:00', close: '12:00' },
]

/**
 * O horário guardado, conferido: 7 dias, cada um fechado ou com abertura e fechamento válidos.
 * Fechar depois da meia-noite vale (bar que abre às 18h e fecha às 02h). Qualquer outra coisa
 * vira `null` (sem horário).
 */
export function safeSchedule(raw: unknown): Schedule | null {
  if (!Array.isArray(raw) || raw.length !== 7) return null
  const days = raw.map((day): DayHours => {
    if (!day || typeof day !== 'object') return null
    const { open, close } = day as { open?: unknown; close?: unknown }
    return validTime(open) && validTime(close) && open !== close ? { open, close } : null
  })
  return days.some(Boolean) ? days : null
}

/** As datas especiais guardadas, conferidas, em ordem de data e sem repetir o dia. */
export function safeSpecials(raw: unknown): SpecialDay[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const list: SpecialDay[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Record<string, unknown>
    if (!validDate(entry.date) || seen.has(entry.date)) continue
    const timed = validTime(entry.open) && validTime(entry.close) && entry.open !== entry.close
    const closed = entry.closed === true || !timed
    seen.add(entry.date)
    list.push({
      date: entry.date,
      label: text(entry.label, 60),
      closed,
      open: closed ? '' : (entry.open as string),
      close: closed ? '' : (entry.close as string),
    })
  }
  return list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, SPECIALS_MAX)
}

/** A unidade guardada, conferida. */
export function toUnit(raw: UnitData, index = 0): Unit {
  return {
    id: raw.id || `unidade-${index + 1}`,
    name: text(raw.name, 60),
    address: text(raw.address, 300),
    phone: text(raw.phone, 40),
    phone2: text(raw.phone2, 40),
    whatsapp: text(raw.whatsapp, 40),
    schedule: safeSchedule(raw.schedule),
    hoursNote: text(raw.hoursNote, 120),
    specials: safeSpecials(raw.specials),
  }
}

type ContactLike = {
  units?: UnitData[] | null
  whatsapp?: string | null
  phone?: string | null
  address?: string | null
  hours?: string | null
}

/**
 * As unidades do site. Contato de antes das unidades (sem a lista, mas com WhatsApp, telefone,
 * endereço ou horário) vira uma unidade só, para o site não ficar vazio antes da migração.
 */
export function siteUnits(contact: ContactLike | null | undefined): Unit[] {
  const units = (contact?.units ?? []).map(toUnit)
  if (units.length) return units.slice(0, UNITS_MAX)
  const legacy = toUnit({
    whatsapp: contact?.whatsapp,
    phone: contact?.phone,
    address: contact?.address,
    hoursNote: contact?.hours,
  })
  return legacy.whatsapp || legacy.phone || legacy.address || legacy.hoursNote ? [legacy] : []
}

/** Nome da unidade para mostrar: o escrito ou "Unidade 2". */
export const unitName = (unit: Pick<Unit, 'name'>, index: number) =>
  unit.name || (index === 0 ? 'Unidade principal' : `Unidade ${index + 1}`)

// Horário em texto.

const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
/** A semana como o brasileiro lê: de segunda a domingo. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** "08:00" → "8h"; "19:30" → "19h30". */
export const clockText = (time: string) => {
  const [hours, minutes] = time.split(':')
  return `${Number(hours)}h${minutes === '00' ? '' : minutes}`
}

const hoursText = (day: NonNullable<DayHours>) =>
  `${clockText(day.open)} às ${clockText(day.close)}`

const sameDay = (a: DayHours, b: DayHours) =>
  a === b || (Boolean(a && b) && a!.open === b!.open && a!.close === b!.close)

/** Os dias em grupos seguidos com o mesmo horário, de segunda a domingo. */
export function scheduleGroups(schedule: Schedule): { days: string; hours: string | null }[] {
  const groups: { first: number; last: number; day: DayHours }[] = []
  for (const index of WEEK_ORDER) {
    const day = schedule[index]
    const previous = groups.at(-1)
    if (previous && sameDay(previous.day, day)) previous.last = index
    else groups.push({ first: index, last: index, day })
  }
  return groups.map(({ first, last, day }) => {
    const span = WEEK_ORDER.indexOf(last) - WEEK_ORDER.indexOf(first)
    const days =
      span === 0
        ? DAY_SHORT[first]
        : `${DAY_SHORT[first]} ${span === 1 ? 'e' : 'a'} ${DAY_SHORT[last].toLowerCase()}`
    return { days, hours: day ? hoursText(day) : null }
  })
}

/**
 * O horário numa linha, sem os dias fechados: "Seg a sex, 8h às 18h · Sáb, 8h às 12h". É o que vai
 * para o rodapé, o topo e a seção "Contato e endereço".
 */
export function scheduleText(schedule: Schedule | null): string {
  if (!schedule) return ''
  return scheduleGroups(schedule)
    .filter((group) => group.hours)
    .map((group) => `${group.days}, ${group.hours}`)
    .join(' · ')
}

/** O horário da unidade em texto: o da semana ou, sem ele, a observação. */
export const unitHoursText = (unit: Pick<Unit, 'schedule' | 'hoursNote'>) =>
  scheduleText(unit.schedule) || unit.hoursNote

/** "Fechado" ou "8h às 12h". */
export const specialHoursText = (special: SpecialDay) =>
  special.closed ? 'Fechado' : `${clockText(special.open)} às ${clockText(special.close)}`

/** "25/12": a data especial no cartão. */
export const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`

/** As datas especiais de hoje até `days` dias à frente (hoje no formato "2026-12-25"). */
export function upcomingSpecials(specials: SpecialDay[], today: string, days = 45): SpecialDay[] {
  const limit = new Date(`${today}T12:00:00Z`)
  limit.setUTCDate(limit.getUTCDate() + days)
  const last = limit.toISOString().slice(0, 10)
  return specials.filter((special) => special.date >= today && special.date <= last)
}

// Telefones.

/**
 * Telefone no jeito de ler: "31999990000" → "(31) 99999-0000"; "3133334444" → "(31) 3333-4444";
 * "08001234567" → "0800 123 4567". Com o +55 na frente, ele sai. O que não parece telefone do
 * Brasil fica como foi digitado.
 */
export function formatPhone(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  let digits = raw.replace(/\D/g, '')
  if (/^0[3589]00\d{7}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2)
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // "031 3333-4444": o 0 do DDD à moda antiga.
    digits = digits.slice(1)
  }
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return raw
}

// Feriados.

/** Domingo de Páscoa do ano (algoritmo de Meeus/Jones/Butcher). */
function easter(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day, 12))
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10)
const plusDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000)

/** Feriados nacionais (e Carnaval, Sexta-feira Santa e Corpus Christi) de um ano. */
export function nationalHolidays(year: number): { date: string; label: string }[] {
  const pascoa = easter(year)
  const fixed: [string, string][] = [
    ['01-01', 'Ano-novo'],
    ['04-21', 'Tiradentes'],
    ['05-01', 'Dia do Trabalho'],
    ['09-07', 'Independência'],
    ['10-12', 'Nossa Senhora Aparecida'],
    ['11-02', 'Finados'],
    ['11-15', 'Proclamação da República'],
    ['11-20', 'Consciência Negra'],
    ['12-25', 'Natal'],
  ]
  return [
    ...fixed.map(([day, label]) => ({ date: `${year}-${day}`, label })),
    { date: isoDay(plusDays(pascoa, -47)), label: 'Carnaval' },
    { date: isoDay(plusDays(pascoa, -2)), label: 'Sexta-feira Santa' },
    { date: isoDay(plusDays(pascoa, 60)), label: 'Corpus Christi' },
  ].sort((a, b) => a.date.localeCompare(b.date))
}

/** Os feriados dos próximos 12 meses, a partir de hoje (inclusive). */
export function nextHolidays(today: string): { date: string; label: string }[] {
  const year = Number(today.slice(0, 4))
  const end = isoDay(plusDays(new Date(`${today}T12:00:00Z`), 365))
  return [...nationalHolidays(year), ...nationalHolidays(year + 1)].filter(
    (holiday) => holiday.date >= today && holiday.date < end,
  )
}

// Conferência e os dados de sempre do contato.

/** Problemas de uma unidade que impedem salvar, por campo (`whatsapp`, `name`, `schedule`). */
export function unitErrors(unit: Unit, total: number): Record<string, string> {
  const errors: Record<string, string> = {}
  if (total > 1 && !unit.name) errors.name = 'Dê um nome à unidade. Ex.: Centro.'
  if (unit.whatsapp && !normalizeWhatsApp(unit.whatsapp)) {
    errors.whatsapp = 'Digite o número com DDD. Ex.: (31) 99999-0000.'
  }
  return errors
}

/**
 * O que a primeira unidade copia para os campos de sempre do contato (rodapé, topo, seção
 * "Contato e endereço", dados para o Google). Sem unidade, tudo fica em branco.
 */
export function mainContact(units: Unit[]) {
  const main = units[0]
  return {
    whatsapp: main?.whatsapp || null,
    phone: main?.phone || main?.phone2 || null,
    address: main?.address || null,
    hours: (main && unitHoursText(main)) || null,
  }
}

/** A unidade como o Payload guarda. */
export function toUnitData(unit: Unit) {
  const orNull = (value: string) => value.trim() || null
  return {
    id: unit.id,
    name: orNull(unit.name),
    address: orNull(unit.address),
    phone: orNull(formatPhone(unit.phone)),
    phone2: orNull(formatPhone(unit.phone2)),
    whatsapp: orNull(formatPhone(unit.whatsapp)),
    schedule: unit.schedule,
    hoursNote: orNull(unit.hoursNote),
    specials: unit.specials,
  }
}

/** Unidades que têm WhatsApp: as que o botão do canto deixa escolher. */
export const unitsWithWhatsApp = (units: Unit[]) =>
  units.flatMap((unit, index) =>
    normalizeWhatsApp(unit.whatsapp) ? [{ unit, name: unitName(unit, index) }] : [],
  )
