import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { applyPageTemplate, applySiteTemplate } from '@/lib/applyTemplate'
import {
  checkTemplateReferences,
  isTemplatePhotoURL,
  remapTemplateContent,
  SEGMENTS,
  SITE_TYPES,
} from '@/lib/templates'
import type { Template } from '@/payload-types'
import { parsePageContent, type PuckPageData } from '@/puck/schema'
import { templateSeeds } from '@/seed/templates/data'

const asTemplate = (seed: (typeof templateSeeds)[number], id = 1) =>
  ({ ...seed, id, updatedAt: '', createdAt: '' }) as Template

describe('modelos da estreia', () => {
  const sites = templateSeeds.filter((seed) => seed.kind === 'site')

  it('têm 2 modelos para cada tipo e para cada ramo do site da empresa', () => {
    for (const type of SITE_TYPES.filter((item) => item.value !== 'institucional')) {
      expect(sites.filter((seed) => seed.siteType === type.value)).toHaveLength(2)
    }
    for (const segment of SEGMENTS) {
      expect(sites.filter((seed) => seed.segment === segment.value)).toHaveLength(2)
    }
    expect(templateSeeds.filter((seed) => seed.kind === 'page')).toHaveLength(4)
    expect(new Set(templateSeeds.map((seed) => seed.key)).size).toBe(templateSeeds.length)
  })

  it('passam pelo esquema das páginas e só citam o que o modelo tem', () => {
    for (const seed of templateSeeds) {
      for (const page of seed.pages ?? []) {
        const parsed = parsePageContent(page.content)
        expect(parsed.success, `${seed.key}/${page.slug}`).toBe(true)
        if (!parsed.success) continue
        const counts = {
          pages: seed.kind === 'page' ? 0 : (seed.pages?.length ?? 0),
          photos: seed.photos?.length ?? 0,
          forms: seed.forms?.length ?? 0,
        }
        expect(checkTemplateReferences(parsed.data.data, counts), seed.key).toBe(true)
      }
      for (const photo of seed.photos ?? []) expect(isTemplatePhotoURL(photo.url)).toBe(true)
    }
  })

  it('apontam o menu para seções que existem na página', () => {
    for (const seed of sites) {
      const links = [
        ...(seed.header?.items ?? []).map((item) => item.link),
        seed.header?.button?.link,
      ]
      for (const link of links) {
        if (link?.kind !== 'section') continue
        const page = seed.pages?.[(link.page ?? 0) - 1]
        const ids = (page?.content as { data: PuckPageData }).data.content.map((c) => c.props.id)
        expect(ids, seed.key).toContain(link.section)
      }
    }
  })
})

describe('fotos dos modelos', () => {
  it('só aceita endereços https do Pexels e do Unsplash', () => {
    expect(isTemplatePhotoURL('https://images.pexels.com/photos/1/pexels-photo-1.jpeg')).toBe(true)
    expect(isTemplatePhotoURL('https://images.unsplash.com/photo-1?w=1600')).toBe(true)
    expect(isTemplatePhotoURL('http://images.pexels.com/photos/1.jpeg')).toBe(false)
    expect(isTemplatePhotoURL('https://images.pexels.com.evil.com/a.jpg')).toBe(false)
    expect(isTemplatePhotoURL('javascript:alert(1)')).toBe(false)
  })
})

describe('trocar posições por ids', () => {
  const data = {
    root: { props: {} },
    content: [
      {
        type: 'Hero',
        props: {
          id: 'Hero-1',
          title: 't',
          text: '',
          image: { mediaId: 2 },
          button: { label: 'Ver', link: { kind: 'page', pageId: 2 } },
          style: 'image',
          align: 'left',
        },
      },
      {
        type: 'Gallery',
        props: {
          id: 'Gallery-1',
          menuLabel: '',
          title: '',
          images: [{ mediaId: 1 }, { mediaId: 3 }],
          style: 'light',
        },
      },
      {
        type: 'Form',
        props: {
          id: 'Form-1',
          menuLabel: '',
          title: '',
          text: '',
          form: { formId: 1 },
          successMessage: '',
          style: 'soft',
        },
      },
    ],
  } as PuckPageData

  it('usa os ids de verdade', () => {
    const result = remapTemplateContent(data, { pages: [10, 20], photos: [31, 32, 33], forms: [7] })
    expect(result.content[0].props).toMatchObject({
      image: { mediaId: 32 },
      button: { link: { kind: 'page', pageId: 20 } },
    })
    expect(result.content[1].props).toMatchObject({ images: [{ mediaId: 31 }, { mediaId: 33 }] })
    expect(result.content[2].props).toMatchObject({ form: { formId: 7 } })
  })

  it('deixa vazio o que faltou e leva ao WhatsApp o link sem página', () => {
    const result = remapTemplateContent(data, { pages: [], photos: [31, 0, 0], forms: [] })
    expect(result.content[0].props).toMatchObject({
      image: null,
      button: { link: { kind: 'whatsapp' } },
    })
    expect(result.content[1].props).toMatchObject({ images: [{ mediaId: 31 }] })
    expect(result.content[2].props).toMatchObject({ form: null })
  })

  it('não muda o conteúdo do modelo', () => {
    remapTemplateContent(data, { pages: [10, 20], photos: [31, 32, 33], forms: [7] })
    expect(data.content[0].props).toMatchObject({ image: { mediaId: 2 } })
  })
})

