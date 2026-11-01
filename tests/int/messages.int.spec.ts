import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { CONSENT_TEXT, notifyEmailRows } from '@/lib/forms'
import { UNREAD } from '@/lib/messages'
import config from '@/payload.config'
import type { Form, User } from '@/payload-types'
import { emptyPageContent } from '@/puck/schema'

// Mensagens e formulários (v2, entrega 3a) com a API local, como o painel e o site chamam, no banco
// de TEST_DATABASE_URL.

let payload: Payload
let user: User
let form: Form
const messages: number[] = []
const pages: number[] = []
const forms: number[] = []

const FIELDS = [
  { blockType: 'text', label: 'Nome', required: true },
  { blockType: 'phone', label: 'WhatsApp', required: false },
] as Form['fields']

const newForm = async (data: Partial<Form> = {}) => {
  const doc = await payload.create({
    collection: 'forms',
    data: { title: 'Teste', confirmationType: 'message', fields: FIELDS, ...data } as Form,
    overrideAccess: true,
  })
  forms.push(doc.id)
  return doc
}

/** O envio pelo site: visitante sem conta. */
const send = async (formId: number, phone = '(35) 99876-5432') => {
  const doc = await payload.create({
    collection: 'form-submissions',
    data: {
      form: formId,
      consent: true,
      submissionData: [
        { field: 'nome', value: 'Ana' },
        { field: 'whatsapp', value: phone },
      ],
    },
    overrideAccess: false,
  })
  messages.push(doc.id)
  return doc
}

describe('mensagens', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    user = await payload.create({
      collection: 'users',
      data: {
        email: `mensagens-${Date.now()}@exemplo.com`,
        password: 'senha-de-teste-1',
        role: 'admin',
      },
      overrideAccess: true,
    })
    form = await newForm()
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await payload.updateGlobal({
      slug: 'site',
      data: { contact: { email: null }, _status: 'published' },
      overrideAccess: true,
    })
    for (const id of messages) {
      await payload
        .delete({ collection: 'form-submissions', id, overrideAccess: true })
        .catch(() => null)
    }
    for (const id of pages) {
      await payload
        .delete({ collection: 'pages', id, overrideAccess: true, context: { seedRecreate: true } })
        .catch(() => null)
    }
    for (const id of forms) {
      await payload.delete({ collection: 'forms', id, overrideAccess: true }).catch(() => null)
    }
    await payload
      .delete({ collection: 'users', id: user.id, overrideAccess: true })
      .catch(() => null)
  })

  it('nasce não lida, mesmo se o visitante mandar lida', async () => {
    const doc = await payload.create({
      collection: 'form-submissions',
      data: {
        form: form.id,
        consent: true,
        read: true,
        submissionData: [{ field: 'nome', value: 'Ana' }],
      },
      overrideAccess: false,
    })
    messages.push(doc.id)
    expect(doc.read).toBe(false)
    expect(doc.consentText).toBe(CONSENT_TEXT)
  })

  it('pessoa logada muda só o campo `read`', async () => {
    const doc = await send(form.id)
    const updated = await payload.update({
      collection: 'form-submissions',
      id: doc.id,
      data: {
        read: true,
        consent: false,
        consentText: 'trocada',
        form: forms[0],
        page: 999999,
        submissionData: [{ field: 'nome', value: 'Outra pessoa' }],
      },
      overrideAccess: false,
      user,
    })
    expect(updated.read).toBe(true)
    expect(updated.consent).toBe(true)
    expect(updated.consentText).toBe(CONSENT_TEXT)
    expect(updated.page ?? null).toBeNull()
    expect(updated.submissionData?.map((item) => item.value)).toEqual(['Ana', '(35) 99876-5432'])

    const stored = await payload.findByID({
      collection: 'form-submissions',
      id: doc.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(stored.submissionData?.map((item) => item.value)).toEqual(['Ana', '(35) 99876-5432'])
  })

  it('sem login, ninguém altera, lê nem exclui', async () => {
    const doc = await send(form.id)
    const common = { collection: 'form-submissions', id: doc.id, overrideAccess: false } as const
    await expect(payload.update({ ...common, data: { read: true } })).rejects.toThrow()
    await expect(payload.findByID(common)).rejects.toThrow()
    await expect(payload.delete(common)).rejects.toThrow()
  })

  it('conta as não lidas', async () => {
    const count = async () =>
      (
        await payload.count({
          collection: 'form-submissions',
          where: UNREAD,
          overrideAccess: false,
          user,
        })
      ).totalDocs
    const before = await count()
    const doc = await send(form.id)
    expect(await count()).toBe(before + 1)
    await payload.update({
      collection: 'form-submissions',
      id: doc.id,
      data: { read: true },
      overrideAccess: false,
      user,
    })
    expect(await count()).toBe(before)
  })

  it('o servidor recusa telefone inválido', async () => {
    await expect(send(form.id, 'abc')).rejects.toThrow(/DDD/)
  })

  it('aviso: e-mail do formulário e, vazio, o das Configurações, um só por mensagem', async () => {
    await payload.updateGlobal({
      slug: 'site',
      data: { contact: { email: 'site@exemplo.com' }, _status: 'published' },
      overrideAccess: true,
    })
    const sendEmail = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined)

    await send(form.id)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.lastCall?.[0]).toMatchObject({ to: ['site@exemplo.com'] })

    const own = await newForm({ emails: notifyEmailRows('dono@exemplo.com') })
    await send(own.id)
    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(sendEmail.mock.lastCall?.[0]).toMatchObject({ to: ['dono@exemplo.com'] })
    expect(sendEmail.mock.lastCall?.[0].html).toContain('/admin/mensagens?mensagem=')
  })
})

