import { readFileSync } from 'node:fs'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { estimateMenuFit } from '@/components/panel/MenuEditor'
import { sameLook, toSettingsState, toSiteData } from '@/components/panel/settings'
import {
  type FooterContact,
  logoLook,
  mobileCtaMode,
  SiteFooterView,
  SiteHeaderView,
} from '@/components/site/SiteChrome'
import { secondColor, themeStyle } from '@/components/site/theme'
import {
  borderColor,
  brandCombos,
  brandPalette,
  currentCombo,
  hexToRgb,
  isWideLogo,
  removeConnected,
  suggestSecond,
} from '@/lib/brand'
import { contrastRatio, secondTextColor } from '@/lib/colors'
import { contrastChecks } from '@/lib/style-presets'
import type { Media } from '@/payload-types'
import { announcementPropsSchema } from '@/puck/schema'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 2a: A3, E1, E2 e o ícone da aba.

const siteCss = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')

const media = (id: number, width: number, height: number): Media =>
  ({ id, url: `/m${id}.png`, alt: 'Logo', width, height, filename: `m${id}.png` }) as Media

const wide = media(1, 600, 150)
const light = media(2, 600, 150)
const none: FooterContact = {
  whatsapp: null,
  whatsappHref: null,
  phone: null,
  phoneHref: null,
  email: null,
  address: null,
  hours: null,
}

const header = (props: Partial<React.ComponentProps<typeof SiteHeaderView>> = {}) =>
  renderToStaticMarkup(
    <SiteHeaderView button={null} items={[]} logo={wide} name="Ferragens Sul" {...props} />,
  )

const footer = (props: Partial<React.ComponentProps<typeof SiteFooterView>> = {}) =>
  renderToStaticMarkup(
    <SiteFooterView
      contact={none}
      logo={wide}
      menu={[]}
      name="Ferragens Sul"
      showContact={false}
      social={[]}
      text={null}
      {...props}
    />,
  )

