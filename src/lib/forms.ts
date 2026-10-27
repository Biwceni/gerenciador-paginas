// Formulários do site (plugin oficial de formulários do Payload). Aqui fica o que a seção e o
// servidor dividem: o formato que a seção desenha, o formulário padrão e a conferência de um envio.

export type FormFieldType = 'text' | 'email' | 'textarea' | 'select' | 'checkbox'

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
  fields: FormFieldDefinition[]
}

const FIELD_TYPES: FormFieldType[] = ['text', 'email', 'textarea', 'select', 'checkbox']

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
  fields?: RawBlock[] | null
}): FormDefinition {
  return {
    id: doc.id,
    title: doc.title ?? '',
    submitLabel: doc.submitButtonLabel?.trim() || 'Enviar',
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
    { blockType: 'text', name: 'whatsapp', label: 'WhatsApp', required: false, width: 100 },
    { blockType: 'email', name: 'email', label: 'E-mail', required: false, width: 100 },
    { blockType: 'textarea', name: 'mensagem', label: 'Mensagem', required: true, width: 100 },
  ],
}

/** Frase da caixa obrigatória (LGPD). Vai junto com a mensagem guardada. */
export const CONSENT_TEXT =
  'Concordo com o uso dos meus dados para receber resposta a esta mensagem.'

/** Campo escondido: só robô preenche. Envio com ele preenchido é descartado. */
export const HONEYPOT_FIELD = 'site_url'

const MAX_VALUE = 5000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SubmissionCheck =
  { ok: true; data: { field: string; value: string }[] } | { ok: false; message: string }

/**
 * Confere um envio contra o formulário: campos obrigatórios, e-mail válido, opções da lista e
 * tamanho. Campos que o formulário não tem são descartados.
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
    if (field.type === 'select' && !field.options.some((option) => option.value === value)) {
      return { ok: false, message: `Escolha uma opção em “${field.label}”.` }
    }
    data.push({ field: field.name, value })
  }
  if (!data.length) return { ok: false, message: 'Preencha o formulário antes de enviar.' }
  return { ok: true, data }
}
