import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { applyPageTemplate, applySiteTemplate } from '@/lib/applyTemplate'
import { FONT_PAIRS } from '@/lib/fontPairs'
import { contrastWarnings } from '@/lib/style-presets'
import {
  BUSINESSES,
  checkTemplateReferences,
  cityFromAddress,
  fillExamples,
  fillExampleText,
  isTemplatePhotoURL,
  remapTemplateContent,
  SITE_TYPES,
  templateBusiness,
  templatePersonality,
} from '@/lib/templates'
import type { Template } from '@/payload-types'
import { collectReferences } from '@/puck/references'
import { parsePageContent, type PuckPageData } from '@/puck/schema'
import { templateSeeds } from '@/seed/templates/data'

const asTemplate = (seed: (typeof templateSeeds)[number], id = 1) =>
  ({ ...seed, id, updatedAt: '', createdAt: '' }) as Template

const contentOf = (page: NonNullable<Template['pages']>[number]) =>
  (page.content as { data: PuckPageData }).data

const sites = templateSeeds.filter((seed) => seed.kind === 'site')
const pageModels = templateSeeds.filter((seed) => seed.kind === 'page')

describe('modelos por ramo (entrega 6)', () => {
  it('têm 2 modelos para cada ramo do site da empresa e para cada outro tipo de site', () => {
    for (const business of BUSINESSES) {
      const found = sites.filter((seed) => templateBusiness(seed) === business.value)
      expect(found, business.value).toHaveLength(2)
      // O campo do banco guarda o grupo do ramo (sem migração).
      for (const seed of found) expect(seed.segment).toBe(business.segment)
    }
    for (const type of SITE_TYPES.filter((item) => item.value !== 'institucional')) {
      expect(sites.filter((seed) => seed.siteType === type.value)).toHaveLength(2)
    }
    expect(pageModels).toHaveLength(9)
    expect(new Set(templateSeeds.map((seed) => seed.key)).size).toBe(templateSeeds.length)
  })

  it('cada modelo de site sugere uma personalidade, e os dois de um ramo são diferentes', () => {
    const byPrefix = new Map<string, string[]>()
    for (const seed of sites) {
      const personality = templatePersonality(seed.key)
      expect(personality, seed.key).not.toBeNull()
      const prefix = seed.key.split('-')[0]
      byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), personality!])
    }
    for (const [prefix, list] of byPrefix) expect(new Set(list).size, prefix).toBe(2)
  })

  it('as letras sugeridas são um dos pares do ramo', () => {
    for (const seed of sites) {
      const prefix = seed.key.split('-')[0] as keyof typeof FONT_PAIRS
      const pairs = FONT_PAIRS[prefix].map((pair) => `${pair.headings}/${pair.body}`)
      expect(pairs, seed.key).toContain(`${seed.site?.fonts?.headings}/${seed.site?.fonts?.body}`)
    }
  })

  it('as cores sugeridas passam no contraste (texto, botões, faixa e rodapé)', () => {
    for (const seed of sites) {
      const colors = seed.site!.colors as Parameters<typeof contrastWarnings>[0]
      expect(contrastWarnings(colors), seed.key).toEqual([])
    }
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
    }
  })

  it('não trazem foto de banco: o lugar de cada foto fica para a pessoa', () => {
    for (const seed of templateSeeds) {
      expect(seed.photos, seed.key).toEqual([])
      for (const page of seed.pages ?? []) {
        expect(collectReferences(contentOf(page)).mediaIds, seed.key).toEqual([])
      }
    }
  })

  it('o site da empresa tem a inicial e mais 2 ou 3 páginas do ramo, todas no menu', () => {
    for (const seed of sites.filter((item) => item.siteType === 'institucional')) {
      const pages = seed.pages ?? []
      expect(pages.length, seed.key).toBeGreaterThanOrEqual(3)
      expect(pages.length, seed.key).toBeLessThanOrEqual(4)
      expect(seed.header?.items?.map((item) => item.label)).toEqual(pages.map((page) => page.title))
    }
  })

  it('cada ramo tem a sua própria sequência de seções na página inicial', () => {
    const sequences = BUSINESSES.map((business) => {
      const seed = sites.find((item) => templateBusiness(item) === business.value)!
      return contentOf(seed.pages![0])
        .content.map((item) => item.type)
        .join(' > ')
    })
    expect(new Set(sequences).size).toBe(BUSINESSES.length)
    // E nenhum é mais o esqueleto de antes (banner, destaques, texto com foto, depoimentos, chamada).
    expect(sequences).not.toContain('Hero > Features > TextImage > Testimonials > CallToAction')
  })

  it('as sequências seguem o que o ramo pede', () => {
    const home = (business: string) =>
      contentOf(sites.find((item) => templateBusiness(item) === business)!.pages![0]).content.map(
        (item) => item.type,
      )
    // Confeitaria: faixa de aviso e vitrine; loja: vitrine logo depois do banner.
    expect(home('confeitaria').slice(0, 3)).toEqual(['Announcement', 'Hero', 'Products'])
    expect(home('loja').slice(0, 2)).toEqual(['Hero', 'Products'])
    // Saúde: contato e perguntas no alto, sem depoimentos.
    expect(home('saude').slice(0, 3)).toEqual(['Hero', 'Contact', 'Faq'])
    expect(home('saude')).not.toContain('Testimonials')
    // Evento: a faixa com a data no alto.
    const event = sites.find((item) => item.siteType === 'evento')!
    expect(contentOf(event.pages![0]).content[0].type).toBe('Announcement')
  })

  it('os textos de exemplo do site da empresa usam o nome e a cidade', () => {
    for (const seed of sites.filter((item) => item.siteType === 'institucional')) {
      const text = JSON.stringify(seed.pages)
      expect(text, seed.key).toContain('{nome}')
      expect(text, seed.key).toContain('{cidade}')
    }
  })

  it('os modelos de página não usam a cidade (ela só é perguntada no Começar)', () => {
    for (const seed of pageModels)
      expect(JSON.stringify(seed.pages), seed.key).not.toContain('{cidade}')
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
        const ids = contentOf(page!).content.map((c) => c.props.id)
        expect(ids, seed.key).toContain(link.section)
      }
    }
  })
})

