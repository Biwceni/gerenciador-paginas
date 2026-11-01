// @vitest-environment node
// (no jsdom, o Payload não reconhece o tipo do arquivo das fotos)
import { createLocalReq, getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { applyPageTemplate } from '@/lib/applyTemplate'
import { privacyHref } from '@/lib/content'
import { PRIVACY_TEMPLATE_KEY } from '@/lib/privacy'
import config from '@/payload.config'
import type { Template } from '@/payload-types'
import { CONTENT_VERSION, emptyPageContent } from '@/puck/schema'
import { pageBuilder } from '@/seed/templates/sections'

// Foto sem descrição e página de privacidade (v2, entrega 3b) no banco de TEST_DATABASE_URL.

let payload: Payload
// Só para as regras de acesso: não precisa existir no banco.
const admin = {
  id: 999999,
  email: 'privacidade@teste.local',
  role: 'admin',
  collection: 'users',
} as const

const template = (key: string) =>
  ({
    key,
    pages: [
      {
        title: 'Política de privacidade',
        slug: 'politica-de-privacidade',
        content: {
          version: CONTENT_VERSION,
          data: { root: { props: {} }, content: [pageBuilder().privacy()] },
        },
      },
    ],
    photos: [],
    forms: [],
  }) as unknown as Template

const create = async (key: string, slug: string) =>
  applyPageTemplate(await createLocalReq({ user: admin as never }, payload), template(key), {
    title: 'Política de privacidade',
    slug,
  })

// Como o site lê: visitante, só o que está publicado.
const visitorSite = () =>
  payload.findGlobal({ slug: 'site', depth: 1, draft: false, overrideAccess: false })

async function reset() {
  await payload.updateGlobal({
    slug: 'site',
    data: { name: 'Café Teste', privacyPage: null, _status: 'published' },
    overrideAccess: true,
  })
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

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('foto sem descrição', () => {
  // PNG de 1 pixel.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/p+Fn4QAAAABJRU5ErkJggg==',
    'base64',
  )

  it('é salva sem descrição e ganha a descrição depois', async () => {
    const photo = await payload.create({
      collection: 'media',
      data: {},
      file: { data: png, mimetype: 'image/png', name: 'sem-descricao.png', size: png.length },
      overrideAccess: true,
    })
    expect(photo.alt ?? '').toBe('')

    const described = await payload.update({
      collection: 'media',
      id: photo.id,
      data: { alt: 'Fachada da loja' },
      overrideAccess: true,
    })
    expect(described.alt).toBe('Fachada da loja')

    const cleared = await payload.update({
      collection: 'media',
      id: photo.id,
      data: { alt: '' },
      overrideAccess: true,
    })
    expect(cleared.alt ?? '').toBe('')

    await payload.delete({ collection: 'media', id: photo.id, overrideAccess: true })
  })
})

describe('página de privacidade', () => {
  beforeEach(reset)
  afterAll(reset)

  it('criar pelo modelo preenche o campo das Configurações', async () => {
    const { doc } = await create(PRIVACY_TEMPLATE_KEY, 'politica-de-privacidade')
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(site.privacyPage).toBe(doc.id)
  })

  it('preencher o campo não muda o resto das Configurações', async () => {
    await payload.updateGlobal({
      slug: 'site',
      data: {
        name: 'Café Teste',
        tagline: 'Frase no ar',
        contact: { email: 'oi@cafe.com.br' },
        _status: 'published',
      },
      overrideAccess: true,
    })
    await create(PRIVACY_TEMPLATE_KEY, 'politica-de-privacidade')
    const site = await visitorSite()
    expect(site.name).toBe('Café Teste')
    expect(site.tagline).toBe('Frase no ar')
    expect(site.contact?.email).toBe('oi@cafe.com.br')
  })

  it('mudança pendente das Configurações continua pendente, sem ir para o ar', async () => {
    await payload.updateGlobal({
      slug: 'site',
      data: { name: 'Café Teste', tagline: 'publicada', _status: 'published' },
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'site',
      data: { tagline: 'RASCUNHO PENDENTE', _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })

    const { doc } = await create(PRIVACY_TEMPLATE_KEY, 'politica-de-privacidade')

    const pending = await payload.findGlobal({
      slug: 'site',
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    expect(pending.tagline).toBe('RASCUNHO PENDENTE')
    expect(pending._status).toBe('draft')
    expect(pending.privacyPage).toBe(doc.id)

    const live = await payload.findGlobal({
      slug: 'site',
      depth: 0,
      draft: false,
      overrideAccess: true,
    })
    expect(live.tagline).toBe('publicada')
    expect(live.privacyPage).toBe(doc.id)
  })

  it('outro modelo de página não mexe no campo', async () => {
    await create('pagina-sobre', 'sobre')
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(site.privacyPage ?? null).toBeNull()
  })

  it('o link só existe com a página publicada', async () => {
    const { doc } = await create(PRIVACY_TEMPLATE_KEY, 'politica-de-privacidade')
    expect(privacyHref(await visitorSite())).toBeNull()

    await payload.update({
      collection: 'pages',
      id: doc.id,
      data: { _status: 'published' },
      overrideAccess: true,
    })
    expect(privacyHref(await visitorSite())).toBe('/politica-de-privacidade')

    await payload.update({
      collection: 'pages',
      id: doc.id,
      data: { archived: true, _status: 'draft' },
      overrideAccess: true,
    })
    expect(privacyHref(await visitorSite())).toBeNull()
  })

  it('excluir a página limpa o campo', async () => {
    const doc = await payload.create({
      collection: 'pages',
      data: { title: 'Privacidade', slug: 'privacidade', content: emptyPageContent() },
      draft: true,
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'site',
      data: { privacyPage: doc.id, _status: 'published' },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'pages',
      id: doc.id,
      overrideAccess: true,
      context: { seedRecreate: true },
    })
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(site.privacyPage ?? null).toBeNull()
  })
})
