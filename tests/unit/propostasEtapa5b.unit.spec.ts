import { describe, expect, it } from 'vitest'

import { templateSiteData } from '@/lib/applyTemplate'
import { exampleTexts, findExampleSections } from '@/lib/examples'
import { guessBusiness } from '@/lib/fontPairs'
import { backupPages, keepLinks } from '@/lib/siteBackup'
import { cleanShows, SITE_SHOW_VALUES, showPageTitles } from '@/lib/siteShows'
import { contrastWarnings } from '@/lib/style-presets'
import { checkTemplateReferences, fillExamples, templatePersonality } from '@/lib/templates'
import { PERSONALITIES } from '@/lib/theme'
import type { Site } from '@/payload-types'
import { parsePageContent } from '@/puck/schema'
import { composedExamplePages, composeSiteTemplate } from '@/seed/templates/compose'
import { templateSeeds } from '@/seed/templates/data'

// Etapa 5b-1: F1 (o Começar monta o site pelo que ele mostra) e A8 (cópia do site anterior).

describe('F1: as escolhas do Começar', () => {
  it('ficam só as que existem, sem repetir, na ordem da tela', () => {
    expect(cleanShows(['contact', 'products', 'x', 'contact', 3])).toEqual(['products', 'contact'])
    expect(cleanShows(null)).toEqual([])
    expect(cleanShows('products')).toEqual([])
  })

  it('a lista de páginas começa pela Início e segue a ordem da tela', () => {
    expect(showPageTitles([])).toEqual(['Início'])
    expect(showPageTitles(['team', 'products'])).toEqual(['Início', 'Produtos', 'Equipe'])
  })
})

describe('F1: o site montado', () => {
  const today = new Date(2026, 10, 23)

  it('nada marcado: uma página só, com Sobre e Contato nela', () => {
    const template = composeSiteTemplate({ shows: [], personality: 'classico' }, today)
    expect(template.pages.map((page) => page.title)).toEqual(['Início'])
    const types = template.pages[0].content.data.content.map((item) => item.type)
    expect(types).toContain('TextImage')
    expect(types).toContain('Contact')
    expect(types).not.toContain('Features')
    expect(template.header?.items?.map((item) => item.label)).toEqual(['Início'])
  })

  it('tudo marcado: uma página por escolha, todas no menu e na Início', () => {
    const template = composeSiteTemplate({ shows: SITE_SHOW_VALUES, personality: 'vitrine' }, today)
    const titles = showPageTitles(SITE_SHOW_VALUES)
    expect(template.pages.map((page) => page.title)).toEqual(titles)
    expect(template.header?.items?.map((item) => item.label)).toEqual(titles)
    expect(new Set(template.pages.map((page) => page.slug)).size).toBe(titles.length)
    const features = template.pages[0].content.data.content.find((item) => item.type === 'Features')
    expect(features?.type === 'Features' && features.props.items.length).toBe(7)
  })

  it('todas as combinações passam pelo esquema e só citam o que o modelo tem', () => {
    // As 7 sozinhas, nenhuma e todas, em cada visual.
    const combos = [[], SITE_SHOW_VALUES, ...SITE_SHOW_VALUES.map((show) => [show])]
    for (const personality of PERSONALITIES) {
      for (const shows of combos) {
        const template = composeSiteTemplate({ shows, personality }, today)
        expect(templatePersonality(template.key)).toBe(personality)
        for (const page of template.pages) {
          const parsed = parsePageContent(page.content)
          const where = `${personality}/${shows.join('+')}/${page.slug}`
          expect(parsed.success, where).toBe(true)
          if (!parsed.success) continue
          const counts = { pages: template.pages.length, photos: 0, forms: template.forms.length }
          expect(checkTemplateReferences(parsed.data.data, counts), where).toBe(true)
        }
      }
    }
  })

  it('as cores de partida passam no contraste em todos os visuais', () => {
    for (const personality of PERSONALITIES) {
      const { site } = composeSiteTemplate({ shows: [], personality }, today)
      const colors = site!.colors as Parameters<typeof contrastWarnings>[0]
      expect(contrastWarnings(colors), personality).toEqual([])
    }
  })

  it('"Envie um arquivo" ganha um formulário com o campo de arquivo obrigatório', () => {
    const template = composeSiteTemplate({ shows: ['files'], personality: 'classico' }, today)
    expect(template.forms).toHaveLength(1)
    const file = template.forms[0].fields?.find((field) => field.type === 'file')
    expect(file).toMatchObject({ required: true, accept: 'document' })
    const both = composeSiteTemplate(
      { shows: ['files', 'contact'], personality: 'classico' },
      today,
    )
    expect(both.forms.map((form) => form.title)).toHaveLength(2)
  })

  it('a agenda de exemplo nunca nasce com data passada', () => {
    const template = composeSiteTemplate({ shows: ['agenda'], personality: 'classico' }, today)
    const events = template.pages[1].content.data.content.find((item) => item.type === 'Events')
    expect(events?.type).toBe('Events')
    if (events?.type !== 'Events') return
    for (const item of events.props.items) expect(item.date > '2026-11-23').toBe(true)
  })

  it('os textos de exemplo são reconhecidos pelo Publicar, com o nome e a cidade', () => {
    const texts = exampleTexts([...templateSeeds, composedExamplePages()])
    const template = composeSiteTemplate(
      { shows: SITE_SHOW_VALUES, personality: 'classico' },
      today,
    )
    for (const page of template.pages) {
      const filled = fillExamples(page.content.data, { name: 'Casa Azul', city: 'Lavras' })
      expect(findExampleSections(filled, texts).length, page.slug).toBeGreaterThan(0)
    }
  })

  it('site montado pelo que mostra é sempre "geral" em Sua marca', () => {
    expect(guessBusiness({ start: { shows: ['products'] } }, ['produtos'], [])).toBe('geral')
  })
})

