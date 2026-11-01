import { describe, expect, it } from 'vitest'

import {
  assignFieldNames,
  checkSubmission,
  DEFAULT_FORM,
  FORM_STARTERS,
  formNotifyEmail,
  notifyEmailRows,
  notifyTarget,
  plainToRichText,
  richTextToPlain,
  templateBlockType,
  toFormDefinition,
  validateFieldName,
  validatePhone,
} from '@/lib/forms'

const form = toFormDefinition({ id: 1, ...DEFAULT_FORM })

describe('formulários', () => {
  it('lê o formulário padrão do plugin', () => {
    expect(form.fields.map((field) => field.name)).toEqual([
      'nome',
      'whatsapp',
      'email',
      'mensagem',
    ])
    expect(form.submitLabel).toBe('Enviar')
  })

  it('aceita um envio certo e descarta campos que o formulário não tem', () => {
    const result = checkSubmission(form, [
      { field: 'nome', value: ' Ana ' },
      { field: 'mensagem', value: 'Olá' },
      { field: 'extra', value: 'x' },
    ])
    expect(result).toEqual({
      ok: true,
      data: [
        { field: 'nome', value: 'Ana' },
        { field: 'mensagem', value: 'Olá' },
      ],
    })
  })

  it('recusa campo obrigatório vazio e e-mail inválido', () => {
    expect(checkSubmission(form, [{ field: 'nome', value: 'Ana' }])).toMatchObject({ ok: false })
    expect(
      checkSubmission(form, [
        { field: 'nome', value: 'Ana' },
        { field: 'mensagem', value: 'Oi' },
        { field: 'email', value: 'sem-arroba' },
      ]),
    ).toMatchObject({ ok: false, message: 'Confira o e-mail em “E-mail”.' })
  })
})

describe('nome técnico dos campos', () => {
  it('nasce da pergunta: sem acento, minúsculo, sem o prefixo reservado', () => {
    const named = assignFieldNames(
      [{ label: 'Qual é o seu Endereço?' }, { label: '_gp_concordo' }, { label: '???' }],
      [],
    )
    expect(named.map((field) => field.name)).toEqual([
      'qual_e_o_seu_endereco',
      'gp_concordo',
      'campo',
    ])
    for (const field of named) expect(validateFieldName(field.name)).toBe(true)
  })

  it('não muda ao reescrever a pergunta nem ao mudar o tipo', () => {
    const original = [{ id: 'a', name: 'telefone', label: 'Telefone', blockType: 'text' }]
    const [field] = assignFieldNames(
      [{ id: 'a', name: 'outro', label: 'Seu WhatsApp', blockType: 'phone' }],
      original,
    )
    expect(field.name).toBe('telefone')
    expect(field.label).toBe('Seu WhatsApp')
  })

  it('não repete dentro do formulário, nem com um campo que já existia', () => {
    const named = assignFieldNames(
      [{ label: 'Nome' }, { id: 'a', label: 'Reescrita' }, { label: 'Nome' }, { label: 'nome!' }],
      [{ id: 'a', name: 'nome', label: 'Nome' }],
    )
    expect(named.map((field) => field.name)).toEqual(['nome_2', 'nome', 'nome_3', 'nome_4'])
  })

  it('modelos mandam o nome; nome reservado passa para a validação recusar', () => {
    expect(assignFieldNames([{ name: 'whatsapp', label: 'Fone' }], [])[0].name).toBe('whatsapp')
    const [reserved] = assignFieldNames([{ name: '_gp_x', label: 'X' }], [])
    expect(validateFieldName(reserved.name)).not.toBe(true)
  })

  it('o WhatsApp dos modelos de site vira o tipo novo', () => {
    expect(templateBlockType('text', 'whatsapp')).toBe('phone')
    expect(templateBlockType('text', 'nome')).toBe('text')
    expect(templateBlockType('email', 'whatsapp')).toBe('email')
  })

  it('os formulários prontos têm nomes distintos', () => {
    for (const starter of FORM_STARTERS) {
      const names = assignFieldNames(starter.fields, []).map((field) => field.name)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})

describe('WhatsApp ou telefone', () => {
  it('aceita número com DDD, com ou sem máscara', () => {
    for (const value of ['(35) 99876-5432', '3532221111', '+55 35 99876-5432', '5535998765432']) {
      expect(validatePhone(value)).toBe(true)
    }
  })

  it('recusa letras e quantidade errada de dígitos', () => {
    for (const value of ['abc', '35 abc 99999-0000', '123456789', '12345678901234']) {
      expect(typeof validatePhone(value)).toBe('string')
    }
  })

  it('o servidor recusa com mensagem simples, e vazio passa quando é opcional', () => {
    const definition = toFormDefinition({
      id: 1,
      fields: [{ blockType: 'phone', name: 'fone', label: 'Telefone' }],
    })
    const refused = checkSubmission(definition, [{ field: 'fone', value: 'abc' }])
    expect(refused).toMatchObject({ ok: false })
    expect(refused).toHaveProperty('message', expect.stringContaining('Telefone'))
    expect(
      checkSubmission(definition, [{ field: 'fone', value: '(35) 99876-5432' }]),
    ).toMatchObject({ ok: true })
  })
})

describe('depois do envio', () => {
  it('a frase vai e volta do campo rico', () => {
    expect(richTextToPlain(plainToRichText('Obrigado!\n\nRespondemos logo.'))).toBe(
      'Obrigado!\nRespondemos logo.',
    )
    expect(plainToRichText('  ')).toBeNull()
    expect(richTextToPlain(null)).toBe('')
    expect(toFormDefinition({ id: 1, confirmationMessage: plainToRichText('Oi') })).toMatchObject({
      successMessage: 'Oi',
    })
  })

  it('o aviso vai para o e-mail do formulário ou, vazio, para o das Configurações', () => {
    const form = { emails: notifyEmailRows(' dono@exemplo.com ') }
    expect(formNotifyEmail(form)).toBe('dono@exemplo.com')
    expect(notifyTarget(form, 'site@exemplo.com')).toBe('dono@exemplo.com')
    expect(notifyTarget({ emails: notifyEmailRows('') }, 'site@exemplo.com')).toBe(
      'site@exemplo.com',
    )
    expect(notifyTarget({ emails: [] }, null)).toBeNull()
    expect(notifyTarget(null, 'site@exemplo.com')).toBe('site@exemplo.com')
  })
})
