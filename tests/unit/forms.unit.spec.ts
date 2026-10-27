import { describe, expect, it } from 'vitest'

import { checkSubmission, DEFAULT_FORM, toFormDefinition } from '@/lib/forms'

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
