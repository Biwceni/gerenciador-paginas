// @vitest-environment node
// (no jsdom, o Payload não reconhece o tipo do arquivo das fotos)
import { createLocalReq, getPayload, type Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { applySiteTemplate } from '@/lib/applyTemplate'
import config from '@/payload.config'
import type { Template } from '@/payload-types'
import { CONTENT_VERSION, emptyPageContent } from '@/puck/schema'
import { pageBuilder } from '@/seed/templates/sections'

// Aplicar um modelo de site (v2, entrega 2a) no banco de TEST_DATABASE_URL.

let payload: Payload
// Só para as regras de acesso: não precisa existir no banco.
const admin = {
  id: 999999,
  email: 'modelo@teste.local',
  role: 'admin',
  collection: 'users',
} as const

const template = {
  key: 'confeitaria-aconchego',
  pages: [
    {
      title: 'Início',
      slug: 'inicio',
      content: {
        version: CONTENT_VERSION,
        data: {
          root: { props: {} },
          content: [pageBuilder().hero({ title: 'Doces em {cidade}', text: 'Feitos por {nome}.' })],
        },
      },
    },
    {
      title: 'Sobre',
      slug: 'sobre',
      content: { version: CONTENT_VERSION, data: { root: { props: {} }, content: [] } },
    },
  ],
  site: {},
  header: { items: [{ label: 'Sobre', link: { kind: 'page', page: 2 } }] },
  footer: { text: '{nome}, em {cidade}.' },
} as unknown as Template

const apply = async () =>
  applySiteTemplate(await createLocalReq({ user: admin as never }, payload), template, {
    name: 'Café Teste',
    tagline: '',
    whatsapp: '',
    city: 'Uberlândia',
  })

const visitorPages = () =>
  payload.find({ collection: 'pages', depth: 0, draft: false, overrideAccess: false })

async function removePages() {
  const { docs } = await payload.find({
    collection: 'pages',
    depth: 0,
    draft: true,
    pagination: false,
    overrideAccess: true,
  })
  for (const { id } of docs) {
    await payload.delete({
      collection: 'pages',
      id,
      overrideAccess: true,
      context: { seedRecreate: true },
    })
  }
}

describe('aplicar um modelo de site', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterEach(async () => {
    await payload.updateGlobal({
      slug: 'site',
      data: { homepage: null, personality: 'classico', _status: 'published' },
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'header',
      data: { items: [], _status: 'published' },
      overrideAccess: true,
    })
    await removePages()
  })

  it('no primeiro início guiado, as páginas nascem como rascunho e o resto é publicado', async () => {
    await removePages()
    const { homepage, pages } = await apply()

    expect((await visitorPages()).docs).toHaveLength(0)
    const draft = await payload.findByID({
      collection: 'pages',
      id: homepage,
      draft: true,
      overrideAccess: true,
    })
    expect(draft._status).toBe('draft')
    // O conteúdo do modelo fica no rascunho, não se perde.
    expect(JSON.stringify(draft.content)).toContain('Hero')

    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: false })
    expect(site).toMatchObject({ _status: 'published', homepage, name: 'Café Teste' })
    const header = await payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: false })
    expect(header._status).toBe('published')
    expect(header.items?.[0].link?.page).toBe(pages[1])
  })

  it('troca {nome} e {cidade} nos textos e usa a personalidade do modelo', async () => {
    await removePages()
    const { homepage } = await apply()
    const draft = await payload.findByID({
      collection: 'pages',
      id: homepage,
      draft: true,
      overrideAccess: true,
    })
    const text = JSON.stringify(draft.content)
    expect(text).toContain('Doces em Uberlândia')
    expect(text).toContain('Feitos por Café Teste.')
    expect(text).not.toContain('{nome}')
    const footer = await payload.findGlobal({ slug: 'footer', depth: 0, overrideAccess: true })
    expect(footer.text).toBe('Café Teste, em Uberlândia.')
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(site.personality).toBe('aconchego')
  })

  it('site só com páginas arquivadas também conta como primeiro início', async () => {
    await removePages()
    const old = await payload.create({
      collection: 'pages',
      data: { title: 'Antiga', slug: 'antiga', archived: true, _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    await apply()
    expect((await visitorPages()).docs).toHaveLength(0)
    const { archived } = await payload.findByID({
      collection: 'pages',
      id: old.id,
      draft: true,
      overrideAccess: true,
    })
    expect(archived).toBe(true)
  })

  it('no "Começar de novo", as páginas novas entram no ar e as antigas vão para Arquivadas', async () => {
    await removePages()
    const old = await payload.create({
      collection: 'pages',
      data: { title: 'Antiga', slug: 'antiga', content: emptyPageContent(), _status: 'published' },
      overrideAccess: true,
    })
    const { pages } = await apply()

    const live = (await visitorPages()).docs.map((doc) => doc.id).sort()
    expect(live).toEqual([...pages].sort())
    const archived = await payload.findByID({
      collection: 'pages',
      id: old.id,
      draft: true,
      overrideAccess: true,
    })
    expect(archived.archived).toBe(true)
  })

  it('aplicar o mesmo modelo 3 vezes não cria endereço com -2 nem formulário repetido', async () => {
    await removePages()
    const formTitle = `Fale conosco ${Date.now()}`
    const withForm = {
      ...template,
      forms: [
        {
          title: formTitle,
          submitButtonLabel: 'Enviar',
          fields: [{ type: 'text', name: 'nome', label: 'Nome', required: true }],
        },
      ],
    } as unknown as Template
    const applyWithForm = async () =>
      applySiteTemplate(await createLocalReq({ user: admin as never }, payload), withForm, {
        name: 'Café Teste',
        tagline: '',
        whatsapp: '',
        city: 'Uberlândia',
      })
    const slugsOf = async (ids: number[]) =>
      Promise.all(
        ids.map(
          async (id) =>
            (await payload.findByID({ collection: 'pages', id, draft: true, overrideAccess: true }))
              .slug,
        ),
      )
    const countForms = async () =>
      (
        await payload.count({
          collection: 'forms',
          where: { title: { equals: formTitle } },
          overrideAccess: true,
        })
      ).totalDocs

    try {
      // A 1ª vez é o primeiro site; a 2ª e a 3ª, "Começar de novo".
      for (let round = 0; round < 3; round++) {
        const { pages } = await applyWithForm()
        expect(await slugsOf(pages)).toEqual(['inicio', 'sobre'])
        expect(await countForms()).toBe(1)
      }
      const { docs: archived } = await payload.find({
        collection: 'pages',
        where: { archived: { equals: true } },
        draft: true,
        pagination: false,
        overrideAccess: true,
      })
      expect(archived).toHaveLength(4)
      expect(archived.every((page) => /-arquivada-\d+$/.test(page.slug))).toBe(true)
    } finally {
      await payload.delete({
        collection: 'forms',
        where: { title: { equals: formTitle } },
        overrideAccess: true,
      })
    }
  })
})

describe('foto de exemplo trocada', () => {
  it('trocar o arquivo apaga o endereço de origem; mudar a descrição, não', async () => {
    // PNG de 1 × 1.
    const data = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    )
    const file = { data, mimetype: 'image/png', name: `troca-${Date.now()}.png`, size: data.length }
    const photo = await payload.create({
      collection: 'media',
      data: { alt: 'Foto do modelo', sourceUrl: 'https://images.pexels.com/photos/1/a.jpeg' },
      file,
      overrideAccess: true,
    })
    const alt = await payload.update({
      collection: 'media',
      id: photo.id,
      data: { alt: 'Descrição nova' },
      overrideAccess: true,
    })
    expect(alt.sourceUrl).toBe('https://images.pexels.com/photos/1/a.jpeg')

    const swapped = await payload.update({
      collection: 'media',
      id: photo.id,
      data: {},
      file: { ...file, name: `nova-${file.name}` },
      overrideAccess: true,
    })
    expect(swapped.sourceUrl).toBeFalsy()
    await payload.delete({ collection: 'media', id: photo.id, overrideAccess: true })
  })
})
