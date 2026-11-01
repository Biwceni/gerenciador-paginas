import { describe, expect, it } from 'vitest'

import { toFormDefinition } from '@/lib/forms'
import {
  csvCell,
  messageDate,
  messageEmail,
  messageFields,
  messageMailto,
  messagePreview,
  messageSender,
  messagesCsv,
  messageWhatsApp,
} from '@/lib/messages'

const form = toFormDefinition({
  id: 1,
  title: 'Contato',
  fields: [
    { blockType: 'text', name: 'seu_nome', label: 'Seu nome' },
    { blockType: 'phone', name: 'whatsapp', label: 'WhatsApp' },
    { blockType: 'email', name: 'email', label: 'E-mail' },
    { blockType: 'textarea', name: 'mensagem', label: 'Mensagem' },
  ],
})

const data = [
  { field: 'seu_nome', value: 'Ana Souza' },
  { field: 'whatsapp', value: '(35) 99876-5432' },
  { field: 'email', value: 'ana@exemplo.com' },
  { field: 'mensagem', value: 'Vocês têm café descafeinado?' },
]

describe('mensagem na caixa de entrada', () => {
  it('mostra os rótulos das perguntas, não os nomes técnicos', () => {
    expect(messageFields(form, data).map((field) => field.label)).toEqual([
      'Seu nome',
      'WhatsApp',
      'E-mail',
      'Mensagem',
    ])
  })

  it('pergunta que saiu do formulário vira um rótulo legível', () => {
    const [field] = messageFields(form, [{ field: 'cor_favorita', value: 'Azul' }])
    expect(field).toMatchObject({ label: 'Cor favorita', type: null, value: 'Azul' })
  })

  it('acha quem mandou e o trecho da mensagem', () => {
    const fields = messageFields(form, data)
    expect(messageSender(fields)).toBe('Ana Souza')
    expect(messagePreview(fields, 'Ana Souza')).toBe('Vocês têm café descafeinado?')
    expect(messageSender(messageFields(form, [{ field: 'mensagem', value: 'Oi' }]))).toBe(
      'Sem nome',
    )
  })

  it('o trecho pula nome e contato e encurta texto longo', () => {
    const noLong = messageFields(form, data.slice(0, 3))
    expect(messagePreview(noLong, 'Ana Souza')).toBe('')
    const long = messageFields(form, [{ field: 'mensagem', value: 'a'.repeat(300) }])
    expect(messagePreview(long, 'Sem nome').length).toBeLessThanOrEqual(120)
  })

  it('WhatsApp só com o campo do tipo novo preenchido e número que sirva', () => {
    const fields = messageFields(form, data)
    expect(messageWhatsApp(fields, 'Ana Souza')).toBe(
      'https://wa.me/5535998765432?text=Ol%C3%A1%2C%20Ana!',
    )
    expect(messageWhatsApp(messageFields(form, data.slice(0, 1)), 'Ana Souza')).toBeNull()
    // Campo de texto chamado "whatsapp" (antes da conversão) não vale.
    const text = toFormDefinition({
      id: 2,
      fields: [{ blockType: 'text', name: 'whatsapp', label: 'WhatsApp' }],
    })
    expect(messageWhatsApp(messageFields(text, data), 'Ana')).toBeNull()
  })

  it('e-mail só com o campo preenchido, e o endereço vai codificado', () => {
    expect(messageEmail(messageFields(form, data))).toBe('ana@exemplo.com')
    expect(messageEmail(messageFields(form, data.slice(0, 1)))).toBeNull()
    expect(messageMailto('a?bcc=x@exemplo.com')).toMatch(
      /^mailto:a%3Fbcc%3Dx@exemplo\.com\?subject=/,
    )
  })

  it('data no horário de Brasília', () => {
    expect(messageDate('2026-10-27T18:04:00.000Z')).toBe('27/10/2026 às 15:04')
  })
})

describe('planilha', () => {
  it('neutraliza fórmulas com um apóstrofo', () => {
    for (const value of ['=1+1', '+5535', '-2', '@soma']) {
      expect(csvCell(value)).toBe(`"'${value}"`)
    }
    expect(csvCell('Café 100%')).toBe('"Café 100%"')
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""')
  })

  it('tem BOM, separador ; e acentos, uma linha por mensagem', () => {
    const csv = messagesCsv([
      {
        createdAt: '2026-10-27T18:04:00.000Z',
        formTitle: 'Orçamento',
        pageTitle: 'Início',
        fields: [
          { label: 'Nome', value: 'João' },
          { label: 'Pedido', value: '=HYPERLINK("x")' },
        ],
        consentText: 'Concordo',
      },
      {
        createdAt: '2026-10-28T18:04:00.000Z',
        formTitle: 'Contato',
        pageTitle: '',
        fields: [{ label: 'Nome', value: 'Ana' }],
        consentText: 'Concordo',
      },
    ])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const lines = csv.slice(1).trimEnd().split('\r\n')
    expect(lines).toEqual([
      '"Data";"Formulário";"Página";"Nome";"Pedido";"Frase aceita"',
      `"27/10/2026 às 15:04";"Orçamento";"Início";"João";"'=HYPERLINK(""x"")";"Concordo"`,
      '"28/10/2026 às 15:04";"Contato";"";"Ana";"";"Concordo"',
    ])
  })
})
