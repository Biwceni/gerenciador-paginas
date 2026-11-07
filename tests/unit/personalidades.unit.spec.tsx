import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  isRoundLogo,
  siteBrand,
  SiteFooterView,
  SiteHeaderView,
} from '@/components/site/SiteChrome'
import { brandShades, PERSONALITY_TOKENS, themeStyle } from '@/components/site/theme'
import { toSettingsState, toSiteData } from '@/components/panel/settings'
import { contrastRatio, readableTint } from '@/lib/colors'
import { shortTagline, splitHighlight } from '@/lib/highlight'
import { COLOR_PRESETS } from '@/lib/style-presets'
import { PERSONALITIES, safePersonality } from '@/lib/theme'
import type { Media } from '@/payload-types'
import { Hero } from '@/puck/components/sections'
import type { ContentMetadata } from '@/puck/references'
import { CONTENT_VERSION, parsePageContent } from '@/puck/schema'
import { templateSeeds } from '@/seed/templates/data'

// Redesign v3, entrega 1: personalidades do site.

const metadata: ContentMetadata = {
  photos: {},
  forms: {},
  pageHrefs: {},
  pageAnchors: {},
  anchors: {},
  whatsappHref: null,
  site: { name: 'Café', logo: null, contact: {} },
}

const logo = (width: number, height: number) =>
  ({ id: 1, url: '/logo.png', alt: 'Logo', width, height }) as Media

describe('personalidade do site', () => {
  it('vazia ou desconhecida vira Clássico (nenhum site muda sozinho)', () => {
    expect(safePersonality(null)).toBe('classico')
    expect(safePersonality(undefined)).toBe('classico')
    expect(safePersonality('outra')).toBe('classico')
    expect(safePersonality('vitrine')).toBe('vitrine')
  })

  it('vai para o rascunho das Configurações e volta', () => {
    const state = toSettingsState({ name: 'Café', personality: 'editorial' })
    expect(state.personality).toBe('editorial')
    expect(toSiteData({ ...state, personality: 'aconchego' }).personality).toBe('aconchego')
    expect(toSettingsState({ name: 'Café' }).personality).toBe('classico')
  })

  it('Clássico publica as medidas de antes da v3', () => {
    const style = themeStyle({}) as Record<string, string>
    expect(style['--personality']).toBe('classico')
    expect(style['--container']).toBe('1080px')
    expect(style['--radius']).toBe('999px')
    expect(style['--section-pad']).toBe('clamp(44px, 8vw, 88px)')
    expect(style['--fs-h1']).toBe('clamp(34px, 21.6px + 3.19vw, 56px)')
    expect(style['--heading-weight']).toBe('700')
  })

  it('as novas usam 1180 px e medidas pela largura do site (cqi)', () => {
    for (const personality of PERSONALITIES.filter((value) => value !== 'classico')) {
      const tokens = PERSONALITY_TOKENS[personality]
      expect(tokens['--container']).toBe('1180px')
      expect(tokens['--section-pad']).toBe('clamp(64px, 10cqi, 128px)')
      // Títulos de seção até 68 px (o Aconchego, mais suave, fica abaixo).
      const maxH2 = Number(tokens['--fs-h2'].match(/cqi, (\d+)px\)$/)?.[1])
      expect(maxH2).toBeGreaterThanOrEqual(56)
      expect(maxH2).toBeLessThanOrEqual(68)
      const style = themeStyle({ personality }) as Record<string, string>
      expect(style['--personality']).toBe(personality)
    }
    expect(PERSONALITY_TOKENS.vitrine['--fs-h1']).toMatch(/124px\)$/)
    expect(PERSONALITY_TOKENS.editorial['--fs-h1']).toMatch(/116px\)$/)
  })
})