describe('A3: com logo, o topo mostra só o logo', () => {
  const look = logoLook({}, null)

  it('o nome sai da vista, mas fica para o leitor de tela', () => {
    const html = header({ look })
    expect(html).toContain('site-header__brand--only')
    expect(html).toContain('<span class="visually-hidden">Ferragens Sul</span>')
  })

  it('"Mostrar o nome ao lado do logo" traz o nome de volta', () => {
    const html = header({ look: logoLook({ showNameWithLogo: true }, null) })
    expect(html).not.toContain('site-header__brand--only')
    expect(html).not.toContain('visually-hidden')
    expect(html).toContain('<span>Ferragens Sul</span>')
  })

  it('sem logo, o nome aparece como antes', () => {
    const html = header({ logo: null, look })
    expect(html).not.toContain('site-header__brand--only')
    expect(html).toContain('Ferragens Sul')
    expect(html).not.toContain('visually-hidden')
  })

  it('o logo tem altura fixa e largura máxima, menor no celular', () => {
    expect(siteCss).toMatch(
      /\.site-header__brand--only \.site-header__logo[^{]*\{[^}]*height: 44px/,
    )
    expect(siteCss).toMatch(/max-width: 200px/)
    expect(siteCss).toMatch(/height: 38px/)
    expect(siteCss).toMatch(/max-width: 160px/)
  })

  it('só o logo deixa mais espaço para o botão no celular', () => {
    const button = { label: 'Fale conosco', href: '/contato' }
    const name = 'Farol Drogarias e Manipulação'
    expect(mobileCtaMode(name, button, true)).toBe('menu')
    expect(mobileCtaMode(name, button, true, true)).toBe('text')
  })

  it('o menu do painel conta o logo sozinho como um nome curto', () => {
    const items = ['Início', 'Medicamentos', 'Manipulação', 'Lojas e unidades', 'Trabalhe conosco']
    const long = 'Farol Drogarias e Manipulação Popular'
    expect(estimateMenuFit(long, true, [...items, 'Convênios', 'Blog'], 'Fale conosco')).toBe(
      'rows',
    )
    expect(
      estimateMenuFit('x'.repeat(18), false, [...items, 'Convênios', 'Blog'], 'Fale conosco'),
    ).toBe('one')
  })
})

describe('E2: logo em qualquer fundo', () => {
  it('fundo e rodapé escuros vêm das cores do site', () => {
    const look = logoLook({ colors: { background: '#111111', footer: '#ffffff' } as never }, null)
    expect(look.darkBar).toBe(true)
    expect(look.darkFooter).toBe(false)
    expect(logoLook({}, null).onDark).toBe('auto')
    expect(logoLook({ logoOnDark: 'plate' }, null).onDark).toBe('plate')
  })

  it('com versão clara, o topo leva as duas e o CSS troca no fundo escuro', () => {
    const html = header({ look: logoLook({}, light) })
    expect(html).toContain('data-light=""')
    expect(html).toContain('site-header__logo--light')
    expect(siteCss).toContain('.site .site-header__logo--light')
  })

  it('versão branca e placa ficam marcadas para o fundo escuro, sem o contorno', () => {
    const white = header({ logoRing: true, look: logoLook({ logoOnDark: 'white' }, null) })
    expect(white).toContain('data-on-dark="white"')
    expect(white).not.toContain('site-header__logo--ring')
    const auto = header({ logoRing: true, look: logoLook({}, null) })
    expect(auto).toContain('site-header__logo--ring')
    expect(auto).not.toContain('data-on-dark')
  })

  it('o topo escuro ganha a classe para trocar o logo', () => {
    const look = logoLook({ colors: { background: '#14161a' } as never }, light)
    expect(header({ look })).toContain('site-header--dark')
  })

  it('no rodapé escuro: versão clara, branca ou placa', () => {
    expect(footer({ look: logoLook({}, light) })).toContain('data-media-id="2"')
    expect(footer({ look: logoLook({ logoOnDark: 'white' }, null) })).toContain(
      'site-footer__logo--white',
    )
    expect(footer({ look: logoLook({ logoOnDark: 'plate' }, null) })).toContain(
      'site-footer__logo--plate',
    )
    const lightFooter = logoLook(
      { logoOnDark: 'white', colors: { footer: '#f5f5f5' } as never },
      null,
    )
    expect(footer({ look: lightFooter })).not.toContain('site-footer__logo--white')
  })

  it('logo largo já tem o nome escrito; quadrado não', () => {
    expect(isWideLogo({ width: 600, height: 150 })).toBe(true)
    expect(isWideLogo({ width: 300, height: 300 })).toBe(false)
    expect(isWideLogo({ width: null, height: 300 })).toBe(false)
  })

  const image = (width: number, height: number, paint: (x: number, y: number) => number[]) => {
    const pixels = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) pixels.set(paint(x, y), (y * width + x) * 4)
    return pixels
  }

  it('acha o fundo de uma cor só, e só ele', () => {
    const solid = image(20, 10, (x, y) =>
      x > 5 && x < 14 && y > 2 && y < 7 ? [20, 20, 20, 255] : [255, 255, 255, 255],
    )
    expect(borderColor(solid, 20, 10)).toBe('#ffffff')
    const clear = image(20, 10, (x, y) =>
      x > 5 && x < 14 && y > 2 && y < 7 ? [20, 20, 20, 255] : [0, 0, 0, 0],
    )
    expect(borderColor(clear, 20, 10)).toBeNull()
    const gradient = image(20, 10, (x) => [x * 12, 100, 255 - x * 12, 255])
    expect(borderColor(gradient, 20, 10)).toBeNull()
  })

  it('tira o fundo ligado à borda e deixa o branco de dentro do desenho', () => {
    // Um anel preto com miolo branco: o miolo não é fundo.
    const ring = (x: number, y: number) => x >= 3 && x <= 8 && y >= 3 && y <= 8
    const inner = (x: number, y: number) => x >= 5 && x <= 6 && y >= 5 && y <= 6
    const pixels = image(12, 12, (x, y) =>
      ring(x, y) && !inner(x, y) ? [0, 0, 0, 255] : [255, 255, 255, 255],
    )
    removeConnected(pixels, 12, 12, '#ffffff')
    const alpha = (x: number, y: number) => pixels[(y * 12 + x) * 4 + 3]
    expect(alpha(0, 0)).toBe(0)
    expect(alpha(4, 4)).toBe(255)
    expect(alpha(5, 5)).toBe(255)
  })

  it('o ícone da aba recorta a sobra do logo', () => {
    const icon = readFileSync(path.resolve('src/lib/siteIcon.tsx'), 'utf8')
    expect(icon).toContain('.trim(')
  })
})