describe('formulários', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('o nome técnico nasce da pergunta e não muda ao reescrever', async () => {
    const doc = await newForm()
    expect(doc.fields?.map((field) => field.name)).toEqual(['nome', 'whatsapp'])
    expect(doc.fields?.map((field) => field.width)).toEqual([100, 100])

    const updated = await payload.update({
      collection: 'forms',
      id: doc.id,
      data: {
        fields: [
          { ...doc.fields![1], label: 'Celular', name: 'tentativa' },
          { ...doc.fields![0], label: 'Como se chama?' },
          { blockType: 'text', label: 'Nome' },
        ] as Form['fields'],
      },
      overrideAccess: true,
    })
    expect(updated.fields?.map((field) => [field.name, field.label])).toEqual([
      ['whatsapp', 'Celular'],
      ['nome', 'Como se chama?'],
      ['nome_2', 'Nome'],
    ])
  })

  it('nome com o prefixo reservado é recusado', async () => {
    await expect(
      payload.create({
        collection: 'forms',
        data: {
          title: 'Reservado',
          confirmationType: 'message',
          fields: [{ blockType: 'text', name: '_gp_concordo', label: 'X' }],
        } as Form,
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('e-mail do aviso inválido é recusado', async () => {
    await expect(newForm({ emails: notifyEmailRows('sem-arroba') })).rejects.toThrow()
  })

  it('formulário em uso numa página não pode ser excluído', async () => {
    const doc = await newForm()
    const content = emptyPageContent()
    content.data.content.push({
      type: 'Form',
      props: {
        id: 'Form-1',
        menuLabel: '',
        title: 'Fale',
        text: '',
        form: { formId: doc.id },
        successMessage: '',
        style: 'soft',
      },
    })
    const page = await payload.create({
      collection: 'pages',
      data: { title: 'Com form', slug: `com-form-${Date.now()}`, content, _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    pages.push(page.id)
    await expect(
      payload.delete({ collection: 'forms', id: doc.id, overrideAccess: true }),
    ).rejects.toThrow(/Com form/)
  })

  it('formulário com mensagens não pode ser excluído; sem nada, pode', async () => {
    const doc = await newForm()
    await send(doc.id)
    await expect(
      payload.delete({ collection: 'forms', id: doc.id, overrideAccess: true }),
    ).rejects.toThrow(/mensagem/)

    const free = await newForm()
    await expect(
      payload.delete({ collection: 'forms', id: free.id, overrideAccess: true }),
    ).resolves.toMatchObject({ id: free.id })
  })
})
