import { readFileSync } from 'node:fs'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({ toast: {} }))

import { SiteNoticeView } from '@/components/site/SiteNoticeView'
import { activeNotice, NOTICE_MAX, noticeEnd } from '@/lib/notice'
import type { Media } from '@/payload-types'
import { PRODUCT_TEXT_SHORT, Products } from '@/puck/components/sections'
import { mainHeadingID, type ContentMetadata } from '@/puck/references'
import type { PuckPageData } from '@/puck/schema'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 1a: A1, A2, A4 e os extras.

const css = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')

const photo = (id: number): Media =>
  ({ id, url: `/f${id}.jpg`, alt: 'Foto', width: 1600, height: 1000 }) as Media

const metadata = (): ContentMetadata => ({
  photos: { 1: photo(1) },
  forms: {},
  pageHrefs: {},
  pageAnchors: {},
  anchors: {},
  whatsappHref: null,
  site: { name: 'Negócio', logo: null, contact: {}, motion: 'nenhum' },
  editing: false,
})

const page = (...types: string[]) =>
  ({
    root: { props: {} },
    content: types.map((type, index) => ({ type, props: { id: `${type}-${index}` } })),
  }) as unknown as PuckPageData

describe('A1: topo transparente da Vitrine', () => {
  it('a foto sobe a altura medida do topo, e não um número fixo', () => {
    expect(css).not.toMatch(/margin-top: -81px/)
    expect(css).not.toMatch(/margin-top: -65px/)
    expect(css).toMatch(
      /margin-top: calc\(-1 \* var\(--site-header-top, var\(--header-over-photo\)\)\)/,
    )
  })

  it('vale sem a animação por rolagem: sólido ao rolar pela classe, também com menos movimento', () => {
    expect(css).not.toContain('animation-timeline: scroll(root)')
    expect(css).toMatch(/& > :is\(\.site-header--scrolled, \.site-header--open\) \{/)
  })

  it('sombra de força fixa no alto da foto, por baixo do topo', () => {
    expect(css).toMatch(/rgb\(0 0 0 \/ 45%\) 0,/)
  })

  it('só quando o banner é a primeira coisa da página (A2)', () => {
    expect(css).not.toContain('.hero.section--image:first-of-type')
    expect(css).toMatch(/:has\(> main > \.hero\.section--image:first-child\)/)
  })

  it('o topo mede a altura sem rolagem à parte (nada pula ao encolher)', () => {
    const watch = readFileSync(path.resolve('src/components/site/HeaderWatch.tsx'), 'utf8')
    expect(watch).toContain("'--site-header-top'")
    expect(watch).toMatch(/if \(!header\.classList\.contains\('site-header--scrolled'\)\)/)
    const chrome = readFileSync(path.resolve('src/components/site/SiteChrome.tsx'), 'utf8')
    // Fica fora do menu: o topo da página de campanha (sem menu) também fica sólido ao rolar.
    expect(chrome.indexOf('<HeaderWatch />')).toBeGreaterThan(chrome.indexOf('{hasNav && ('))
  })
})

describe('A2: faixa antes do banner', () => {
  it('o banner depois de uma faixa continua sendo o título da página (sem título repetido)', () => {
    expect(mainHeadingID(page('Announcement', 'Hero'))).toBe('Hero-1')
    expect(mainHeadingID(page('Announcement', 'Announcement', 'Hero'))).toBe('Hero-2')
    expect(mainHeadingID(page('Hero'))).toBe('Hero-0')
    expect(mainHeadingID(page('Announcement', 'Products'))).toBeUndefined()
    expect(mainHeadingID(page('Products', 'Hero'))).toBeUndefined()
  })

  it('no celular, uma linha só de no máximo 44 px', () => {
    expect(css).toMatch(/\.site\[data-animate\] \.announce--move \{\s*max-height: 44px/)
  })
})

describe('Extra do A2: aviso no alto do site', () => {
  it('vale até o fim do dia escolhido, no horário de Brasília', () => {
    const end = noticeEnd('2026-12-25T12:00:00.000Z')
    expect(end).toBe(Date.parse('2026-12-26T02:59:59.999Z'))
    expect(noticeEnd(null)).toBeNull()
    expect(noticeEnd('qualquer')).toBeNull()
  })

  it('sem texto ou com o dia passado, nada aparece', () => {
    const now = Date.parse('2026-12-20T10:00:00Z')
    expect(activeNotice({ text: '  ' }, now)).toBeNull()
    expect(activeNotice({ text: 'Fechado', until: '2026-12-19T12:00:00.000Z' }, now)).toBeNull()
    expect(activeNotice({ text: ' Fechado  no feriado ' }, now)?.text).toBe('Fechado no feriado')
    expect(activeNotice({ text: 'Fechado', until: '2026-12-20T12:00:00.000Z' }, now)?.end).toBe(
      noticeEnd('2026-12-20'),
    )
    expect(NOTICE_MAX).toBe(90)
  })

  it('página estática: um script curto esconde o aviso vencido antes de aparecer', () => {
    const html = renderToStaticMarkup(<SiteNoticeView end={1000} text="Fechado no feriado" />)
    expect(html).toContain('class="site-notice" role="note"')
    expect(html).toContain('Date.now()>1000)n.hidden=true')
    expect(renderToStaticMarkup(<SiteNoticeView text="Sem dia" />)).not.toContain('<script')
    expect(css).toMatch(/\.site \.site-notice\[hidden\] \{\s*display: none/)
  })
})

describe('A4: grades iguais', () => {
  it('nenhum degrau nem coluna maior em nenhum jeito', () => {
    expect(css).not.toMatch(/nth-child\(3n \+ 2\) \{\s*margin-top/)
    expect(css).not.toMatch(/nth-child\(2n\) \{\s*margin-top/)
    expect(css).not.toContain('minmax(0, 1.3fr)')
  })

  it('preço e botão no pé do cartão', () => {
    expect(css).toMatch(/\.products:not\(\.products--list\) \.product__price \{\s*margin-top: auto/)
  })

  it('frase longa num cartão: um por linha no celular estreito', () => {
    const item = (text: string) => ({
      image: { mediaId: 1 },
      name: 'Item',
      text,
      price: '',
      button: { label: '', link: null },
    })
    const shelf = (text: string) =>
      renderToStaticMarkup(
        <Products
          anim="none"
          id="p"
          items={[item(''), item(text)]}
          layout="three"
          menuLabel=""
          metadata={metadata()}
          style="light"
          text=""
          title=""
        />,
      )
    expect(shelf('x'.repeat(PRODUCT_TEXT_SHORT))).not.toContain('data-wordy')
    expect(shelf('x'.repeat(PRODUCT_TEXT_SHORT + 1))).toContain('data-wordy="true"')
  })
})
