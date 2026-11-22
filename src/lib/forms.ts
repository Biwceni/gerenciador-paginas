// Formulários do site (plugin oficial de formulários do Payload). Aqui fica o que a seção e o
// servidor dividem: o formato que a seção desenha, o formulário padrão e a conferência de um envio.

import { todayInBrazil } from './events'

export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'file'
  | 'date'
  | 'time'
  | 'unit'

/** D2: que arquivo o campo aceita. */
export type FileAccept = 'photo' | 'document'

export type FormFieldDefinition = {
  type: FormFieldType
  name: string
  label: string
  required: boolean
  placeholder: string
  options: { label: string; value: string }[]
  /** Arquivo: só foto ou foto e documento. */
  accept?: FileAccept
  /** Dia: quantos dias à frente dá para escolher, e em que dias da semana (0 = domingo). */
  days?: number
  weekdays?: number[]
  /** Horário: das tantas às tantas, de quantos em quantos minutos. */
  from?: string
  to?: string
  step?: number
}

/** Formulário como a seção desenha: só o que o visitante vê. */
export type FormDefinition = {
  id: number
  title: string
  submitLabel: string
  /** Frase depois do envio, escrita na tela de Formulários. Vazia: vale a da seção. */
  successMessage: string
  fields: FormFieldDefinition[]
}

const FIELD_TYPES: FormFieldType[] = [
  'text',
  'email',
  'phone',
  'textarea',
  'select',
  'checkbox',
  'file',
  'date',
  'time',
  'unit',
]

/** Tipos de resposta como o leigo escolhe na tela de Formulários. */
export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  email: 'E-mail',
  phone: 'WhatsApp ou telefone',
  select: 'Lista de opções',
  checkbox: 'Caixa de marcar',
  date: 'Dia',
  time: 'Horário',
  unit: 'Unidade',
  file: 'Arquivo ou foto',
}

type RawBlock = {
  blockType?: string
  name?: string | null
  label?: string | null
  required?: boolean | null
  placeholder?: string | null
  options?: { label?: string | null; value?: string | null }[] | null
  accept?: string | null
  days?: number | null
  weekdays?: string | null
  from?: string | null
  to?: string | null
  step?: number | null
}

// D2: os limites de cada tipo novo.
export const FILE_MAX_BYTES = 10 * 1024 * 1024
export const DATE_DAYS_DEFAULT = 30
export const DATE_DAYS_MAX = 90
export const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5, 6]
export const TIME_STEPS = [15, 30, 60] as const
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/

/** "1,2,3" → [1, 2, 3]; vazio ou errado → seg a sáb. */
export function parseWeekdays(value: string | null | undefined): number[] {
  const days = [
    ...new Set(
      (value ?? '')
        .split(',')
        .filter((day) => day.trim() !== '')
        .map((day) => Number(day.trim()))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    ),
  ].sort()
  return days.length ? days : DEFAULT_WEEKDAYS
}

/** O que cada tipo novo precisa, com o padrão quando falta. */
function fieldExtras(block: RawBlock): Partial<FormFieldDefinition> {
  switch (block.blockType) {
    case 'file':
      return { accept: block.accept === 'document' ? 'document' : 'photo' }
    case 'date':
      return {
        days: Math.min(Math.max(Math.round(block.days ?? DATE_DAYS_DEFAULT), 1), DATE_DAYS_MAX),
        weekdays: parseWeekdays(block.weekdays),
      }
    case 'time': {
      const from = block.from && CLOCK.test(block.from) ? block.from : '08:00'
      const to = block.to && CLOCK.test(block.to) && block.to > from ? block.to : '18:00'
      const step = TIME_STEPS.includes(block.step as 15) ? (block.step as number) : 30
      return { from, to: to > from ? to : '23:59', step }
    }
    default:
      return {}
  }
}

