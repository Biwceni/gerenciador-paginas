import { describe, expect, it } from 'vitest'

import {
  adjustUntil,
  brandCombos,
  brandPalette,
  currentCombo,
  extractLogoColors,
  fitPrimary,
  hexToRgb,
  LOGO_SAMPLE_SIZE,
  mixColors,
  pickMainColor,
  primaryReads,
  saturation,
  vividColor,
} from '@/lib/brand'
import { contrastRatio, relativeLuminance } from '@/lib/colors'
import { FONT_PAIRS, guessBusiness } from '@/lib/fontPairs'
import { finishSteps } from '@/lib/panel'
import { isSmallPhoto, photoNeeds, smallPhotos } from '@/lib/photoSize'
import { bannerPhotoId, fontFileURL, shareImagePath, shareTitleSize } from '@/lib/shareImage'
import { RESERVED_SLUGS } from '@/lib/slug'
import { contrastWarnings, formatRatio } from '@/lib/style-presets'
import type { PuckPageData } from '@/puck/schema'

/**
 * Logo de mentira: pixels RGBA de 48 × 48, como o canvas entrega. Cada parte é uma cor e a fatia
 * da imagem; `null` é transparente.
 */
function logo(parts: [string | null, number][]): Uint8ClampedArray {
  const total = LOGO_SAMPLE_SIZE * LOGO_SAMPLE_SIZE
  const pixels = new Uint8ClampedArray(total * 4)
  let index = 0
  for (const [color, share] of parts) {
    const count = Math.round(share * total)
    const [r, g, b] = color ? hexToRgb(color) : [0, 0, 0]
    for (let i = 0; i < count && index < total; i++, index++) {
      pixels.set([r, g, b, color ? 255 : 0], index * 4)
    }
  }
  return pixels
}

/** Logo metálico: fundo branco, degradê de prata e grafite (pouca cor), um fio azulado escuro. */
function metallicLogo(): Uint8ClampedArray {
  const total = LOGO_SAMPLE_SIZE * LOGO_SAMPLE_SIZE
  const pixels = new Uint8ClampedArray(total * 4)
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / LOGO_SAMPLE_SIZE)
    let rgb: [number, number, number] = [255, 255, 255]
    if (row >= 8 && row < 40) {
      // Grafite azulado ao prata, conforme a linha (como um metal escovado).
      const t = (row - 8) / 32
      rgb = [Math.round(52 + 120 * t), Math.round(58 + 122 * t), Math.round(70 + 128 * t)]
    }
    pixels.set([...rgb, 255], i * 4)
  }
  return pixels
}

const LOGOS = {
  metalico: metallicLogo(),
  colorido: logo([
    ['#ffffff', 0.4],
    ['#d62828', 0.3],
    ['#1d3557', 0.2],
    ['#fcbf49', 0.1],
  ]),
  transparente: logo([
    [null, 0.6],
    ['#2a9d8f', 0.3],
    ['#264653', 0.1],
  ]),
}