describe('tons da cor principal', () => {
  it('a cor que já se lê fica igual', () => {
    expect(readableTint('#111111', '#ffffff')).toBe('#111111')
  })

  it('cor clara sobre fundo claro escurece só até 4,5:1', () => {
    const tint = readableTint('#f4b400', '#ffffff')
    expect(contrastRatio(tint, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(tint).not.toBe('#000000')
  })

  it('todas as combinações prontas e os modelos têm destaque legível em cada fundo', () => {
    const palettes = [
      ...COLOR_PRESETS.map((preset) => preset.colors),
      ...templateSeeds.flatMap((seed) => (seed.site?.colors ? [seed.site.colors] : [])),
      { primary: '#ffeb3b', background: '#ffffff', surface: '#fffde7', text: '#222222' },
      { primary: '#0a0a0a', background: '#111111', surface: '#1c1c1c', text: '#f5f5f5' },
    ]
    for (const colors of palettes) {
      const shades = brandShades(colors)
      expect(contrastRatio(shades.accentText, colors.background!)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(shades.accentText, colors.surface!)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(shades.accentOnDark, shades.deep)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(shades.onDeep, shades.deep)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('palavras em destaque no título', () => {
  it('separa a última vez que as palavras aparecem, sem diferença de maiúsculas', () => {
    expect(splitHighlight('Café feito com calma', 'com calma')).toEqual([
      'Café feito ',
      'com calma',
      '',
    ])
    expect(splitHighlight('Doce, doce e DOCE', 'doce')).toEqual(['Doce, doce e ', 'DOCE', ''])
  })

  it('vazio ou fora do título: sem destaque', () => {
    expect(splitHighlight('Café', '')).toBeNull()
    expect(splitHighlight('Café', '   ')).toBeNull()
    expect(splitHighlight('Café', 'chá')).toBeNull()
  })

  it('o banner põe o destaque num <em>; banner antigo (sem o campo) fica igual', () => {
    const parsed = parsePageContent({
      version: CONTENT_VERSION,
      data: {
        root: { props: {} },
        content: [
          {
            type: 'Hero',
            props: {
              id: 'h',
              title: 'Café da roça',
              text: '',
              image: null,
              button: null,
              style: 'soft',
              align: 'left',
            },
          },
        ],
      },
    })
    expect(parsed.success).toBe(true)
    const hero = parsed.data!.data.content[0]
    if (hero.type !== 'Hero') throw new Error('esperava o banner')
    expect(hero.props.highlight).toBe('')

    const plain = renderToStaticMarkup(<Hero {...hero.props} metadata={metadata} />)
    expect(plain).not.toContain('<em>')
    const marked = renderToStaticMarkup(
      <Hero {...hero.props} highlight="da roça" metadata={metadata} />,
    )
    expect(marked).toContain('Café <em>da roça</em>')
  })
})

describe('topo e rodapé com mais marca', () => {
  it('frase curta da apresentação: só a primeira frase, até 48 letras', () => {
    expect(shortTagline('Torrefação artesanal. Desde 1998 em BH.')).toBe('Torrefação artesanal')
    expect(shortTagline('')).toBeNull()
    expect(shortTagline('x'.repeat(60))).toBeNull()
  })

  it('logo quadrado ou em pé fica redondo; deitado fica inteiro', () => {
    expect(isRoundLogo(logo(400, 400))).toBe(true)
    expect(isRoundLogo(logo(300, 400))).toBe(true)
    expect(isRoundLogo(logo(800, 200))).toBe(false)
  })

  const header = (personality: string) =>
    renderToStaticMarkup(
      <SiteHeaderView
        brand={siteBrand({ personality: personality as 'classico', tagline: 'Café especial.' })}
        button={null}
        items={[]}
        logo={logo(400, 400)}
        name="Café"
      />,
    )

  it('no Clássico o topo fica como antes', () => {
    const html = header('classico')
    expect(html).not.toContain('site-header__tagline')
    expect(html).not.toContain('site-header__logo--round')
    expect(html).toContain('class="site-header__brand"')
  })

  it('nas novas: frase embaixo do nome e logo redondo', () => {
    const html = header('vitrine')
    expect(html).toContain('<small class="site-header__tagline">Café especial</small>')
    expect(html).toContain('site-header__logo--round')
  })

  it('logo no rodapé só nas novas', () => {
    const footer = (personality: 'classico' | 'editorial') =>
      renderToStaticMarkup(
        <SiteFooterView
          brand={siteBrand({ personality })}
          contact={{ whatsapp: null, whatsappHref: null, email: null, address: null, hours: null }}
          logo={logo(400, 400)}
          menu={[]}
          name="Café"
          showContact
          social={[]}
          text={null}
        />,
      )
    expect(footer('classico')).not.toContain('site-footer__logo')
    expect(footer('editorial')).toContain('site-footer__logo site-footer__logo--round')
  })
})