/** Do documento do plugin para o formato da seção (blocos que não usamos ficam de fora). */
export function toFormDefinition(doc: {
  id: number
  title?: string | null
  submitButtonLabel?: string | null
  confirmationMessage?: unknown
  fields?: RawBlock[] | null
}): FormDefinition {
  return {
    id: doc.id,
    title: doc.title ?? '',
    submitLabel: doc.submitButtonLabel?.trim() || 'Enviar',
    successMessage: richTextToPlain(doc.confirmationMessage),
    fields: (doc.fields ?? []).flatMap((block) => {
      const type = block.blockType as FormFieldType
      if (!FIELD_TYPES.includes(type) || !block.name) return []
      return [
        {
          type,
          name: block.name,
          label: block.label?.trim() || block.name,
          required: Boolean(block.required),
          placeholder: block.placeholder ?? '',
          options: (block.options ?? []).flatMap((option) =>
            option.value ? [{ label: option.label || option.value, value: option.value }] : [],
          ),
          ...fieldExtras(block),
        },
      ]
    }),
  }
}

/** Formulário que o editor cria com um clique: Nome, WhatsApp, E-mail e Mensagem. */
export const DEFAULT_FORM = {
  title: 'Fale com a gente',
  submitButtonLabel: 'Enviar',
  fields: [
    { blockType: 'text', name: 'nome', label: 'Nome', required: true, width: 100 },
    { blockType: 'phone', name: 'whatsapp', label: 'WhatsApp', required: false, width: 100 },
    { blockType: 'email', name: 'email', label: 'E-mail', required: false, width: 100 },
    { blockType: 'textarea', name: 'mensagem', label: 'Mensagem', required: true, width: 100 },
  ],
}

type StarterField = { blockType: FormFieldType; label: string; required: boolean }

/** Formulários prontos da tela de Formulários. Os nomes técnicos nascem no servidor. */
export const FORM_STARTERS: { key: string; title: string; fields: StarterField[] }[] = [
  {
    key: 'contato',
    title: 'Fale conosco',
    fields: [
      { blockType: 'text', label: 'Nome', required: true },
      { blockType: 'phone', label: 'WhatsApp', required: true },
      { blockType: 'email', label: 'E-mail', required: false },
      { blockType: 'textarea', label: 'Mensagem', required: false },
    ],
  },
  {
    key: 'orcamento',
    title: 'Pedido de orçamento',
    fields: [
      { blockType: 'text', label: 'Nome', required: true },
      { blockType: 'phone', label: 'WhatsApp', required: true },
      { blockType: 'textarea', label: 'O que você precisa?', required: true },
      { blockType: 'text', label: 'Para quando?', required: false },
    ],
  },
  {
    key: 'inscricao',
    title: 'Inscrição',
    fields: [
      { blockType: 'text', label: 'Nome', required: true },
      { blockType: 'phone', label: 'WhatsApp', required: true },
      { blockType: 'email', label: 'E-mail', required: true },
      { blockType: 'checkbox', label: 'Vai levar acompanhante?', required: false },
    ],
  },
]

/** Os modelos de site guardam o WhatsApp como texto. Ao aplicar, ele vira o tipo próprio. */
export function templateBlockType<T extends string>(type: T, name: string): T | 'phone' {
  return type === 'text' && name === 'whatsapp' ? 'phone' : type
}

/** Frase da caixa obrigatória (LGPD). Vai junto com a mensagem guardada. */
export const CONSENT_TEXT =
  'Concordo com o uso dos meus dados para receber resposta a esta mensagem.'

/**
 * Nomes usados pelo próprio formulário do site. Começam com um prefixo reservado, que os campos
 * criados pelo leigo não podem usar: um campo dele com o mesmo nome se misturaria com estes.
 */
export const RESERVED_FIELD_PREFIX = '_gp_'

/** Campo escondido: só robô preenche. Envio com ele preenchido é descartado. */
export const HONEYPOT_FIELD = `${RESERVED_FIELD_PREFIX}armadilha`

/** Caixa do "Concordo" no formulário do site (vai para o campo `consent` da mensagem). */
export const CONSENT_INPUT = `${RESERVED_FIELD_PREFIX}concordo`

/** Nome de um campo do formulário: mensagem, ou `true` quando serve. */
export function validateFieldName(name: unknown): string | true {
  if (typeof name !== 'string' || !name.trim()) return 'Dê um nome ao campo. Ex.: telefone.'
  if (name.trim().startsWith(RESERVED_FIELD_PREFIX)) {
    return `Nomes começando com "${RESERVED_FIELD_PREFIX}" são do sistema. Escolha outro.`
  }
  return true
}

