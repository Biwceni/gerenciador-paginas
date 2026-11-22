/**
 * Regras da Agenda (B5) que valem no site, no editor e no arquivo "Adicionar à agenda": o dia de
 * hoje em Brasília, os próximos primeiro, os passados por último, e a contagem em dias e horas.
 *
 * O horário de cada data é o de Brasília. Desde 2019 não há horário de verão no Brasil, então a
 * diferença para o horário universal é sempre de 3 horas.
 */

export const EVENTS_TIME_ZONE = 'America/Sao_Paulo'
const OFFSET = '-03:00'

type Dated = { date: string; time: string }

/**
 * A hora em que o servidor desenha a Agenda. A lista confere de novo no navegador depois de abrir
 * (`EventsBrowse`), então tanto faz a página ter sido gerada antes.
 */
export const renderTime = () => Date.now()

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export const validDate = (date: unknown): date is string =>
  typeof date === 'string' && DATE.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))

/** O dia de hoje em Brasília: "2026-12-14". */
export function todayInBrazil(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENTS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Quando a data começa (sem horário, à meia-noite de Brasília). */
export function eventStart({ date, time }: Dated): Date | null {
  if (!validDate(date)) return null
  const clock = TIME.test(time) ? time : '00:00'
  return new Date(`${date}T${clock}:00${OFFSET}`)
}

/**
 * Posições das datas na lista do editor: as próximas (de hoje em diante), da mais perto para a mais
 * longe; as que já passaram, da mais recente para a mais antiga. Data no dia de hoje ainda é
 * próxima o dia todo (o show das 20h não some às 20h01). Sem data: fica de fora.
 */
export function splitEvents(items: Dated[], now: Date): { upcoming: number[]; past: number[] } {
  const today = todayInBrazil(now)
  const key = (index: number) => `${items[index].date}T${items[index].time || '00:00'}`
  const dated = items.map((_, index) => index).filter((index) => validDate(items[index].date))
  const upcoming = dated
    .filter((index) => items[index].date >= today)
    .sort((a, b) => key(a).localeCompare(key(b)) || a - b)
  const past = dated
    .filter((index) => items[index].date < today)
    .sort((a, b) => key(b).localeCompare(key(a)) || a - b)
  return { upcoming, past }
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * A contagem até a próxima data, só em dias e horas: "Faltam 3 dias e 4 horas". No próprio dia,
 * sem horário: "É hoje". Já começou (no dia): "Começou".
 */
export function countdownText(item: Dated, now: Date): string | null {
  const start = eventStart(item)
  if (!start) return null
  const today = todayInBrazil(now)
  if (item.date === today && !TIME.test(item.time)) return 'É hoje'
  const minutes = Math.floor((start.getTime() - now.getTime()) / 60_000)
  if (minutes < 0) return item.date === today ? 'Começou' : null
  if (minutes < 60) return 'Falta menos de 1 hora'
  const days = Math.floor(minutes / (60 * 24))
  const hours = Math.floor((minutes % (60 * 24)) / 60)
  const parts = [days && plural(days, 'dia', 'dias'), hours && plural(hours, 'hora', 'horas')]
  const text = parts.filter(Boolean).join(' e ')
  return `${days > 1 || (!days && hours > 1) ? 'Faltam' : 'Falta'} ${text}`
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** A data em partes, para o cartão: "sáb", "14", "dez", e por extenso para o leitor de tela. */
export function eventDateParts(date: string) {
  if (!validDate(date)) return null
  const day = new Date(`${date}T12:00:00Z`)
  const full = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(day)
  return {
    weekday: WEEKDAYS[day.getUTCDay()],
    day: String(day.getUTCDate()),
    month: MONTHS[day.getUTCMonth()],
    year: String(day.getUTCFullYear()),
    full,
  }
}

/** "19h30", "20h": como o horário aparece no cartão. */
export const eventTimeText = (time: string) =>
  TIME.test(time) ? time.replace(':00', 'h').replace(':', 'h') : ''

// "Adicionar à agenda": um arquivo .ics que o celular abre na agenda dele.

export const ICS_PATH = '/agenda.ics'

export type IcsEvent = Dated & { title: string; place: string; text: string }

/** Endereço do arquivo da data: tudo vai no próprio endereço, sem consultar o banco. */
export function icsHref(event: IcsEvent): string | null {
  if (!validDate(event.date) || !event.title.trim()) return null
  const params = new URLSearchParams({ d: event.date, t: event.title.trim() })
  if (TIME.test(event.time)) params.set('h', event.time)
  if (event.place.trim()) params.set('l', event.place.trim())
  if (event.text.trim()) params.set('x', event.text.trim())
  return `${ICS_PATH}?${params}`
}

/** Texto de um campo do .ics: barra, vírgula, ponto e vírgula e quebras escapados. */
const escape = (text: string) =>
  text
    .replace(/[\r\0]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')

const stamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/** Linhas do .ics com no máximo 75 letras (as seguintes começam com espaço, como pede o formato). */
function fold(line: string): string {
  const parts: string[] = []
  for (let rest = line; rest.length; rest = rest.slice(73)) parts.push(rest.slice(0, 73))
  return parts.join('\r\n ')
}

/**
 * O arquivo .ics de uma data. Com horário, dura 2 horas (a agenda pede um fim); sem horário, ocupa
 * o dia todo. `now` e `uid` vêm de fora para o teste dar sempre o mesmo resultado.
 */
export function icsFile(event: IcsEvent, now: Date, uid: string): string | null {
  const start = eventStart(event)
  if (!start || !event.title.trim()) return null
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gerenciador de Paginas//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(now)}`,
  ]
  if (TIME.test(event.time)) {
    lines.push(
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(new Date(start.getTime() + 2 * 3600_000))}`,
    )
  } else {
    const next = new Date(`${event.date}T12:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    lines.push(
      `DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`,
    )
  }
  lines.push(`SUMMARY:${escape(event.title.trim())}`)
  if (event.place.trim()) lines.push(`LOCATION:${escape(event.place.trim())}`)
  if (event.text.trim()) lines.push(`DESCRIPTION:${escape(event.text.trim())}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
