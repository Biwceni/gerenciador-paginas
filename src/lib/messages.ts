// Mensagens dos formulários como o painel mostra: a caixa de entrada, o aviso no Painel e a planilha.

import type { FormDefinition, FormFieldType } from './forms'
import { whatsAppURL } from './links'

/** Só as não lidas (número no menu e cartão do Painel). */
export const UNREAD = { read: { equals: false } } as const

type RawData = { field?: string | null; value?: string | null }[] | null | undefined

export type MessageField = {
  name: string
  label: string
  type: FormFieldType | null
  value: string
}

/** "cor_favorita" → "Cor favorita": para a pergunta que já saiu do formulário. */
function labelFromName(name: string): string {
  const text = name.replace(/_/g, ' ').trim()
  return text ? text[0].toUpperCase() + text.slice(1) : name
}

/** Os dados de uma mensagem com os rótulos das perguntas, nunca os nomes técnicos. */
export function messageFields(
  form: FormDefinition | null | undefined,
  data: RawData,
): MessageField[] {
  return (data ?? []).flatMap((item) => {
    if (!item.field) return []
    const field = form?.fields.find(({ name }) => name === item.field)
    return [
      {
        name: item.field,
        label: field?.label ?? labelFromName(item.field),
        type: field?.type ?? null,
        value: item.value ?? '',
      },
    ]
  })
}

/** Nome de quem mandou: a pergunta com "nome" ou, sem ela, o primeiro texto curto. */
export function messageSender(fields: MessageField[]): string {
  const named = fields.find(
    ({ label, type, value }) =>
      value && (type === 'text' || type === null) && /\bnome\b/i.test(label),
  )
  const first = fields.find(({ type, value }) => value && type === 'text')
  return (named ?? first)?.value || 'Sem nome'
}

/** Trecho da lista: o primeiro texto longo ou, sem ele, o que não for nome nem contato. */
export function messagePreview(fields: MessageField[], sender: string): string {
  const long = fields.find(({ type, value }) => value && type === 'textarea')
  const text =
    long?.value ??
    fields
      .filter(
        ({ type, value }) => value && value !== sender && type !== 'email' && type !== 'phone',
      )
      .map(({ value }) => value)
      .join(' · ')
  return text.length > 120 ? `${text.slice(0, 119).trimEnd()}…` : text
}

/** Botão do WhatsApp: só com um campo do tipo "WhatsApp ou telefone" preenchido e número que sirva. */
export function messageWhatsApp(fields: MessageField[], sender: string): string | null {
  const phone = fields.find(({ type, value }) => type === 'phone' && value)
  const url = whatsAppURL(phone?.value)
  if (!url) return null
  const firstName = sender === 'Sem nome' ? '' : sender.split(/\s+/)[0]
  return `${url}?text=${encodeURIComponent(firstName ? `Olá, ${firstName}!` : 'Olá!')}`
}

/** Botão do e-mail: só com um campo de e-mail preenchido. */
export function messageEmail(fields: MessageField[]): string | null {
  return fields.find(({ type, value }) => type === 'email' && value)?.value ?? null
}

/** Abre o e-mail da pessoa com o endereço preenchido. O endereço veio do visitante: vai codificado. */
export function messageMailto(email: string): string {
  const subject = encodeURIComponent('Resposta à sua mensagem')
  return `mailto:${encodeURIComponent(email).replace('%40', '@')}?subject=${subject}`
}

/** "27/10/2026 às 15:04", no horário de Brasília. */
export function messageDate(date: Date | string): string {
  const value = new Date(date)
  const zone = { timeZone: 'America/Sao_Paulo' }
  return `${value.toLocaleDateString('pt-BR', zone)} às ${value.toLocaleTimeString('pt-BR', {
    ...zone,
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

/**
 * Uma célula da planilha. Texto que começa com `=`, `+`, `-` ou `@` o Excel executa como fórmula: o
 * visitante escreve o que quiser no formulário, então ganha um apóstrofo na frente.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export type SpreadsheetMessage = {
  createdAt: string
  formTitle: string
  pageTitle: string
  fields: Pick<MessageField, 'label' | 'value'>[]
  consentText: string
}

/**
 * Planilha com uma linha por mensagem e uma coluna por pergunta (mesma pergunta em formulários
 * diferentes cai na mesma coluna). Separador `;` e UTF-8 com BOM, para abrir certo no Excel em
 * português. Quem chama garante que só as mensagens do filtro chegam aqui.
 */
export function messagesCsv(messages: SpreadsheetMessage[]): string {
  const questions = [...new Set(messages.flatMap(({ fields }) => fields.map((f) => f.label)))]
  const rows = [
    ['Data', 'Formulário', 'Página', ...questions, 'Frase aceita'],
    ...messages.map((message) => {
      const answers = new Map(message.fields.map(({ label, value }) => [label, value]))
      return [
        messageDate(message.createdAt),
        message.formTitle,
        message.pageTitle,
        ...questions.map((question) => answers.get(question) ?? ''),
        message.consentText,
      ]
    }),
  ]
  return `﻿${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`
}