const NAME_LIMIT = 60

/** "Qual é o seu Nome?" → "qual_e_o_seu_nome". Nunca começa com "_", então não pega o prefixo. */
function fieldNameBase(label: string): string {
  return (
    label
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, NAME_LIMIT)
      .replace(/^_+|_+$/g, '') || 'campo'
  )
}

type NamedField = { id?: string | null; name?: string | null; label?: string | null }

/**
 * Dá o nome técnico aos campos de um formulário. Campo que já existia (mesmo `id`) fica com o nome
 * de sempre, mesmo com a pergunta reescrita: as mensagens antigas guardam esse nome. Campo novo usa
 * o nome que veio (os modelos mandam) ou nasce da pergunta, sem repetir dentro do formulário.
 */
export function assignFieldNames<T extends NamedField>(
  fields: T[],
  originals: NamedField[] | null | undefined,
): (T & { name: string })[] {
  const known = new Map((originals ?? []).map((field) => [field.id, field.name]))
  const taken = new Set<string>()
  for (const field of fields) {
    const name = field.id ? known.get(field.id) : null
    if (name) taken.add(name)
  }
  return fields.map((field) => {
    const name = field.id ? known.get(field.id) : null
    if (name) return { ...field, name }
    const given = field.name?.trim()
    // Nome reservado passa como veio, para o `validateFieldName` recusar.
    if (given?.startsWith(RESERVED_FIELD_PREFIX)) return { ...field, name: given }
    const base = given || fieldNameBase(field.label ?? '')
    let free = base
    for (let n = 2; taken.has(free); n++) free = `${base}_${n}`
    taken.add(free)
    return { ...field, name: free }
  })
}

// A frase depois do envio fica no campo de texto rico do plugin. O painel só escreve texto corrido.
type RichNode = { text?: unknown; children?: unknown }

/** Texto corrido para o formato do campo rico, um parágrafo por linha. Vazio vira `null`. */
export function plainToRichText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return null
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: lines.map((line) => ({
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        textFormat: 0,
        children: [
          { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: line, version: 1 },
        ],
      })),
    },
  }
}

/** Do campo rico para texto corrido. Também lê o que foi escrito pela tela padrão do Payload. */
export function richTextToPlain(value: unknown): string {
  const inline = (node: RichNode): string => {
    if (typeof node.text === 'string') return node.text
    return Array.isArray(node.children) ? node.children.map(inline).join('') : ''
  }
  const root = (value as { root?: RichNode } | null | undefined)?.root
  if (!root || !Array.isArray(root.children)) return ''
  return (root.children as RichNode[])
    .map(inline)
    .filter((line) => line.trim())
    .join('\n')
}

type WithEmails = { emails?: { emailTo?: string | null }[] | null }

/** E-mail do aviso, guardado na lista `emails` do plugin: o painel só usa uma linha. */
export function formNotifyEmail(form: WithEmails): string {
  return form.emails?.find((email) => email.emailTo?.trim())?.emailTo?.trim() ?? ''
}

/** O plugin exige um assunto em cada linha de `emails`, mas quem manda o aviso é o nosso hook. */
export function notifyEmailRows(email: string): { emailTo: string; subject: string }[] {
  const address = email.trim()
  return address ? [{ emailTo: address, subject: 'Mensagem nova pelo site' }] : []
}

/** Para onde vai o aviso: o e-mail do formulário e, sem ele, o das Configurações. */
export function notifyTarget(
  form: WithEmails | null,
  siteEmail: string | null | undefined,
): string | null {
  return (form && formNotifyEmail(form)) || siteEmail?.trim() || null
}

const PHONE_CHARACTERS = /^[\d\s()+-]+$/
// Sem um DDD de exemplo: o formulário vale para sites de qualquer cidade (o "(35)" de antes
// aparecia num site de Santo André).
const PHONE_MESSAGE =
  'Digite só o número, com o DDD da sua cidade na frente. Ex.: (DDD) 99999-1234.'