// A rotina com o Payload simulado: aplicá-la no banco mexeria no site no ar.
type Call = { op: string; args: Record<string, unknown> }

function fakeReq({ pages = [] as object[], live = [] as object[], site = {} as object } = {}) {
  const calls: Call[] = []
  let nextId = 100
  const payload = {
    db: {},
    logger: { error: () => {} },
    find: async (args: Record<string, unknown>) => {
      calls.push({ op: 'find', args })
      if (args.collection === 'media') return { docs: [] }
      return { docs: args.draft ? pages : live }
    },
    findGlobal: async () => site,
    create: async (args: Record<string, unknown>) => {
      calls.push({ op: 'create', args })
      return { id: nextId++, ...(args.data as object) }
    },
    update: async (args: Record<string, unknown>) => {
      calls.push({ op: 'update', args })
      return { id: args.id }
    },
    updateGlobal: async (args: Record<string, unknown>) => {
      calls.push({ op: 'updateGlobal', args })
      return {}
    },
  }
  return { req: { payload, user: { id: 1, role: 'admin' } } as unknown as PayloadRequest, calls }
}

describe('aplicar um modelo de site', () => {
  // Sem fotos, para não baixar nada no teste.
  const seed = templateSeeds.find((item) => item.key === 'cafe-aconchegante')!
  const template = asTemplate({ ...seed, photos: [] })

  it('cria as páginas, publica as configurações e arquiva as antigas', async () => {
    const old = { id: 5, title: 'Antiga', slug: 'inicio', content: {}, seo: {} }
    const { req, calls } = fakeReq({
      pages: [old],
      live: [{ id: 5 }],
      site: {
        contact: { email: 'dono@site.com', address: 'Rua Real, 1' },
        logo: { id: 9 },
        social: { instagram: '@publicado' },
        seoDescription: 'No ar',
        shareImage: 4,
      },
    })
    const result = await applySiteTemplate(req, template, {
      name: 'Padaria da Ana',
      tagline: 'Pão quentinho',
      whatsapp: '(31) 99999-0000',
    })

    const created = calls.filter((c) => c.op === 'create' && c.args.collection === 'pages')
    expect(created.map((c) => (c.args.data as { slug: string }).slug)).toEqual([
      'inicio-2',
      'sobre',
      'nossos-cafes',
      'contato',
    ])
    expect(result.homepage).toBe(100)

    const home = calls.find((c) => c.op === 'update' && c.args.id === 100)!
    const homeData = (home.args.data as { content: { data: PuckPageData } }).content.data
    expect(homeData.content[0].props).toMatchObject({
      text: 'Pão quentinho',
      // O botão do banner leva à 3ª página do modelo.
      button: { link: { kind: 'page', pageId: 102 } },
    })

    const globals = calls.filter((c) => c.op === 'updateGlobal')
    const site = globals.find((c) => c.args.slug === 'site')!.args.data as Record<string, unknown>
    expect(site).toMatchObject({
      name: 'Padaria da Ana',
      homepage: 100,
      fonts: { headings: 'Lora', body: 'Figtree' },
      contact: { email: 'dono@site.com', address: 'Rua Real, 1', whatsapp: '(31) 99999-0000' },
      // O que o modelo não troca vai do que está no ar: senão o Payload completaria com o rascunho.
      logo: 9,
      social: { instagram: '@publicado' },
      seoDescription: 'No ar',
      shareImage: 4,
      _status: 'published',
    })
    const header = globals.find((c) => c.args.slug === 'header')!.args.data as {
      items: { label: string; link: unknown }[]
    }
    expect(header.items[1]).toEqual({ label: 'Sobre nós', link: { kind: 'page', page: 101 } })

    // A antiga vai para "Arquivadas" (fora do ar) depois de a página inicial e o menu mudarem:
    // as regras do servidor recusam arquivar a página inicial e as do menu.
    const archive = calls.findIndex((c) => c.op === 'update' && c.args.id === 5)
    const siteUpdate = calls.findIndex((c) => c.op === 'updateGlobal' && c.args.slug === 'site')
    const headerUpdate = calls.findIndex((c) => c.op === 'updateGlobal' && c.args.slug === 'header')
    expect(archive).toBeGreaterThan(siteUpdate)
    expect(archive).toBeGreaterThan(headerUpdate)
    expect(calls[archive].args.data).toMatchObject({
      _status: 'draft',
      archived: true,
      title: 'Antiga',
    })
    // Tudo com o usuário da requisição.
    for (const call of calls.filter((c) => c.args.collection === 'pages')) {
      expect(call.args.overrideAccess).toBe(false)
    }
  })

  it('não arquiva de novo as que já estão arquivadas', async () => {
    const { req, calls } = fakeReq({
      pages: [{ id: 6, title: 'Guardada', slug: 'guardada', archived: true, content: {}, seo: {} }],
    })
    await applySiteTemplate(req, template, { name: 'Café', tagline: '', whatsapp: '' })
    expect(calls.some((c) => c.op === 'update' && c.args.id === 6)).toBe(false)
  })

  it('não leva a frase, o endereço e o horário de exemplo para o site', async () => {
    expect(template.site?.tagline).toBeTruthy()
    const { req, calls } = fakeReq({ site: { contact: { email: 'dono@site.com' } } })
    await applySiteTemplate(req, template, { name: 'Café', tagline: '', whatsapp: '' })
    const site = calls.find((c) => c.op === 'updateGlobal' && c.args.slug === 'site')!.args
      .data as { tagline: unknown; contact: Record<string, unknown> }
    expect(site.tagline).toBeNull()
    expect(site.contact).toMatchObject({
      email: 'dono@site.com',
      address: null,
      hours: null,
      whatsapp: null,
    })
    // Também a abertura da página inicial fica com o texto do modelo (Lorem Ipsum), não com a
    // frase de exemplo.
    const home = calls.find((c) => c.op === 'update' && c.args.id === 100)!
    const homeData = (home.args.data as { content: { data: PuckPageData } }).content.data
    expect(JSON.stringify(homeData)).not.toContain(template.site!.tagline!)
  })

  it('cria o formulário do modelo e põe o nome do site na página de links', async () => {
    const landing = asTemplate(templateSeeds.find((item) => item.key === 'landing-energia')!)
    const { req, calls } = fakeReq()
    await applySiteTemplate(
      req,
      { ...landing, photos: [] },
      { name: 'Aula', tagline: '', whatsapp: '' },
    )
    expect(calls.some((c) => c.op === 'create' && c.args.collection === 'forms')).toBe(true)

    const links = asTemplate(templateSeeds.find((item) => item.key === 'links-cafe')!)
    const second = fakeReq()
    await applySiteTemplate(second.req, links, { name: 'Loja da Bia', tagline: '', whatsapp: '' })
    const update = second.calls.find((c) => c.op === 'update')!
    const data = (update.args.data as { content: { data: PuckPageData } }).content.data
    expect(data.content[0].props).toMatchObject({ title: 'Loja da Bia' })
  })
})