describe('leitura das cores do logo', () => {
  it('logo colorido: acha as cores com a fatia de cada uma e escolhe a vermelha', () => {
    const colors = extractLogoColors(LOGOS.colorido)
    expect(colors.map((item) => item.color)).toEqual(['#ffffff', '#d62828', '#1d3557', '#fcbf49'])
    expect(colors[1].share).toBeCloseTo(0.3, 2)
    expect(colors.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(1, 5)
    expect(pickMainColor(colors)).toBe('#d62828')
  })

  it('PNG transparente: o transparente não conta nas fatias nem nas cores', () => {
    const colors = extractLogoColors(LOGOS.transparente)
    expect(colors).toHaveLength(2)
    expect(colors[0]).toMatchObject({ color: '#2a9d8f' })
    expect(colors[0].share).toBeCloseTo(0.75, 2)
    expect(pickMainColor(colors)).toBe('#2a9d8f')
  })

  it('logo escuro metálico: junta os tons parecidos e aviva a cor escolhida', () => {
    const colors = extractLogoColors(LOGOS.metalico)
    // O degradê vira poucas cores, não uma por linha.
    expect(colors.length).toBeLessThanOrEqual(8)
    const main = pickMainColor(colors)
    expect(main).not.toBeNull()
    expect(main).not.toBe('#ffffff')
    expect(saturation(main!)).toBeLessThan(0.35)
    const vivid = vividColor(main!)
    expect(saturation(vivid)).toBeGreaterThan(saturation(main!))
    // Avivada, continua azulada (o azul é o canal mais forte).
    const [r, , b] = hexToRgb(vivid)
    expect(b).toBeGreaterThan(r)
  })

  it('ignora cor com menos de 0,5% da imagem para ser a principal', () => {
    const colors = extractLogoColors(
      logo([
        ['#ffffff', 0.7],
        ['#777777', 0.297],
        ['#ff0066', 0.003],
      ]),
    )
    expect(colors.some((item) => item.color === '#ff0066')).toBe(true)
    expect(pickMainColor(colors)).not.toBe('#ff0066')
  })

  it('imagem toda transparente não tem cor', () => {
    expect(extractLogoColors(logo([[null, 1]]))).toEqual([])
    expect(pickMainColor([])).toBeNull()
  })

  it('cor viva não muda ao avivar; cinza puro fica cinza', () => {
    expect(vividColor('#d62828')).toBe('#d62828')
    expect(vividColor('#808080')).toBe('#808080')
  })

  it('a mais escura do logo vira a cor escura', () => {
    const colors = extractLogoColors(LOGOS.colorido)
    const palette = brandPalette('#d62828', colors)
    expect(palette.accent).toBe('#d62828')
    // Já bem escura: fica como está.
    expect(palette.dark).toBe('#1d3557')
    // Mais clara que isso, escurece.
    const teal = brandPalette('#2a9d8f', extractLogoColors(logo([['#2a9d8f', 1]])))
    expect(relativeLuminance(teal.dark)).toBeLessThan(relativeLuminance('#2a9d8f') / 3)
  })
})

describe('ajuste de contraste', () => {
  it('escurece a principal sobre fundo claro até 4,5:1, em passos de 8%', () => {
    const fitted = fitPrimary('#fcbf49', '#ffffff')
    expect(contrastRatio(fitted, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(relativeLuminance(fitted)).toBeLessThan(relativeLuminance('#fcbf49'))
    // Um passo a menos não bastaria: mexe só o necessário.
    const steps: string[] = ['#fcbf49']
    while (steps.at(-1) !== fitted && steps.length < 80) {
      steps.push(mixColors(steps.at(-1)!, '#000000', 0.08))
    }
    expect(steps.at(-1)).toBe(fitted)
    expect(primaryReads(steps.at(-2)!, '#ffffff')).toBe(false)
  })

  it('clareia a principal sobre fundo escuro', () => {
    const fitted = fitPrimary('#1d3557', '#111111')
    expect(contrastRatio(fitted, '#111111')).toBeGreaterThanOrEqual(4.5)
    expect(relativeLuminance(fitted)).toBeGreaterThan(relativeLuminance('#1d3557'))
  })

  it('cor que já lê bem fica como está', () => {
    expect(fitPrimary('#1d3557', '#ffffff')).toBe('#1d3557')
    expect(adjustUntil('#123456', '#000000', () => true)).toBe('#123456')
  })
})

describe('combinações prontas', () => {
  const accents = [
    '#d62828',
    '#fcbf49',
    '#2a9d8f',
    '#e9c46a',
    '#8ecae6',
    '#ffb4c8',
    '#00ff00',
    '#ffff00',
    '#7b2cbf',
    '#808080',
    '#ffffff',
    '#000000',
  ]
  const darks = ['#000000', '#1d3557', '#264653', '#5a3e2b', '#808080', '#f0e0d0']

  it('as 3 passam 4,5:1 em texto, botões, links, faixa e rodapé para qualquer cor', () => {
    for (const accent of accents) {
      for (const dark of darks) {
        for (const combo of brandCombos({ accent, dark })) {
          expect(contrastWarnings(combo.colors), `${combo.name} com ${accent} e ${dark}`).toEqual(
            [],
          )
          expect(combo.ratio).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('para os logos de teste, do logo até as combinações', () => {
    for (const [name, pixels] of Object.entries(LOGOS)) {
      const colors = extractLogoColors(pixels)
      const combos = brandCombos(brandPalette(pickMainColor(colors)!, colors))
      expect(combos.map((combo) => combo.key)).toEqual(['noite', 'claro', 'forte'])
      for (const combo of combos) expect(contrastWarnings(combo.colors), name).toEqual([])
    }
  })

  it('noite tem fundo escuro; claro, fundo da principal clareada; forte, fundo branco', () => {
    const [night, light, strong] = brandCombos({ accent: '#d62828', dark: '#0d1b2a' })
    expect(relativeLuminance(night.colors.background)).toBeLessThan(0.05)
    expect(light.colors.background).toBe(mixColors('#d62828', '#ffffff', 0.93))
    expect(strong.colors.background).toBe('#ffffff')
    expect(formatRatio(night.ratio)).toMatch(/^\d+,\d:1$/)
  })

  it('reconhece a combinação em uso', () => {
    const combos = brandCombos({ accent: '#d62828', dark: '#0d1b2a' })
    expect(currentCombo(combos[1].colors, combos)).toBe('claro')
    expect(currentCombo({ ...combos[1].colors, text: '#000001' }, combos)).toBeNull()
  })
})

describe('pares de letras por ramo', () => {
  it('cada ramo tem 3 sugestões', () => {
    for (const pairs of Object.values(FONT_PAIRS)) expect(pairs).toHaveLength(3)
    expect(FONT_PAIRS.cafe[0]).toMatchObject({ headings: 'Cormorant Garamond', body: 'Montserrat' })
    expect(FONT_PAIRS.saude[0]).toMatchObject({ headings: 'Manrope', body: 'Manrope' })
  })

  const templates = [
    {
      siteType: 'institucional' as const,
      segment: 'cafe' as const,
      site: { fonts: { headings: 'Fraunces', body: 'Nunito' }, colors: { primary: '#6b3f24' } },
      pages: [{ slug: 'inicio' }, { slug: 'nossos-cafes' }, { slug: 'contato' }],
    },
    {
      siteType: 'institucional' as const,
      segment: 'saude' as const,
      site: { fonts: { headings: 'Lora', body: 'Figtree' }, colors: { primary: '#2f5d3a' } },
      pages: [{ slug: 'inicio' }, { slug: 'tratamentos' }, { slug: 'contato' }],
    },
    {
      siteType: 'evento' as const,
      segment: null,
      site: {
        fonts: { headings: 'Bebas Neue', body: 'Open Sans' },
        colors: { primary: '#111111' },
      },
      pages: [{ slug: 'inicio' }],
    },
  ]

  it('acha o ramo pelas páginas típicas, mesmo com cores e letras já trocadas', () => {
    expect(
      guessBusiness({ fonts: { headings: 'Inter' } }, ['inicio', 'tratamentos'], templates),
    ).toBe('saude')
  })

  it('acha o ramo pelas letras e cores do modelo', () => {
    expect(
      guessBusiness(
        { fonts: { headings: 'Bebas Neue', body: 'Open Sans' }, colors: { primary: '#111111' } },
        ['inicio'],
        templates,
      ),
    ).toBe('evento')
  })

  it('sem pista nenhuma, sugestões gerais', () => {
    expect(guessBusiness({}, ['inicio', 'contato'], templates)).toBe('geral')
  })
})

describe('foto pequena', () => {
  const data = {
    root: { props: {} },
    content: [
      { type: 'Hero', props: { id: 'h', style: 'image', image: { mediaId: 1 } } },
      { type: 'TextImage', props: { id: 't', image: { mediaId: 2 } } },
      { type: 'Gallery', props: { id: 'g', images: [{ mediaId: 3 }, { mediaId: 1 }] } },
      {
        type: 'Testimonials',
        props: { id: 'd', items: [{ quote: '', name: '', photo: { mediaId: 4 } }] },
      },
      { type: 'Hero', props: { id: 'h2', style: 'light', image: { mediaId: 5 } } },
    ],
  } as unknown as PuckPageData

  it('banner com foto pede 1.200 px, outras seções 700 px; depoimento e banner sem foto não contam', () => {
    expect(Object.fromEntries(photoNeeds(data))).toEqual({ 1: 1200, 2: 700, 3: 700 })
  })

  it('avisa só quando a largura é conhecida e menor', () => {
    expect(isSmallPhoto({ width: 400 }, 700)).toBe(true)
    expect(isSmallPhoto({ width: 1600 }, 1200)).toBe(false)
    expect(isSmallPhoto({ width: null }, 1200)).toBe(false)
    const widths: Record<number, number> = { 1: 1000, 2: 800, 3: 400 }
    expect(smallPhotos(data, (id) => ({ width: widths[id] }))).toEqual([
      { id: 1, minWidth: 1200 },
      { id: 3, minWidth: 700 },
    ])
  })
})

describe('imagem de compartilhar', () => {
  it('o endereço da imagem gerada é do sistema: nenhuma página pode usar', () => {
    expect(RESERVED_SLUGS).toContain('og')
  })
})

describe('fotos pequenas no Início', () => {
  const base = {
    tagline: 'Frase',
    whatsapp: '31999990000',
    email: null,
    examplePages: [],
    examplePhotoPages: 0,
    home: { id: 1, live: true },
  }

  it('sem foto pequena, os 5 passos de sempre', () => {
    expect(finishSteps(base).map((step) => step.key)).toEqual([
      'tagline',
      'contact',
      'texts',
      'photos',
      'home',
    ])
  })

  it('com foto pequena, um passo a mais que abre a primeira página', () => {
    const steps = finishSteps({
      ...base,
      smallPhotoPages: [
        { id: 7, title: 'Início' },
        { id: 9, title: 'Sobre' },
      ],
    })
    const sharp = steps.find((step) => step.key === 'sharp')
    expect(sharp).toMatchObject({ done: false, target: { page: 7 } })
    expect(sharp?.title).toContain('2 páginas')
    expect(sharp?.detail).toContain('pelo menos 1.600 px')
  })
})

describe('imagem de compartilhar gerada', () => {
  it('endereço com versão, para o WhatsApp não guardar a antiga', () => {
    expect(shareImagePath(5, '2026-11-07T10:00:00.000Z')).toMatch(/^\/og\/5\?v=[0-9a-z]+$/)
    expect(shareImagePath(5, null)).toBe('/og/5')
  })

  it('usa a foto do banner e, sem banner, a primeira foto', () => {
    const withHero = {
      root: { props: {} },
      content: [
        { type: 'TextImage', props: { id: 't', image: { mediaId: 2 } } },
        { type: 'Hero', props: { id: 'h', style: 'image', image: { mediaId: 1 } } },
      ],
    } as unknown as PuckPageData
    expect(bannerPhotoId(withHero)).toBe(1)
    expect(bannerPhotoId({ ...withHero, content: [withHero.content[0]] })).toBe(2)
  })

  it('lê o arquivo TTF do CSS do Google e diminui a letra de títulos longos', () => {
    const css =
      "@font-face { font-family: 'Lora'; src: url(https://fonts.gstatic.com/l/font?kit=abc) format('truetype'); }"
    expect(fontFileURL(css)).toBe('https://fonts.gstatic.com/l/font?kit=abc')
    expect(fontFileURL('nada')).toBeNull()
    expect(shareTitleSize('Café')).toBeGreaterThan(shareTitleSize('a'.repeat(80)))
  })
})