/** Campo "WhatsApp ou telefone": mensagem, ou `true` quando serve. Vale no navegador e no servidor. */
export function validatePhone(value: string): string | true {
  const digits = value.replace(/\D/g, '').length
  return PHONE_CHARACTERS.test(value) && digits >= 10 && digits <= 13 ? true : PHONE_MESSAGE
}

const MAX_VALUE = 5000
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SubmissionCheck =
  | {
      ok: true
      data: { field: string; value: string }[]
      /** Arquivos enviados: o campo, o id do arquivo e a senha do envio (o servidor confere). */
      files: { field: string; id: number; token: string }[]
    }
  | { ok: false; message: string }

/** Contexto do envio: a hora de agora e os nomes das unidades das Configurações. */
export type SubmissionContext = { now?: Date; units?: string[] }

// D2: dia, horário e arquivo.

const WEEKDAY_LONG = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
]
const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay()

/** Os dias que o visitante pode escolher: de hoje até `days` à frente, nos dias da semana certos. */
export function bookableDays(
  today: string,
  days = DATE_DAYS_DEFAULT,
  weekdays = DEFAULT_WEEKDAYS,
): string[] {
  const list: string[] = []
  for (let offset = 0; offset <= days; offset++) {
    const day = addDays(today, offset)
    if (weekdays.includes(weekdayOf(day))) list.push(day)
  }
  return list
}

/** O botão do dia: "seg" e "24/11". */
export const dayButtonText = (iso: string) => ({
  weekday: WEEKDAY_SHORT[weekdayOf(iso)],
  date: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
})

/** O dia como vai na mensagem: "24/11/2026 (segunda-feira)". */
export const dayText = (iso: string) =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} (${WEEKDAY_LONG[weekdayOf(iso)]})`

/** Os horários do campo: "08:00", "08:30"... até antes do fim. */
export function timeSlots(from = '08:00', to = '18:00', step = 30): string[] {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
  const slots: string[] = []
  for (let at = minutes(from); at < minutes(to); at += step) {
    slots.push(
      `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`,
    )
  }
  return slots
}

/** A hora de agora em Brasília: "14:05". */
export function clockInBrazil(now: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now)
}

/** Os horários que ainda servem no dia escolhido: hoje, só os que não passaram. */
export function openSlots(slots: string[], day: string | null | undefined, now: Date): string[] {
  if (!day || day !== todayInBrazil(now)) return slots
  const clock = clockInBrazil(now)
  return slots.filter((slot) => slot > clock)
}

/** Tipos de arquivo de cada opção (pelo tipo e, quando o navegador não diz, pela extensão). */
export const FILE_TYPES: Record<FileAccept, { mime: string[]; ext: string[]; names: string }> = {
  photo: {
    mime: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    ext: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
    names: 'foto (JPG, PNG, WEBP ou HEIC)',
  },
  document: {
    mime: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    ext: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'pdf', 'doc', 'docx'],
    names: 'foto, PDF ou Word',
  },
}

/** `accept` do campo de arquivo do navegador. */
export const acceptAttribute = (accept: FileAccept) =>
  [...FILE_TYPES[accept].mime, ...FILE_TYPES[accept].ext.map((ext) => `.${ext}`)].join(',')

/** "1,2 MB", "830 KB". */
export function fileSizeText(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',').replace(',0', '')} MB`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Confere um arquivo antes de enviar: mensagem, ou `true` quando serve. Vale no navegador e no servidor. */
export function checkFile(
  file: { name: string; type: string; size: number },
  accept: FileAccept,
): string | true {
  if (!file.size) return 'O arquivo está vazio. Escolha outro.'
  if (file.size > FILE_MAX_BYTES) {
    return `O arquivo tem ${fileSizeText(file.size)}. O máximo é ${fileSizeText(FILE_MAX_BYTES)}.`
  }
  const types = FILE_TYPES[accept]
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const typeOk = file.type ? types.mime.includes(file.type) : false
  const genericType = !file.type || file.type === 'application/octet-stream'
  if (!typeOk && !(genericType && types.ext.includes(ext))) {
    return `Esse tipo de arquivo não vale aqui. Envie ${types.names}.`
  }
  return true
}

