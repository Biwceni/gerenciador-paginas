import { readFileSync } from 'node:fs'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Photo } from '@/components/site/Photo'
import { fieldLimit } from '@/puck/fieldLimits'
import { FIT_MISMATCH, fitForPick, fitMismatch } from '@/lib/photoFit'
import type { Media } from '@/payload-types'
import { countStrips, sectionChecks } from '@/puck/checks'
import { HERO_LOOPS, heroStep } from '@/puck/components/HeroRotate'
import { CallToAction, Hero, Stats, TextImage } from '@/puck/components/sections'
import { hiddenSections } from '@/puck/hiddenSections'
import type { ContentMetadata } from '@/puck/references'
import { CONTENT_VERSION, type HeroProps, parsePageContent } from '@/puck/schema'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 3a: C1 (banner com até 3 chamadas),
// C2 (foto inteira ou preenchida) e C4 (faixa fina, um número só, botão no Texto com foto).

const siteCss = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')

const photo = (id: number, width: number, height: number) =>
  ({ id, url: `/f${id}.jpg`, width, height, alt: `Foto ${id}` }) as unknown as Media

const metadata: ContentMetadata = {
  photos: { 1: photo(1, 2400, 1200), 2: photo(2, 1600, 900), 3: photo(3, 240, 520) },
  forms: {},
  pageHrefs: {},
  pageAnchors: {},
  anchors: {},
  whatsappHref: 'https://wa.me/5531999990000',
  site: { name: 'Loja', logo: null, contact: {} },
  mainHeadingId: 'h',
}

const whats = (label: string) => ({ label, link: { kind: 'whatsapp' as const } })

const parse = (content: unknown[]) =>
  parsePageContent({ version: CONTENT_VERSION, data: { root: { props: {} }, content } })

/** Banner salvo antes da etapa 3a (sem chamadas, segundo botão nem troca). */
const oldHero = {
  id: 'h',
  title: 'Bem-vindo',
  text: 'Frase',
  image: { mediaId: 1 },
  button: whats('Fale com a gente'),
  style: 'image',
  align: 'left',
  height: 'normal',
  highlight: '',
}

const hero = (props: Partial<HeroProps> = {}) => {
  const parsed = parse([{ type: 'Hero', props: { ...oldHero, ...props } }])
  return parsed.data!.data.content[0].props as HeroProps
}

const render = (node: React.ReactElement) => renderToStaticMarkup(node)

