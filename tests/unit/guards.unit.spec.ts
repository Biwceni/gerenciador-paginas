import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { checkFormSubmission } from '@/hooks/formSubmissions'
import { protectHomepageUnpublish } from '@/hooks/protectPage'
import { HONEYPOT_FIELD, validateFieldName } from '@/lib/forms'

// Regras do servidor com o Payload simulado: testá-las no banco mexeria no site no ar.

type HookArgs = Parameters<typeof protectHomepageUnpublish>[0]

const homepageReq = (extra: Partial<PayloadRequest>) =>
  ({
    payloadAPI: 'REST',
    query: {},
    payload: { findGlobal: async () => ({ homepage: 5 }) },
    ...extra,
  }) as unknown as PayloadRequest

const unpublish = (req: PayloadRequest, id = 5) =>
  protectHomepageUnpublish({
    data: { _status: 'draft' },
    operation: 'update',
    originalDoc: { id },
    req,
  } as unknown as HookArgs)

describe('página inicial', () => {
  it('não sai do ar pela API', async () => {
    await expect(unpublish(homepageReq({}))).rejects.toThrow('A página inicial não pode sair do ar')
  })

  it('aceita salvar rascunho dela e tirar do ar outras páginas', async () => {
    await expect(unpublish(homepageReq({ query: { draft: 'true' } }))).resolves.toBeTruthy()
    await expect(unpublish(homepageReq({}), 7)).resolves.toBeTruthy()
    await expect(unpublish(homepageReq({ payloadAPI: 'local' }))).resolves.toBeTruthy()
  })
})

describe('mensagens do formulário', () => {
  const submit = (count: number, data: object) =>
    checkFormSubmission({
      data,
      operation: 'create',
      req: { payload: { count: async () => ({ totalDocs: count }) } },
    } as unknown as Parameters<typeof checkFormSubmission>[0])

  it('recusa quando chegaram muitas mensagens em pouco tempo', async () => {
    await expect(submit(20, { consent: true, submissionData: [] })).rejects.toThrow(
      'Chegaram muitas mensagens agora',
    )
  })

  it('recusa robô antes de qualquer outra coisa', async () => {
    await expect(
      submit(0, { consent: true, submissionData: [{ field: HONEYPOT_FIELD, value: 'x' }] }),
    ).rejects.toThrow('Não deu para enviar a mensagem.')
  })

  it('não deixa o leigo usar os nomes do sistema', () => {
    expect(validateFieldName('telefone')).toBe(true)
    expect(validateFieldName('_gp_concordo')).not.toBe(true)
    expect(validateFieldName('')).not.toBe(true)
  })
})