/** O valor de um campo de arquivo no envio: "12.senha". */
const FILE_VALUE = /^(\d{1,12})\.([A-Za-z0-9_-]{16,64})$/

/**
 * Confere um envio contra o formulário: campos obrigatórios, e-mail e telefone válidos, opções da
 * lista e tamanho. Campos que o formulário não tem são descartados.
 */
export function checkSubmission(
  form: FormDefinition,
  submission: { field?: unknown; value?: unknown }[] | null | undefined,
  context: SubmissionContext = {},
): SubmissionCheck {
  const now = context.now ?? new Date()
  const today = todayInBrazil(now)
  const units = context.units ?? []
  const values = new Map<string, string>()
  for (const item of submission ?? []) {
    if (typeof item?.field === 'string' && typeof item.value === 'string') {
      values.set(item.field, item.value.trim())
    }
  }

  const data: { field: string; value: string }[] = []
  const files: { field: string; id: number; token: string }[] = []
  // O dia escolhido no formulário (o primeiro campo de dia): o horário de hoje não pode ter passado.
  const dayField = form.fields.find((field) => field.type === 'date')
  const chosenDay = dayField ? values.get(dayField.name) : undefined
  for (const field of form.fields) {
    const value = values.get(field.name) ?? ''
    // Unidade sem nenhuma unidade nas Configurações: o campo nem aparece no site.
    if (field.type === 'unit' && !units.length) continue
    if (field.type === 'checkbox') {
      const checked = value === 'true'
      if (field.required && !checked) return { ok: false, message: `Marque “${field.label}”.` }
      data.push({ field: field.name, value: checked ? 'Sim' : 'Não' })
      continue
    }
    if (!value) {
      if (field.required) return { ok: false, message: `Preencha “${field.label}”.` }
      continue
    }
    if (value.length > MAX_VALUE) {
      return { ok: false, message: `“${field.label}” passou do limite de ${MAX_VALUE} letras.` }
    }
    if (field.type === 'email' && !EMAIL.test(value)) {
      return { ok: false, message: `Confira o e-mail em “${field.label}”.` }
    }
    if (field.type === 'phone') {
      const phone = validatePhone(value)
      if (phone !== true) return { ok: false, message: `“${field.label}”: ${phone}` }
    }
    if (field.type === 'select' && !field.options.some((option) => option.value === value)) {
      return { ok: false, message: `Escolha uma opção em “${field.label}”.` }
    }
    if (field.type === 'unit' && !units.includes(value)) {
      return { ok: false, message: `Escolha uma unidade em “${field.label}”.` }
    }
    if (field.type === 'date') {
      if (!bookableDays(today, field.days, field.weekdays).includes(value)) {
        return { ok: false, message: `Escolha um dia da lista em “${field.label}”.` }
      }
      data.push({ field: field.name, value: dayText(value) })
      continue
    }
    if (field.type === 'time') {
      const slots = timeSlots(field.from, field.to, field.step)
      if (!slots.includes(value)) {
        return { ok: false, message: `Escolha um horário da lista em “${field.label}”.` }
      }
      if (!openSlots(slots, chosenDay, now).includes(value)) {
        return { ok: false, message: `O horário de “${field.label}” já passou. Escolha outro.` }
      }
    }
    if (field.type === 'file') {
      const match = FILE_VALUE.exec(value)
      if (!match) return { ok: false, message: `Envie o arquivo de novo em “${field.label}”.` }
      files.push({ field: field.name, id: Number(match[1]), token: match[2] })
    }
    data.push({ field: field.name, value })
  }
  if (!data.length) return { ok: false, message: 'Preencha o formulário antes de enviar.' }
  return { ok: true, data, files }
}

/** Uma página que usa o formulário, com o estado dela: no ar, só rascunho ou arquivada. */
export type FormPage = { id: number; title: string; state: 'live' | 'draft' | 'archived' }

/** "Em breve (arquivada)", "Promoção (rascunho)" ou só o nome, se está no ar. */
export const formPageName = (page: FormPage) =>
  page.state === 'live'
    ? page.title
    : `${page.title} (${page.state === 'archived' ? 'arquivada' : 'rascunho'})`
