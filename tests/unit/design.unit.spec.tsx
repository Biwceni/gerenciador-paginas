import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Features, Hero } from '@/puck/components/sections'
import { type ContentMetadata, heroWithoutPhoto } from '@/puck/references'
import { CONTENT_VERSION, type FeaturesProps, parsePageContent } from '@/puck/schema'
import { templateSeeds } from '@/seed/templates/data'

// Ajustes de design (QA visual): opções novas das seções com valor padrão, sem migração.

const metadata: ContentMetadata = {
  photos: {},
  forms: {},
  pageHrefs: {},
  pageAnchors: {},
  anchors: {},
  whatsappHref: null,
  site: { name: 'Clínica', logo: null, contact: {} },
}

const parse = (content: unknown[]) =>
  parsePageContent({ version: CONTENT_VERSION, data: { root: { props: {} }, content } })

// Destaques salvos antes do marcador existir.
const oldFeatures = {
  type: 'Features',
  props: {
    id: 'f',
    menuLabel: '',
    title: 'Por que nós',
    items: [
      { title: 'Rápido', text: 'Atende no mesmo dia.' },
      { title: 'Perto', text: 'No centro.' },
    ],
    style: 'light',
  },
}

const features = (props: Partial<FeaturesProps>) =>
  renderToStaticMarkup(
    <Features
      {...(parse([oldFeatures]).data!.data.content[0].props as FeaturesProps)}
      {...props}
      metadata={metadata}
    />,
  )

describe('Destaques: marcador', () => {
  it('páginas antigas, sem a opção salva, ficam sem marcador e com o ícone padrão', () => {
    const result = parse([oldFeatures])
    expect(result.success).toBe(true)
    const props = result.data!.data.content[0].props as FeaturesProps
    expect(props.marker).toBe('none')
    expect(props.items.map((item) => item.icon)).toEqual(['check', 'check'])
  })

  it('sem marcador: lista sem números e sem ícones', () => {
    const html = features({})
    expect(html).toMatch(
      /^<section[^>]*><div class="container anim-part">.*<ul class="features features--two">/,
    )
    expect(html).not.toContain('features__number')
    expect(html).not.toContain('features__icon')
    expect(html).not.toContain('<ol')
  })

  it('números só no passo a passo, numa lista numerada', () => {
    const html = features({ marker: 'number' })
    expect(html).toContain('<ol class="features features--two">')
    expect(html).toContain('<span aria-hidden="true" class="features__number">2</span>')
  })

  it('ícone: um desenho por item, escondido dos leitores de tela', () => {
    const html = features({ marker: 'icon' })
    expect(html).toContain('<ul class="features')
    expect(html.match(/class="features__icon"/g)).toHaveLength(2)
    expect(html).toContain('aria-hidden="true" class="features__icon"')
  })

  it('aceita só ícones da lista', () => {
    const bad = { ...oldFeatures, props: { ...oldFeatures.props, marker: 'icon' } }
    bad.props.items = [{ title: 'A', text: 'B', icon: 'foguete' } as never]
    expect(parse([bad]).success).toBe(false)
  })

  it('os modelos usam ícone, e números só no passo a passo', () => {
    const markers = templateSeeds
      .flatMap((seed) => seed.pages ?? [])
      .flatMap((page) =>
        (parsePageContent(page.content).data?.data.content ?? []).flatMap((item) =>
          item.type === 'Features' ? [{ slug: page.slug, marker: item.props.marker }] : [],
        ),
      )
    expect(markers.length).toBeGreaterThan(5)
    expect(markers.filter(({ marker }) => marker === 'none')).toEqual([])
    const steps = markers.filter(({ marker }) => marker === 'number')
    expect(steps.length).toBeGreaterThan(0)
    expect(steps.every(({ slug }) => slug === 'como-trabalhamos')).toBe(true)
  })
})

describe('Banner: Foto ao lado', () => {
  const hero = {
    id: 'h',
    title: 'Sorrisos',
    text: 'Clínica no centro',
    image: null,
    button: null,
    style: 'side' as const,
    align: 'center' as const,
    height: 'normal' as const,
    highlight: '',
  }

  it('é aceito pelo esquema sem mudar a versão do conteúdo', () => {
    expect(CONTENT_VERSION).toBe(2)
    expect(parse([{ type: 'Hero', props: hero }]).success).toBe(true)
  })

  it('banner salvo antes da opção Altura continua com a altura normal', () => {
    const { height: _height, ...before } = hero
    const result = parse([{ type: 'Hero', props: before }])
    expect(result.success).toBe(true)
    const props = result.success ? (result.data.data.content[0].props as { height?: string }) : {}
    expect(props.height).toBe('normal')
  })

  it('banner compacto ganha a classe própria', () => {
    const html = renderToStaticMarkup(<Hero {...hero} height="compact" metadata={metadata} />)
    expect(html).toContain('hero--compact')
    expect(renderToStaticMarkup(<Hero {...hero} metadata={metadata} />)).not.toContain(
      'hero--compact',
    )
  })

  it('sem foto, vira o fundo suave', () => {
    const html = renderToStaticMarkup(<Hero {...hero} metadata={metadata} />)
    expect(html).toContain('section--soft')
    expect(html).not.toContain('hero__photo')
  })

  it('com foto, a foto fica depois do texto e do botão (embaixo, no celular)', () => {
    const withPhoto = {
      ...metadata,
      photos: {
        7: { id: 7, url: '/foto.jpg', width: 800, height: 600, alt: 'Consultório' },
      } as unknown as ContentMetadata['photos'],
    }
    const html = renderToStaticMarkup(
      <Hero {...hero} image={{ mediaId: 7 }} metadata={withPhoto} />,
    )
    expect(html).toContain('hero--side')
    expect(html).not.toContain('hero--center')
    expect(html.indexOf('hero__inner')).toBeLessThan(html.indexOf('hero__photo'))
  })

  it('o Publicar sabe quando o banner está sem foto', () => {
    const data = (image: { mediaId: number } | null) =>
      parse([{ type: 'Hero', props: { ...hero, image } }, oldFeatures]).data!.data
    expect(heroWithoutPhoto(data(null), () => true)).toBe(true)
    expect(heroWithoutPhoto(data({ mediaId: 3 }), (id) => id === 3)).toBe(false)
    // Foto apagada da biblioteca conta como sem foto.
    expect(heroWithoutPhoto(data({ mediaId: 3 }), () => false)).toBe(true)
    expect(heroWithoutPhoto(parse([oldFeatures]).data!.data, () => true)).toBe(false)
  })
})