describe('fotos que não deu para copiar', () => {
  it('ficam vazias e são contadas para o aviso', async () => {
    const seed = templateSeeds.find((item) => item.key === 'pagina-contato')!
    const original = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('sem rede')
    }) as typeof fetch
    try {
      const { req, calls } = fakeReq()
      const result = await applyPageTemplate(req, asTemplate(seed), { title: 'Fale', slug: 'fale' })
      // O modelo de contato usa 1 das 4 fotos: só ela conta.
      expect(result.missingPhotos).toBe(1)
      expect(calls.some((c) => c.op === 'create' && c.args.collection === 'media')).toBe(false)
      const create = calls.find((c) => c.op === 'create' && c.args.collection === 'pages')!
      const data = create.args.data as { content: { data: PuckPageData } }
      expect(data.content.data.content[0].props).toMatchObject({ image: null })
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('página a partir de um modelo', () => {
  it('cria um rascunho com o nome no banner', async () => {
    const seed = templateSeeds.find((item) => item.key === 'pagina-promocao')!
    const { req, calls } = fakeReq()
    await applyPageTemplate(req, asTemplate({ ...seed, photos: [] }), {
      title: 'Promoção de inverno',
      slug: 'promocao-de-inverno',
    })
    const create = calls.find((c) => c.op === 'create' && c.args.collection === 'pages')!
    expect(create.args).toMatchObject({ draft: true, overrideAccess: false })
    const data = create.args.data as { _status: string; content: { data: PuckPageData } }
    expect(data._status).toBe('draft')
    expect(data.content.data.content[0].props).toMatchObject({ title: 'Promoção de inverno' })
  })
})