describe('sem Lorem Ipsum', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name)
      return statSync(full).isDirectory() ? files(full) : [full]
    })

  it('nenhum arquivo de src/seed tem "Lorem"', () => {
    const found = files(path.resolve('src/seed')).filter((file) =>
      /lorem/i.test(readFileSync(file, 'utf8')),
    )
    expect(found).toEqual([])
  })

  it('nem os modelos prontos', () => {
    expect(JSON.stringify(templateSeeds)).not.toMatch(/lorem|ipsum/i)
  })
})

describe('nome e cidade nos textos de exemplo', () => {
  it('trocam os marcadores', () => {
    expect(
      fillExampleText('Entregamos em {cidade}', { name: 'Doces da Ana', city: 'Uberlândia' }),
    ).toBe('Entregamos em Uberlândia')
    expect(
      fillExamples(
        { a: ['{nome} em {cidade}'], b: 2 },
        { name: 'Doces da Ana', city: 'Uberlândia' },
      ),
    ).toEqual({ a: ['Doces da Ana em Uberlândia'], b: 2 })
  })

  it('sem resposta, usam um texto que ainda se lê', () => {
    expect(fillExampleText('{nome} em {cidade}', { name: ' ', city: '' })).toBe(
      'Seu negócio em sua cidade',
    )
  })
})

describe('cidade tirada do endereço (Começar de novo)', () => {
  it('é a parte junto do estado, sem o CEP', () => {
    expect(cityFromAddress('Rua das Flores, 120 · Centro · Uberlândia/MG')).toBe('Uberlândia')
    expect(cityFromAddress('Av. Brasil, 500 - Centro, Belo Horizonte/MG')).toBe('Belo Horizonte')
    expect(cityFromAddress('Rua A, 10, Lavras - MG')).toBe('Lavras')
    expect(cityFromAddress('Rua B, 20\nJuiz de Fora, MG\n36000-000')).toBe('Juiz de Fora')
  })

  it('sem endereço, ou sem cara de cidade, fica vazio', () => {
    expect(cityFromAddress(null)).toBe('')
    expect(cityFromAddress('')).toBe('')
    expect(cityFromAddress('Rua das Flores, 120')).toBe('')
    // Sem o estado, a última parte pode ser o bairro.
    expect(cityFromAddress('Rua das Flores, 120 · Centro')).toBe('')
  })
})

