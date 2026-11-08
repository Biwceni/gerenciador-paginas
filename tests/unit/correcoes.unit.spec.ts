import { describe, expect, it } from 'vitest'

import { mobileCtaMode } from '@/components/site/SiteChrome'
import { archivedSlug } from '@/lib/applyTemplate'
import { blendColors, contrastRatio } from '@/lib/colors'
import { fallbackFontFaces } from '@/lib/fontFallback'
import { preloadFontFiles } from '@/lib/fontPreload'
import { pageTitle, UNTITLED_PAGE } from '@/lib/pageTitle'
import { sortPagesForList } from '@/lib/panel'
import { siteInitials } from '@/lib/initials'
import { breadcrumbJsonLd, jsonLdText, localBusinessJsonLd } from '@/lib/structuredData'
import { bannerTextRatio, COLOR_PRESETS, contrastWarnings } from '@/lib/style-presets'
import type { Site } from '@/payload-types'
import { templateSeeds } from '@/seed/templates/data'

// Correções do redesign v3, entrega 0.

describe('página sem nome', () => {
  it('aparece como "Página sem nome"', () => {
    expect(pageTitle(null)).toBe(UNTITLED_PAGE)
    expect(pageTitle('   ')).toBe(UNTITLED_PAGE)
    expect(pageTitle(' Contato ')).toBe('Contato')
  })

  it('não derruba a ordem da lista', () => {
    const pages = [
      { id: 1, title: 'Sobre', home: false },
      { id: 2, title: null as unknown as string, home: false },
      { id: 3, title: 'Início', home: true },
    ]
    expect(sortPagesForList(pages, []).map((page) => page.id)).toEqual([3, 2, 1])
  })
})

describe('topo do celular', () => {
  it('mantém o texto curto do botão quando cabe ao lado do nome', () => {
    expect(mobileCtaMode('Café Grão', { label: 'Encomendar', href: '/encomendas' })).toBe('text')
  })

  it('com logo, sobra menos espaço para o texto do botão', () => {
    const button = { label: 'Encomendar', href: 'https://wa.me/5531999990000' }
    expect(mobileCtaMode('Doces da Ana Luiza', button)).toBe('text')
    expect(mobileCtaMode('Doces da Ana Luiza', button, true)).toBe('icon')
  })

  it('sem espaço, fica só o ícone, se o destino tiver um', () => {
    const name = 'Mrs. Kluana Confeitaria Artesanal'
    expect(mobileCtaMode(name, { label: 'Pedir', href: 'https://wa.me/5511999990000' })).toBe(
      'icon',
    )
    expect(mobileCtaMode('Café', { label: 'Chamar no WhatsApp', href: 'https://wa.me/55' })).toBe(
      'icon',
    )
  })

  it('nunca deixa uma seta sem texto: sem ícone, o botão fica só no ☰', () => {
    expect(mobileCtaMode('Café', { label: 'Fazer uma encomenda', href: '/encomendas' })).toBe(
      'menu',
    )
  })
})

describe('dados estruturados', () => {
  const site: Partial<Site> = {
    name: 'Café Grão',
    tagline: 'Café coado na hora.',
    contact: { whatsapp: '(31) 99999-0000', address: 'Rua A, 10', hours: 'Seg a sáb, 7h às 19h' },
  }

  it('LocalBusiness só com o que está preenchido', () => {
    const data = localBusinessJsonLd({
      site,
      name: 'Café Grão',
      url: 'https://cafe.com.br/',
      logo: { url: '/api/media/file/logo.png' } as never,
      image: null,
      sameAs: ['https://instagram.com/cafe'],
    })
    expect(data).toMatchObject({
      '@type': 'LocalBusiness',
      name: 'Café Grão',
      telephone: '+5531999990000',
      address: { streetAddress: 'Rua A, 10' },
      logo: 'https://cafe.com.br/api/media/file/logo.png',
      image: 'https://cafe.com.br/api/media/file/logo.png',
      sameAs: ['https://instagram.com/cafe'],
    })
    expect(data.description).toBe('Café coado na hora. Horário: Seg a sáb, 7h às 19h')
    expect(data).not.toHaveProperty('email')
  })

  it('BreadcrumbList do Início até a página', () => {
    const data = breadcrumbJsonLd({
      homeName: 'Café Grão',
      homeURL: 'https://cafe.com.br/',
      page: { title: 'Contato', url: 'https://cafe.com.br/contato' },
    })
    expect(data.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Café Grão', item: 'https://cafe.com.br/' },
      { '@type': 'ListItem', position: 2, name: 'Contato', item: 'https://cafe.com.br/contato' },
    ])
  })

  it('o texto não fecha a tag do script', () => {
    const text = jsonLdText({ name: '</script><script>alert(1)</script>' })
    expect(text).not.toContain('<')
    expect(JSON.parse(text).name).toBe('</script><script>alert(1)</script>')
  })
})

