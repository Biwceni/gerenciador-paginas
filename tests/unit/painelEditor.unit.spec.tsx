import { readFileSync } from 'node:fs'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CHOICE_THUMBS, ChoiceThumb } from '@/components/editor/ChoiceThumbs'
import { PUCK_COLORS } from '@/components/editor/EditorFrame'
import { VisualChoiceField } from '@/components/editor/VisualChoiceField'
import { PersonalitySwitch } from '@/components/editor/PersonalitySwitch'
import { NEW_SECTIONS, SectionThumb } from '@/components/editor/SectionThumb'
import { saveSitePersonality } from '@/components/panel/api'
import { contrastRatio } from '@/lib/colors'
import { PRODUCT_FAVICON } from '@/lib/site'
import { PERSONALITIES } from '@/lib/theme'

// Redesign v3, entrega 5: identidade do produto no painel e no editor.

const panelSCSS = readFileSync(path.resolve('src/app/(payload)/panel.scss'), 'utf8')

/** As variáveis `--gp-*` de um bloco de tema do panel.scss. */
function tokens(selector: string): Record<string, string> {
  const start = panelSCSS.indexOf(selector)
  const block = panelSCSS.slice(start, panelSCSS.indexOf('}', start))
  return Object.fromEntries(
    [...block.matchAll(/--gp-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((match) => [match[1], match[2]]),
  )
}

const light = tokens("html[data-theme='light'],")
const dark = tokens("html[data-theme='dark'] {")

describe('cores do painel (porcelana e anil)', () => {
  it('usa os valores da entrega no claro e no escuro', () => {
    expect(light).toMatchObject({
      bg: '#f4f4f1',
      surface: '#ffffff',
      'surface-2': '#ecece7',
      ink: '#18191d',
      muted: '#5b5d66',
      line: '#dcdcd5',
      'line-strong': '#8a8b92',
      accent: '#2f43c9',
      'accent-ink': '#ffffff',
      'accent-soft': '#e5e8fb',
    })
    expect(dark).toMatchObject({
      bg: '#111216',
      surface: '#191a20',
      'surface-2': '#22242b',
      ink: '#ecedf1',
      muted: '#a2a4ae',
      line: '#2c2e36',
      accent: '#8e9cff',
      'accent-ink': '#0d1030',
      'accent-soft': '#232a55',
    })
  })

  it('não sobrou o verde de antes', () => {
    expect(panelSCSS).not.toMatch(/#0f6b55|#4fbf98|#dbeee6/i)
  })

  for (const [name, theme] of [
    ['claro', light],
    ['escuro', dark],
  ] as const) {
    it(`todo par de texto passa de 4,5:1 no tema ${name}`, () => {
      const texts = ['ink', 'muted', 'accent', 'ok', 'warn', 'danger']
      const backgrounds = ['bg', 'surface', 'surface-2', 'accent-soft']
      for (const text of texts) {
        for (const background of backgrounds) {
          expect(
            contrastRatio(theme[text], theme[background]),
            `${text} sobre ${background}`,
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
      for (const [text, background] of [
        ['accent-ink', 'accent'],
        ['ok', 'ok-soft'],
        ['warn', 'warn-soft'],
        ['danger', 'danger-soft'],
      ]) {
        expect(contrastRatio(theme[text], theme[background])).toBeGreaterThanOrEqual(4.5)
      }
    })

    it(`contorno de campo tem 3:1 com o fundo e a superfície no tema ${name}`, () => {
      expect(contrastRatio(theme['line-strong'], theme.bg)).toBeGreaterThanOrEqual(3)
      expect(contrastRatio(theme['line-strong'], theme.surface)).toBeGreaterThanOrEqual(3)
    })
  }

  it('foco, seleção e cursor de digitação em anil', () => {
    expect(panelSCSS).toMatch(
      /:focus-visible \{\s*outline: 2px solid var\(--gp-accent\);\s*outline-offset: 2px;/,
    )
    expect(panelSCSS).toMatch(/::selection \{\s*background: var\(--gp-accent\);/)
    expect(panelSCSS).toMatch(/caret-color: var\(--gp-accent\)/)
  })
})

describe('marca do produto', () => {
  it('favicon do painel é o símbolo em SVG, com o anil do tema escuro', () => {
    expect(PRODUCT_FAVICON.startsWith('data:image/svg+xml,')).toBe(true)
    const svg = decodeURIComponent(PRODUCT_FAVICON.slice('data:image/svg+xml,'.length))
    expect(svg).toContain('#2f43c9')
    expect(svg).toContain('prefers-color-scheme:dark')
    expect(svg).toContain('#8e9cff')
    // Duas folhas e as linhas de texto.
    expect(svg.match(/<rect/g)).toHaveLength(2)
    expect(svg).toContain('M14 12h12M14 17h12M14 22h7')
  })
})

describe('escolha visual (VisualChoiceField)', () => {
  const options = [
    { value: 'light', label: 'Claro', thumb: <ChoiceThumb name="bg-light" /> },
    { value: 'soft', label: 'Suave', thumb: <ChoiceThumb name="bg-soft" /> },
    { value: 'brand', label: 'Cor do site', thumb: <ChoiceThumb name="bg-brand" /> },
  ]

  it('é um grupo de rádios com nome, a opção atual marcada e a miniatura de cada uma', () => {
    const html = renderToStaticMarkup(
      <VisualChoiceField
        columns={3}
        label="Fundo"
        name="style"
        onChange={() => {}}
        options={options}
        value="soft"
      />,
    )
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain('aria-label="Fundo"')
    expect(html).toContain('ed-thumbs--3')
    expect(html.match(/type="radio"/g)).toHaveLength(3)
    expect(html).toMatch(/checked=""[^>]*value="soft"|value="soft"[^>]*checked=""/)
    expect(html.match(/ed-thumb__svg/g)).toHaveLength(3)
  })

  it('tem duas colunas por padrão', () => {
    const html = renderToStaticMarkup(
      <VisualChoiceField
        label="Lado"
        name="side"
        onChange={() => {}}
        options={options}
        value="light"
      />,
    )
    expect(html).not.toContain('ed-thumbs--3')
  })

  it('tem miniatura para fundo, banner, lado da foto, colunas e marcador', () => {
    for (const name of [
      'bg-light',
      'bg-soft',
      'bg-brand',
      'hero-image',
      'hero-side',
      'side-left',
      'side-right',
      'cols-half',
      'cols-thirds',
      'cols-wide-left',
      'cols-wide-right',
      'marker-none',
      'marker-icon',
      'marker-number',
      'marker-photo',
    ]) {
      expect(CHOICE_THUMBS, name).toHaveProperty(name)
    }
  })

  it('as miniaturas usam as cores do site, não as do painel', () => {
    const html = renderToStaticMarkup(<ChoiceThumb name="bg-brand" />)
    expect(html).toContain('var(--ed-site-primary)')
    expect(html).toContain('var(--ed-site-on-primary)')
    expect(html).not.toContain('--gp-')
    expect(html).toContain('aria-hidden="true"')
  })
})

describe('lista "Adicionar seção"', () => {
  it('desenha as seções nas cores do site, com as do painel como reserva', () => {
    const html = renderToStaticMarkup(<SectionThumb type="Hero" />)
    expect(html).toContain('var(--ed-site-primary, var(--gp-accent))')
    expect(html).toContain('var(--ed-site-on-primary, var(--gp-accent-ink))')
  })

  it('marca como novas só as seções da entrega 4', () => {
    expect([...NEW_SECTIONS].sort()).toEqual(
      ['Announcement', 'InstagramStrip', 'PriceList', 'Products'].sort(),
    )
  })
})

describe('prévia do editor', () => {
  it('seção escolhida com contorno anil de 2 px e passar o mouse com o anil a 50%', () => {
    expect(PUCK_COLORS).toContain('--puck-slot-component-border-width: 2px')
    expect(PUCK_COLORS).toContain('--puck-slot-component-color-border-selected: #2f43c9')
    expect(PUCK_COLORS).toContain('rgb(47 67 201 / 50%)')
    expect(PUCK_COLORS).not.toMatch(/#0f6b55/i)
  })
})

describe('personalidade no topo do editor', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lista as quatro personalidades com a atual escolhida', () => {
    const html = renderToStaticMarkup(<PersonalitySwitch onChange={() => {}} value="vitrine" />)
    expect(html).toContain('>Personalidade</label>')
    expect(html.match(/<option/g)).toHaveLength(PERSONALITIES.length)
    expect(html).toMatch(/<option value="vitrine" selected="">Vitrine<\/option>/)
  })

  it('guarda só a personalidade no rascunho, sem apagar o resto das configurações', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init })
        const body =
          init?.method === 'POST'
            ? { result: {} }
            : {
                name: 'Doces da Ana',
                tagline: 'Feito à mão',
                personality: 'classico',
                colors: { primary: '#aa3355' },
                contact: { whatsapp: '11999990000' },
              }
        return new Response(JSON.stringify(body), { status: 200 })
      }),
    )

    await saveSitePersonality('/api', 'aconchego')

    expect(calls[0].url).toBe('/api/globals/site?depth=0&draft=true')
    expect(calls[1].url).toBe('/api/globals/site?draft=true')
    const sent = JSON.parse(String(calls[1].init?.body))
    expect(sent).toMatchObject({
      _status: 'draft',
      personality: 'aconchego',
      name: 'Doces da Ana',
      tagline: 'Feito à mão',
      colors: { primary: '#aa3355' },
      contact: { whatsapp: '11999990000' },
    })
  })
})