describe('identificador do modelo', () => {
  it('leva o ramo (só no site da empresa) e a personalidade', () => {
    expect(templateBusiness({ key: 'confeitaria-vitrine', siteType: 'institucional' })).toBe(
      'confeitaria',
    )
    expect(templateBusiness({ key: 'evento-vitrine', siteType: 'evento' })).toBeNull()
    expect(templateBusiness({ key: 'cafe-aconchegante', siteType: 'institucional' })).toBeNull()
    expect(templatePersonality('saude-aconchego')).toBe('aconchego')
    expect(templatePersonality('cafe-aconchegante')).toBeNull()
    expect(templatePersonality(null)).toBeNull()
  })
})

describe('páginas dos modelos (crítica de design)', () => {
  type Item = {
    type: string
    props: { button?: { label: string; link: { kind: string } } | null; height?: string }
  }
  const itemsOf = (page: NonNullable<Template['pages']>[number]) =>
    (page.content as { data: { content: Item[] } }).data.content

  it('C5: toda página interna termina com uma chamada para a ação ou um formulário', () => {
    for (const seed of sites) {
      for (const page of (seed.pages ?? []).slice(1)) {
        const last = itemsOf(page).at(-1)
        expect(['CallToAction', 'Form'], `${seed.key} › ${page.title}`).toContain(last?.type)
      }
    }
  })

  it('C6: os botões que levam ao WhatsApp usam o texto do botão do topo', () => {
    for (const seed of sites) {
      const top = seed.header?.button
      if (!top?.label || top.link?.kind !== 'whatsapp') continue
      for (const page of seed.pages ?? []) {
        for (const item of itemsOf(page)) {
          if (item.type === 'Products') continue
          if (item.props.button?.link?.kind === 'whatsapp') {
            expect(item.props.button.label, `${seed.key} › ${page.title}`).toBe(top.label)
          }
        }
      }
    }
  })

  it('C3: a página Contato tem banner compacto e o "Fale conosco" depois do Contato', () => {
    const clinic = templateSeeds.find((seed) => seed.key === 'saude-classico')!
    const contact = clinic.pages!.find((page) => page.title === 'Contato')!
    const items = itemsOf(contact)
    expect(items.map((item) => item.type)).toEqual(['Hero', 'Contact', 'Form'])
    expect(items[0].props.height).toBe('compact')
    expect(clinic.forms?.map((form) => form.title)).toEqual(['Fale conosco'])
    // A página inicial continua com o banner normal.
    expect(itemsOf(clinic.pages![0])[0].props.height).toBe('normal')
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
  // Formulários com números à parte, para os das páginas não mudarem quando o modelo tem formulário.
  let nextFormId = 900
  const payload = {
    db: {},
    logger: { error: () => {} },
    find: async (args: Record<string, unknown>) => {
      calls.push({ op: 'find', args })
      // Sem fotos e sem formulários para reaproveitar.
      if (args.collection === 'media' || args.collection === 'forms') return { docs: [] }
      return { docs: args.draft ? pages : live }
    },
    findGlobal: async () => site,
    count: async () => ({ totalDocs: 0 }),
    create: async (args: Record<string, unknown>) => {
      calls.push({ op: 'create', args })
      const id = args.collection === 'forms' ? nextFormId++ : nextId++
      return { id, ...(args.data as object) }
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
  const seed = templateSeeds.find((item) => item.key === 'confeitaria-vitrine')!
  const template = asTemplate(seed)
  const answers = {
    name: 'Padaria da Ana',
    tagline: 'Pão quentinho',
    whatsapp: '(31) 99999-0000',
    city: 'Uberlândia',
  }

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
        motion: 'suave',
        personality: 'classico',
      },
    })
    const result = await applySiteTemplate(req, template, answers)

    const created = calls.filter((c) => c.op === 'create' && c.args.collection === 'pages')
    expect(created.map((c) => (c.args.data as { slug: string }).slug)).toEqual([
      'inicio-2',
      'cardapio',
      'galeria',
      'encomendas',
    ])
    expect(result.homepage).toBe(100)

    const home = calls.find((c) => c.op === 'update' && c.args.id === 100)!
    const homeData = (home.args.data as { content: { data: PuckPageData } }).content.data
    // A faixa de aviso vem antes do banner; a frase respondida vai para o banner.
    expect(homeData.content[0].type).toBe('Announcement')
    expect(homeData.content[1].props).toMatchObject({ text: 'Pão quentinho' })
    // A cidade e o nome entram nos textos de exemplo.
    const text = JSON.stringify(homeData)
    expect(text).toContain('Entregamos em Uberlândia')
    expect(text).toContain('Padaria da Ana começou na cozinha de casa')
    expect(text).not.toMatch(/\{nome\}|\{cidade\}/)

    const globals = calls.filter((c) => c.op === 'updateGlobal')
    const site = globals.find((c) => c.args.slug === 'site')!.args.data as Record<string, unknown>
    expect(site).toMatchObject({
      name: 'Padaria da Ana',
      homepage: 100,
      fonts: { headings: 'Cormorant Garamond', body: 'Montserrat' },
      // A personalidade sugerida pelo modelo; a animação do site continua a de antes.
      personality: 'vitrine',
      motion: 'suave',
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
    expect(header.items[1]).toEqual({ label: 'Cardápio', link: { kind: 'page', page: 101 } })
    const footer = globals.find((c) => c.args.slug === 'footer')!.args.data as { text: string }
    expect(footer.text).toBe('Bolos, doces e tortas sob encomenda em Uberlândia.')

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
      // Libera o endereço para a página nova.
      slug: 'inicio-arquivada-5',
    })
    // E a página nova, que nasceu "inicio-2", fica com o endereço limpo.
    const rename = calls.findIndex(
      (c) => c.op === 'update' && c.args.id === 100 && (c.args.data as { slug?: string }).slug,
    )
    expect(rename).toBeGreaterThan(archive)
    expect(calls[rename].args.data).toMatchObject({ slug: 'inicio', _status: 'published' })
    // Tudo com o usuário da requisição.
    for (const call of calls.filter((c) => c.args.collection === 'pages')) {
      expect(call.args.overrideAccess).toBe(false)
    }
    // Nenhuma foto para copiar.
    expect(result.missingPhotos).toBe(0)
    expect(calls.some((c) => c.args.collection === 'media')).toBe(false)
  })

  it('não arquiva de novo as que já estão arquivadas', async () => {
    const { req, calls } = fakeReq({
      pages: [{ id: 6, title: 'Guardada', slug: 'guardada', archived: true, content: {}, seo: {} }],
    })
    await applySiteTemplate(req, template, { ...answers, tagline: '', whatsapp: '' })
    expect(calls.some((c) => c.op === 'update' && c.args.id === 6)).toBe(false)
  })

  it('não leva a frase, o endereço e o horário de exemplo para o site', async () => {
    expect(template.site?.tagline).toBeTruthy()
    const { req, calls } = fakeReq({ site: { contact: { email: 'dono@site.com' } } })
    await applySiteTemplate(req, template, {
      name: 'Café',
      tagline: '',
      whatsapp: '',
      city: 'Belém',
    })
    const site = calls.find((c) => c.op === 'updateGlobal' && c.args.slug === 'site')!.args
      .data as { tagline: unknown; contact: Record<string, unknown> }
    expect(site.tagline).toBeNull()
    expect(site.contact).toMatchObject({
      email: 'dono@site.com',
      address: null,
      hours: null,
      whatsapp: null,
    })
    // A abertura da página inicial fica com o texto de exemplo do ramo, não com a frase de exemplo.
    const home = calls.find((c) => c.op === 'update' && c.args.id === 100)!
    const homeData = (home.args.data as { content: { data: PuckPageData } }).content.data
    expect(JSON.stringify(homeData)).not.toContain(template.site!.tagline!)
    expect(JSON.stringify(homeData)).toContain('aqui em Belém')
  })

  it('cria o formulário do modelo e põe o nome do site na página de links', async () => {
    const landing = asTemplate(templateSeeds.find((item) => item.key === 'landing-vitrine')!)
    const { req, calls } = fakeReq()
    await applySiteTemplate(req, landing, {
      name: 'Aula',
      tagline: '',
      whatsapp: '',
      city: 'Recife',
    })
    expect(calls.some((c) => c.op === 'create' && c.args.collection === 'forms')).toBe(true)

    const links = asTemplate(templateSeeds.find((item) => item.key === 'links-aconchego')!)
    const second = fakeReq()
    await applySiteTemplate(second.req, links, {
      name: 'Loja da Bia',
      tagline: '',
      whatsapp: '',
      city: 'Recife',
    })
    const update = second.calls.find((c) => c.op === 'update')!
    const data = (update.args.data as { content: { data: PuckPageData } }).content.data
    expect(data.content[0].props).toMatchObject({ title: 'Loja da Bia' })
    expect(JSON.stringify(data)).toContain('encomendas em Recife')
  })
})

