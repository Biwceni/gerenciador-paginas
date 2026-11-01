// Formulários do site (plugin oficial de formulários do Payload). Aqui fica o que a seção e o
// servidor dividem: o formato que a seção desenha, o formulário padrão e a conferência de um envio.

export type FormFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox'

export type FormFieldDefinition = {
  type: FormFieldType
  name: string
  label: string
  required: boolean
  placeholder: string
  options: { label: string; value: string }[]
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

const FIELD_TYPES: FormFieldType[] = ['text', 'email', 'phone', 'textarea', 'select', 'checkbox']

/** Tipos de resposta como o leigo escolhe na tela de Formulários. */
export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  email: 'E-mail',
  phone: 'WhatsApp ou telefone',
  select: 'Lista de opções',
  checkbox: 'Caixa de marcar',
}

type RawBlock = {
  blockType?: string
  name?: string | null
  label?: string | null
  required?: boolean | null
  placeholder?: string | null
  options?: { label?: string | null; value?: string | null }[] | null
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
const PHONE_MESSAGE = 'Digite só o número com DDD. Ex.: (35) 99999-1234.'

/** Campo "WhatsApp ou telefone": mensagem, ou `true` quando serve. Vale no navegador e no servidor. */
export function validatePhone(value: string): string | true {
  const digits = value.replace(/\D/g, '').length
  return PHONE_CHARACTERS.test(value) && digits >= 10 && digits <= 13 ? true : PHONE_MESSAGE
}

const MAX_VALUE = 5000
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SubmissionCheck =
  { ok: true; data: { field: string; value: string }[] } | { ok: false; message: string }

/**
 * Confere um envio contra o formulário: campos obrigatórios, e-mail e telefone válidos, opções da
 * lista e tamanho. Campos que o formulário não tem são descartados.
 */
export function checkSubmission(
  form: FormDefinition,
  submission: { field?: unknown; value?: unknown }[] | null | undefined,
): SubmissionCheck {
  const values = new Map<string, string>()
  for (const item of submission ?? []) {
    if (typeof item?.field === 'string' && typeof item.value === 'string') {
      values.set(item.field, item.value.trim())
    }
  }

  const data: { field: string; value: string }[] = []
  for (const field of form.fields) {
    const value = values.get(field.name) ?? ''
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
    data.push({ field: field.name, value })
  }
  if (!data.length) return { ok: false, message: 'Preencha o formulário antes de enviar.' }
  return { ok: true, data }
}