describe('A8: o que sai do site anterior', () => {
  const site = {
    logo: 7,
    social: { instagram: '@casa' },
    seoDescription: 'Doces finos',
    shareImage: 9,
    personality: 'classico',
    motion: null,
    contact: {
      email: 'oi@exemplo.com.br',
      whatsapp: '31999990000',
      phone: '3133330000',
      address: 'Rua A, 1, Lavras',
      hours: 'Seg a sex',
      whatsappMessage: 'Olá!',
      units: [{ name: 'Centro', address: 'Rua A, 1, Lavras', phone: '3133330000' }],
    },
  } as unknown as Pick<
    Site,
    'logo' | 'social' | 'seoDescription' | 'shareImage' | 'contact' | 'personality' | 'motion'
  >
  const template = { key: 'geral-classico', site: undefined }
  const answers = { name: 'Outro', city: 'Lavras', tagline: '', whatsapp: '' }

  it('sem nada marcado, tudo continua', () => {
    const data = templateSiteData(site, template, answers, 1, { shows: ['products'] })
    expect(data).toMatchObject({
      logo: 7,
      social: { instagram: '@casa' },
      seoDescription: 'Doces finos',
    })
    expect(data.contact.address).toBe('Rua A, 1, Lavras')
    expect(data.start).toEqual({ shows: ['products'] })
  })

  it('marcado, sai; o e-mail que recebe as mensagens fica', () => {
    const clear = { logo: true, social: true, contact: true, seo: true }
    const data = templateSiteData(site, template, answers, 1, { clear })
    expect(data).toMatchObject({
      logo: null,
      logoLight: null,
      showNameWithLogo: false,
      social: { instagram: null, facebook: null, youtube: null, tiktok: null, linkedin: null },
      seoDescription: null,
      shareImage: null,
    })
    expect(data.contact).toMatchObject({
      email: 'oi@exemplo.com.br',
      address: null,
      phone: null,
      hours: null,
      whatsapp: null,
      units: [],
    })
    expect(data.start).toEqual({ shows: [] })
  })

  it('o WhatsApp respondido entra mesmo com o contato apagado', () => {
    const clear = { contact: true }
    const data = templateSiteData(site, template, { ...answers, whatsapp: '31988887777' }, 1, {
      clear,
    })
    expect(data.contact.whatsapp).toBe('31988887777')
    expect(data.contact.units).toEqual([{ whatsapp: '31988887777' }])
  })
})

describe('A8: voltar para o site guardado', () => {
  it('lê só as páginas válidas da cópia', () => {
    expect(
      backupPages({
        pages: [{ id: 1, slug: 'inicio', live: true }, { id: 'x' }, null, { id: 2, slug: 'b' }],
      }),
    ).toEqual([
      { id: 1, slug: 'inicio', live: true },
      { id: 2, slug: 'b', live: false },
    ])
    expect(backupPages({ pages: 'x' })).toEqual([])
  })

  it('links do menu para páginas que não existem mais saem, os outros ficam', () => {
    const header = {
      items: [
        { label: 'A', link: { kind: 'page', page: 1 } },
        { label: 'B', link: { kind: 'page', page: 2 } },
        { label: 'C', link: { kind: 'url', url: 'https://x.com' } },
        {
          label: 'Grupo',
          link: { kind: 'page', page: 1 },
          children: [
            { label: 'D', link: { kind: 'section', page: 2, section: 'x' } },
            { label: 'E', link: { kind: 'page', page: { id: 1 } } },
          ],
        },
      ],
      button: { label: 'Fale', link: { kind: 'page', page: 2 } },
    }
    const kept = keepLinks(header, new Set([1]))
    expect(kept.items.map((item) => item.label)).toEqual(['A', 'C', 'Grupo'])
    expect(kept.items[2].children?.map((item) => item.label)).toEqual(['E'])
    expect(kept.button.link).toEqual({ kind: 'page', page: null })
  })
})