describe('C1: banner com até 3 chamadas', () => {
  it('banner de antes abre com os valores padrão e continua igual (sem camadas nem bolinhas)', () => {
    const props = hero()
    expect(props.slides).toEqual([])
    expect(props.button2).toBeNull()
    expect(props.autoplay).toBe(true)
    expect(props.interval).toBe('6')
    expect(props.transition).toBe('fade')
    const html = render(<Hero {...props} metadata={metadata} />)
    expect(html).not.toContain('hero__copy')
    expect(html).not.toContain('hero__dots')
    expect(html).not.toContain('hero__buttons')
    expect(html).toContain('<h1')
  })

  it('no máximo 2 chamadas a mais; tempo e jeito fora da lista voltam ao padrão', () => {
    const slide = { title: 'Outra', text: '', image: null, button: null, button2: null }
    expect(
      parse([{ type: 'Hero', props: { ...oldHero, slides: [slide, slide, slide] } }]).success,
    ).toBe(false)
    const props = hero({ interval: '7' as HeroProps['interval'], transition: 'x' as 'fade' })
    expect(props.interval).toBe('6')
    expect(props.transition).toBe('fade')
  })

  const three = () =>
    hero({
      button2: whats('Ver catálogo'),
      slides: [
        {
          title: 'Segunda',
          text: 'Frase 2',
          image: { mediaId: 2 },
          button: whats('Quero'),
          button2: null,
        },
        {
          title: 'Terceira',
          text: '',
          image: null,
          button: whats('Pedir'),
          button2: whats('Ligar'),
        },
      ],
      interval: '4',
    })

  it('3 chamadas: só a primeira à vista e no teclado; título h1 só na primeira', () => {
    const html = render(<Hero {...three()} metadata={metadata} />)
    expect(html.match(/class="hero__copy"/g)).toHaveLength(3)
    expect(html).toMatch(/class="hero__copy" data-on="" data-slide="0"/)
    expect(html.match(/inert=""/g)).toHaveLength(2)
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html.match(/<h2 class="hero__title"/g)).toHaveLength(2)
    expect(html).toContain('hero--slides hero--fade')
    // Segundo botão com contorno, dentro do grupo de botões.
    expect(html).toContain('hero__buttons')
    expect(html).toContain('button button--ghost')
    // As bolinhas são do cliente (render só no navegador): o grupo existe no HTML.
    expect(html).toContain('aria-label="Chamadas do banner"')
    // Uma camada de fundo por chamada (as de depois entram no navegador).
    expect(html.match(/class="hero__layer"/g)).toHaveLength(3)
  })

  it('só a foto da primeira chamada vem no HTML (as outras entram depois do carregamento)', () => {
    const html = render(<Hero {...three()} metadata={metadata} />)
    expect(html).toContain('f1.jpg')
    expect(html).not.toContain('f2.jpg')
  })

  it('chamada sem título e sem frase não entra; no editor aparece só a primeira, com o aviso', () => {
    const props = hero({
      slides: [{ title: '  ', text: '', image: null, button: whats('X'), button2: null }],
    })
    expect(render(<Hero {...props} metadata={metadata} />)).not.toContain('hero__copy')
    const editing = render(<Hero {...three()} metadata={{ ...metadata, editing: true }} />)
    expect(editing).not.toContain('hero__copy')
    expect(editing).toContain('Este banner tem 3 chamadas')
  })

  it('troca: passa de uma em uma e para na primeira depois de 3 voltas', () => {
    let state = { current: 0, loops: 0, stop: false }
    let steps = 0
    while (!state.stop && steps < 50) {
      const step = heroStep(state.current, 3, state.loops)
      state = { current: step.next, loops: step.loops, stop: step.stop }
      steps++
    }
    expect(HERO_LOOPS).toBe(3)
    expect(steps).toBe(9)
    expect(state.current).toBe(0)
  })

  it('o CSS esconde as chamadas fora da vez e tira a transição com menos movimento', () => {
    expect(siteCss).toContain('.site .hero--slides [data-slide]:not([data-on])')
    expect(siteCss).toMatch(
      /prefers-reduced-motion: reduce\)\s*{\s*\.site \.hero--slides \[data-slide\]/,
    )
  })
})

describe('C2: foto inteira ou preenchida', () => {
  it('compara a foto com o espaço: bem mais alta, bem mais larga ou parecida', () => {
    expect(fitMismatch({ width: 240, height: 520 }, 4 / 3)).toBe('taller')
    expect(fitMismatch({ width: 2400, height: 1200 }, 1)).toBe('wider')
    expect(fitMismatch({ width: 800, height: 1062 }, 4 / 5)).toBeNull()
    expect(fitMismatch({ width: null, height: 100 }, 1)).toBeNull()
    expect(FIT_MISMATCH).toBeGreaterThan(1)
  })

  it('ao escolher a foto, marca "inteira" se ela não combina; senão, mantém o que estava', () => {
    expect(fitForPick({ width: 240, height: 520 }, 4 / 3, undefined)).toBe('contain')
    expect(fitForPick({ width: 1600, height: 1200 }, 4 / 3, 'contain')).toBe('contain')
    expect(fitForPick({ width: 1600, height: 1200 }, 4 / 3, undefined)).toBeUndefined()
  })

  it('foto inteira: sem corte, centrada, com o fundo escolhido', () => {
    const neutral = render(<Photo fill fit="contain" media={photo(3, 240, 520)} sizes="1px" />)
    expect(neutral).toContain('object-fit:contain')
    expect(neutral).toContain('background-color:var(--color-surface)')
    expect(neutral).toContain('data-fit="contain"')
    const brand = render(
      <Photo backdrop="brand" fill fit="contain" media={photo(3, 240, 520)} sizes="1px" />,
    )
    expect(brand).toContain('background-color:var(--color-primary)')
    const cover = render(<Photo fill media={photo(3, 240, 520)} sizes="1px" />)
    expect(cover).toContain('object-fit:cover')
    expect(cover).not.toContain('data-fit')
  })

  it('a referência da foto aceita jeito e fundo; valores desconhecidos voltam ao padrão', () => {
    const parsed = parse([
      {
        type: 'TextImage',
        props: {
          id: 't',
          menuLabel: '',
          title: 'T',
          text: '',
          image: { mediaId: 3, fit: 'zoom', backdrop: 'rosa' },
          side: 'right',
          style: 'light',
        },
      },
    ])
    expect(parsed.success).toBe(true)
    const props = parsed.data!.data.content[0].props as { image: unknown; button: unknown }
    expect(props.image).toEqual({ mediaId: 3, fit: 'cover', backdrop: 'neutral' })
    expect(props.button).toBeNull()
  })
})