describe('fotos que não deu para copiar', () => {
  it('ficam vazias e são contadas para o aviso', async () => {
    // Um modelo feito à mão no painel ainda pode trazer foto do Pexels.
    const seed = templateSeeds.find((item) => item.key === 'pagina-contato')!
    const page = seed.pages![0]
    const data = structuredClone(contentOf(page))
    const hero = data.content[0]
    if (hero.type !== 'Hero') throw new Error('esperava um banner')
    hero.props.image = { mediaId: 1 }
    const withPhoto = asTemplate({
      ...seed,
      photos: [{ url: 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg', alt: 'Loja' }],
      pages: [{ ...page, content: { version: 2, data } }],
    })
    const original = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('sem rede')
    }) as typeof fetch
    try {
      const { req, calls } = fakeReq()
      const result = await applyPageTemplate(req, withPhoto, { title: 'Fale', slug: 'fale' })
      expect(result.missingPhotos).toBe(1)
      expect(calls.some((c) => c.op === 'create' && c.args.collection === 'media')).toBe(false)
      const create = calls.find((c) => c.op === 'create' && c.args.collection === 'pages')!
      const created = create.args.data as { content: { data: PuckPageData } }
      expect(created.content.data.content[0].props).toMatchObject({ image: null })
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('página a partir de um modelo', () => {
  it('cria um rascunho com o nome no banner e o nome do site nos textos', async () => {
    const seed = templateSeeds.find((item) => item.key === 'pagina-sobre')!
    const { req, calls } = fakeReq({ site: { name: 'Loja da Bia' } })
    await applyPageTemplate(req, asTemplate(seed), { title: 'Quem somos nós', slug: 'quem-somos' })
    const create = calls.find((c) => c.op === 'create' && c.args.collection === 'pages')!
    expect(create.args).toMatchObject({ draft: true, overrideAccess: false })
    const data = create.args.data as { _status: string; content: { data: PuckPageData } }
    expect(data._status).toBe('draft')
    expect(data.content.data.content[0].props).toMatchObject({ title: 'Quem somos nós' })
    expect(JSON.stringify(data.content.data)).toContain('quem está por trás de Loja da Bia')
    expect(JSON.stringify(data.content.data)).not.toContain('{nome}')
  })

  it('a promoção começa pela faixa de aviso e põe o nome no banner', async () => {
    const seed = templateSeeds.find((item) => item.key === 'pagina-promocao')!
    const { req, calls } = fakeReq()
    await applyPageTemplate(req, asTemplate(seed), {
      title: 'Promoção de inverno',
      slug: 'promocao-de-inverno',
    })
    const create = calls.find((c) => c.op === 'create' && c.args.collection === 'pages')!
    const data = create.args.data as { content: { data: PuckPageData } }
    const [first, second] = data.content.data.content
    expect(first.type).toBe('Announcement')
    expect(second.props).toMatchObject({ title: 'Promoção de inverno' })
  })
})
