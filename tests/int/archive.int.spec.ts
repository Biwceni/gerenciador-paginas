import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { emptyPageContent } from '@/puck/schema'

// Páginas arquivadas (v2, entrega 1) no banco de TEST_DATABASE_URL.

let payload: Payload
const created: number[] = []

describe('páginas arquivadas', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const id of created) {
      await payload.delete({ collection: 'pages', id, overrideAccess: true }).catch(() => null)
    }
  })

  it('saem do site e voltam como rascunho', async () => {
    const slug = `arquivo-${Date.now()}`
    const page = await payload.create({
      collection: 'pages',
      data: { title: 'Arquivo', slug, content: emptyPageContent(), _status: 'published' },
      overrideAccess: true,
    })
    created.push(page.id)
    const visitor = () =>
      payload.find({
        collection: 'pages',
        where: { slug: { equals: slug } },
        draft: false,
        overrideAccess: false,
      })
    expect((await visitor()).docs).toHaveLength(1)

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { archived: true, _status: 'draft' },
      overrideAccess: true,
    })
    expect((await visitor()).docs).toHaveLength(0)
    const archived = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: true,
      overrideAccess: true,
    })
    expect(archived).toMatchObject({ archived: true, _status: 'draft' })
    const destinations = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { archived: { not_equals: true } }] },
      draft: true,
      overrideAccess: true,
    })
    expect(destinations.docs).toHaveLength(0)

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { archived: false, _status: 'draft' },
      overrideAccess: true,
    })
    const restored = await payload.findByID({
      collection: 'pages',
      id: page.id,
      draft: true,
      overrideAccess: true,
    })
    expect(restored).toMatchObject({ archived: false, _status: 'draft' })
    expect((await visitor()).docs).toHaveLength(0)
  })
})
