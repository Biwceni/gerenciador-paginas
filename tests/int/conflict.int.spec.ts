import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { PAGE_VERSION_HEADER } from '@/lib/editor'
import config from '@/payload.config'
import type { Page } from '@/payload-types'
import { emptyPageContent } from '@/puck/schema'

// Aviso de conflito do editor (v2, entrega 2a), com as mesmas chamadas que o editor faz, no banco de
// TEST_DATABASE_URL.

let payload: Payload
let page: Page

const withVersion = (updatedAt: string) =>
  ({ headers: new Headers({ [PAGE_VERSION_HEADER]: updatedAt }) }) as Partial<PayloadRequest>

/** O salvamento automático do editor, trabalhando na versão \`base\`. */
const autosave = (base: string) =>
  payload.update({
    collection: 'pages',
    id: page.id,
    data: { content: emptyPageContent(), title: `Editado ${Date.now()}` },
    draft: true,
    autosave: true,
    overrideAccess: true,
    req: withVersion(base),
  })

/** O botão Publicar do editor, trabalhando na versão \`base\`. */
const publish = (base: string) =>
  payload.update({
    collection: 'pages',
    id: page.id,
    data: { content: emptyPageContent(), _status: 'published' },
    overrideAccess: true,
    req: withVersion(base),
  })

const opened = async () =>
  (
    await payload.findByID({
      collection: 'pages',
      id: page.id,
      depth: 1,
      draft: true,
      overrideAccess: true,
    })
  ).updatedAt

const pause = () => new Promise((resolve) => setTimeout(resolve, 5))

describe('conflito de salvamento', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    page = await payload.create({
      collection: 'pages',
      data: { title: 'Conflito', slug: `conflito-${Date.now()}`, _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'pages', id: page.id, overrideAccess: true })
  })

  it('aceita a sequência de salvamentos do próprio editor', async () => {
    let base = await opened()
    for (let i = 0; i < 3; i++) {
      await pause()
      base = (await autosave(base)).updatedAt
    }
    // A data devolvida ao salvar é a mesma de quem abrir a página depois.
    expect(await opened()).toBe(base)
  })

  it('recusa com 409 o salvamento sobre um rascunho mais novo', async () => {
    const tabA = await opened()
    await pause()
    await autosave(await opened())
    await expect(autosave(tabA)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('mudou em outra aba'),
    })
  })

  it('o salvamento recusado não muda nada', async () => {
    const stale = await opened()
    await pause()
    const { title, updatedAt } = await autosave(stale)
    await expect(autosave(stale)).rejects.toMatchObject({ status: 409 })
    const after = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: true,
      overrideAccess: true,
    })
    expect(after).toMatchObject({ title, updatedAt })
  })

  it('depois de publicar, o editor segue salvando com a data que recebeu', async () => {
    await pause()
    const published = await publish(await opened())
    expect(published._status).toBe('published')
    await pause()
    const draft = await autosave(published.updatedAt)
    await pause()
    await publish(draft.updatedAt)
  })

  it('quem abrir depois de publicar também salva sem conflito', async () => {
    await pause()
    await autosave(await opened())
  })

  it('publicar também é recusado sobre uma versão mais nova', async () => {
    const tabA = await opened()
    await pause()
    await autosave(await opened())
    await expect(publish(tabA)).rejects.toMatchObject({ status: 409 })
  })

  it('quem não manda a data (painel padrão, scripts) segue como antes', async () => {
    await pause()
    await expect(
      payload.update({
        collection: 'pages',
        id: page.id,
        data: { title: 'Sem data' },
        draft: true,
        overrideAccess: true,
      }),
    ).resolves.toMatchObject({ title: 'Sem data' })
  })
})