describe('fonte dos títulos pré-carregada', () => {
  const css = [
    '@font-face{font-family:"Lora";font-style:normal;font-weight:400;font-display:swap;src:url(https://fontes.exemplo/lora/a.woff2) format("woff2");unicode-range:U+0000-00FF, U+0131}',
    '@font-face{font-family:"Lora";font-style:normal;font-weight:700;font-display:swap;src:url(https://fontes.exemplo/lora/ext.woff2) format("woff2");unicode-range:U+0100-02BA}',
    '@font-face{font-family:"Lora";font-style:normal;font-weight:700;font-display:swap;src:url(https://fontes.exemplo/lora/b.woff2) format("woff2");unicode-range:U+0000-00FF, U+0131}',
  ].join('\n')

  it('pré-carrega o latin em negrito dos títulos e o normal do texto', () => {
    expect(preloadFontFiles(css, { headings: 'lora', body: 'Lora' })).toEqual([
      { href: 'https://fontes.exemplo/lora/b.woff2', origin: 'https://fontes.exemplo' },
      { href: 'https://fontes.exemplo/lora/a.woff2', origin: 'https://fontes.exemplo' },
    ])
  })

  it('sem fontes copiadas, nada', () => {
    expect(preloadFontFiles(null, { headings: 'Lora' })).toEqual([])
    expect(preloadFontFiles(css, { headings: 'Poppins' })).toEqual([])
  })
})

describe('fonte de reserva com as medidas da fonte do cliente', () => {
  it('serifada sobre a Times New Roman, sem serifa sobre a Arial', async () => {
    const css = await fallbackFontFaces(['Cormorant Garamond', 'Montserrat', 'Montserrat'])
    expect(css).toContain('font-family: "Cormorant Garamond Fallback"')
    expect(css).toContain("local('Times New Roman')")
    expect(css).toContain('font-family: "Montserrat Fallback"')
    expect(css).toContain("local('Arial')")
    expect(css.match(/@font-face/g)).toHaveLength(2)
    expect(css).toMatch(/size-adjust: [0-9.]+%/)
  })

  it('fonte desconhecida fica sem reserva', async () => {
    expect(await fallbackFontFaces(['Fonte Que Nao Existe', null])).toBe('')
  })
})

describe('ícone do site', () => {
  it('usa as iniciais do nome, sem acento', () => {
    expect(siteInitials('Café Grão Mineiro')).toBe('CM')
    expect(siteInitials('Ótica')).toBe('OT')
    expect(siteInitials('')).toBe('?')
  })
})

describe('"Começar de novo"', () => {
  it('a página arquivada libera o endereço com um nome que não se repete', () => {
    expect(archivedSlug('contato', 12)).toBe('contato-arquivada-12')
    expect(archivedSlug('a'.repeat(76), 3)).toMatch(/^a{60}-arquivada-3$/)
  })
})

describe('contraste dos modelos', () => {
  const sites = templateSeeds.filter((seed) => seed.kind === 'site')

  it('os 28 visuais passam AA na frase do banner, no item do menu e nos links', () => {
    expect(sites).toHaveLength(28)
    for (const seed of sites) {
      const colors = seed.site?.colors
      if (!colors) throw new Error(`${seed.key} sem cores`)
      expect(bannerTextRatio(colors.primary), `${seed.key}: banner`).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(colors.primary, colors.background),
        `${seed.key}: menu e links`,
      ).toBeGreaterThanOrEqual(4.5)
      expect(contrastWarnings(colors), seed.key).toEqual([])
    }
  })

  it('as combinações prontas não nascem com aviso', () => {
    for (const preset of COLOR_PRESETS)
      expect(contrastWarnings(preset.colors), preset.name).toEqual([])
  })

  it('avisa da cor principal usada como texto e da frase do banner', () => {
    const labels = contrastWarnings({
      primary: '#d94a63',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#111111',
      footer: '#111111',
    }).map((warning) => warning.label)
    expect(labels).toContain('Links e item do menu na cor principal')
    expect(labels).toContain('Frase do banner na cor principal')
  })

  it('mistura as cores como a opacidade do CSS', () => {
    expect(blendColors('#ffffff', '#000000', 0.5)).toBe('#808080')
  })
})