describe('E1: segunda cor', () => {
  it('as letras na segunda cor: a melhor entre branco e o texto do site', () => {
    expect(secondTextColor('#ffe14d', '#2a211b')).toBe('#2a211b')
    expect(secondTextColor('#1b2a6b', '#2a211b')).toBe('#ffffff')
    const neon = secondTextColor('#ff2bd6', '#2a211b')
    expect(contrastRatio(neon, '#ff2bd6')).toBeGreaterThanOrEqual(4.5)
    // Texto claro demais: cai no quase preto, que lê melhor que o branco.
    expect(secondTextColor('#c8c8c8', '#bbbbbb')).toBe('#111111')
  })

  it('só entra no tema quando foi escolhida', () => {
    expect(themeStyle({})).not.toHaveProperty('--color-second')
    const style = themeStyle({ colors: { second: '#FF2BD6' } as never }) as Record<string, string>
    expect(style['--color-second']).toBe('#ff2bd6')
    expect(style['--color-on-second']).toBeTruthy()
    expect(secondColor({ second: 'vermelho' } as never)).toBeNull()
  })

  it('a faixa de aviso usa a segunda cor, e a principal sem ela', () => {
    expect(siteCss).toContain('var(--color-second, var(--color-primary))')
    expect(siteCss).toContain('.site .announce--second')
  })

  it('a faixa de avisos do editor tem o estilo "Segunda cor"', () => {
    const parsed = announcementPropsSchema.safeParse({
      id: 'a',
      style: 'second',
      items: [{ text: 'Frete grátis' }],
    })
    expect(parsed.success && parsed.data.style).toBe('second')
  })

  it('a leitura das cores confere a faixa na segunda cor', () => {
    const base = {
      primary: '#6b3f24',
      background: '#fffdf9',
      surface: '#f5ebe0',
      text: '#2a211b',
      footer: '#2a211b',
    }
    const labels = (colors: object) => contrastChecks(colors as never).map((check) => check.label)
    expect(labels(base)).not.toContain('Faixa de aviso na segunda cor')
    expect(labels({ ...base, second: '#ffe14d' })).toContain('Faixa de aviso na segunda cor')
  })

  it('sugere a outra cor viva do logo, não o preto nem o branco', () => {
    const colors = [
      { color: '#ff0a78', share: 0.3 },
      { color: '#3a86ff', share: 0.3 },
      { color: '#ffffff', share: 0.3 },
      { color: '#111111', share: 0.1 },
    ]
    expect(suggestSecond(colors, '#ff0a78')).toBe('#3a86ff')
    expect(suggestSecond([{ color: '#ff0a78', share: 1 }], '#ff0a78')).toBeNull()
  })

  it('a combinação pronta continua marcada com uma segunda cor', () => {
    const combos = brandCombos(brandPalette('#ff0a78', [{ color: '#ff0a78', share: 1 }]))
    const colors = { ...combos[0].colors, second: '#3a86ff' }
    expect(currentCombo(colors, combos)).toBe(combos[0].key)
  })

  it('as configurações levam e trazem os campos novos', () => {
    const state = toSettingsState({
      name: 'Loja',
      showNameWithLogo: true,
      logoLight: 7,
      logoOnDark: 'white',
      colors: { second: '#3a86ff' } as never,
    })
    expect(state).toMatchObject({ showNameWithLogo: true, logoLight: 7, logoOnDark: 'white' })
    const data = toSiteData(state)
    expect(data).toMatchObject({ showNameWithLogo: true, logoLight: 7, logoOnDark: 'white' })
    expect(data.colors.second).toBe('#3a86ff')
    expect(toSiteData({ ...state, colors: { ...state.colors, second: '' } }).colors.second).toBe(
      null,
    )
    expect(toSettingsState({ logoOnDark: 'x' as never }).logoOnDark).toBe('auto')
    expect(hexToRgb('#3a86ff')).toEqual([58, 134, 255])
  })

  it('trocar só a segunda cor conta como mudança de visual', () => {
    const state = toSettingsState({ name: 'Loja' })
    const look = (second: string | null) => ({
      colors: { ...state.colors, second },
      personality: state.personality,
      fonts: state.fonts,
    })
    expect(sameLook(look(null), look('#3a86ff'))).toBe(false)
    expect(sameLook(look('#3A86FF'), look('#3a86ff'))).toBe(true)
  })
})