describe('C4: faixa fina, um número só e botão no Texto com foto', () => {
  const cta = (props: Record<string, unknown> = {}) => (
    <CallToAction
      button={whats('Aproveitar')}
      id="c"
      menuLabel=""
      metadata={metadata}
      style="brand"
      text="Frase que não aparece na faixa"
      title="Frete grátis"
      {...props}
    />
  )

  it('faixa fina: etiqueta, título e botão; a frase fica de fora', () => {
    const html = render(cta({ layout: 'strip', tag: 'Novidade' }))
    expect(html).toContain('cta cta--strip')
    expect(html).toContain('cta__tag">Novidade')
    expect(html).not.toContain('Frase que não aparece')
    // Bloco continua como antes.
    expect(render(cta())).toContain('Frase que não aparece')
  })

  it('faixa fina só com a frase some no site, e o Publicar avisa', () => {
    expect(render(cta({ layout: 'strip', title: '', button: null }))).toBe('')
    const data = parse([
      {
        type: 'CallToAction',
        props: {
          id: 'c',
          menuLabel: '',
          title: '',
          text: 'Só a frase',
          button: null,
          style: 'brand',
          layout: 'strip',
        },
      },
    ]).data!.data
    expect(hiddenSections(data, () => true)).toHaveLength(1)
  })

  it('duas faixas finas na página: o Publicar avisa', () => {
    const strip = (id: string) => ({
      type: 'CallToAction',
      props: {
        id,
        menuLabel: '',
        title: 'Faixa',
        text: '',
        button: null,
        style: 'brand',
        layout: 'strip',
      },
    })
    const one = parse([strip('a')]).data!.data
    const two = parse([strip('a'), strip('b')]).data!.data
    expect(countStrips(one)).toBe(1)
    expect(countStrips(two)).toBe(2)
    const titles = (data: typeof one) =>
      sectionChecks(data, { hasPhoto: () => true }).map((c) => c.title)
    expect(titles(one).some((t) => t.includes('faixa fina'))).toBe(false)
    expect(titles(two)).toContain('A página tem 2 chamadas em faixa fina')
  })

  it('um número só: aceito pelo formato, "R$ 1,2 milhão" cabe e só os algarismos contam', () => {
    expect(fieldLimit('Stats', 'items[0].value')).toBeGreaterThanOrEqual('R$ 12,5 milhões'.length)
    const items = [{ value: 'R$ 1,2 milhão', text: 'em vendas no ano' }]
    const parsed = parse([
      { type: 'Stats', props: { id: 's', menuLabel: '', title: '', items, style: 'soft' } },
    ])
    expect(parsed.success).toBe(true)
    const html = render(
      <Stats id="s" items={items} menuLabel="" metadata={metadata} style="soft" title="" />,
    )
    expect(html).toContain('data-items="1"')
    expect(html).toContain('<span class="stats__affix">R$ </span>')
    expect(html).toContain('data-countup="1,2"')
    expect(html).toContain('<span class="stats__affix"> milhão</span>')
    expect(siteCss).toContain(".site .stats[data-items='1'] > .stats__item")
  })

  it('Texto com foto com botão: aparece embaixo do texto; só com foto e botão não vira "só a foto"', () => {
    const base = {
      id: 't',
      menuLabel: '',
      side: 'right' as const,
      style: 'light' as const,
      image: { mediaId: 3 },
      metadata,
    }
    const html = render(<TextImage {...base} button={whats('Saiba mais')} text="Texto" title="T" />)
    expect(html).toContain('text-image__button')
    expect(html.indexOf('Texto')).toBeLessThan(html.indexOf('Saiba mais'))
    const onlyButton = render(<TextImage {...base} button={whats('Saiba mais')} text="" title="" />)
    expect(onlyButton).not.toContain('text-image--photo-only')
    expect(render(<TextImage {...base} text="" title="" />)).toContain('text-image--photo-only')
  })
})
