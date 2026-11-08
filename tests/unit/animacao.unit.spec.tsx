import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { toSettingsState, toSiteData } from '@/components/panel/settings'
import { siteInfo } from '@/lib/content'
import {
  MOTIONS,
  resolveAnim,
  safeMotion,
  SECTION_ANIMS,
  sectionAnimValues,
  splitTitleLines,
} from '@/lib/motion'
import type { Media } from '@/payload-types'
import { CallToAction, Features, Gallery, Hero } from '@/puck/components/sections'
import type { ContentMetadata } from '@/puck/references'
import { CONTENT_VERSION, parsePageContent } from '@/puck/schema'
import { templateSeeds } from '@/seed/templates/data'

// Redesign v3, entrega 2: animação do site e de cada seção.

const metadata = (motion?: 'nenhum' | 'suave' | 'marcante', editing = false): ContentMetadata => ({
  photos: {
    1: { id: 1, url: '/a.jpg', alt: 'Bolo de cenoura', width: 1200, height: 800 } as Media,
    2: { id: 2, url: '/b.jpg', alt: '', width: 1200, height: 800 } as Media,
  },
  forms: {},
  pageHrefs: {},
  pageAnchors: {},
  anchors: {},
  whatsappHref: null,
  site: { name: 'Café', logo: null, contact: {}, motion },
  editing,
})

describe('resolveAnim: "Igual ao site" segue a Animação do site', () => {
  const table = [
    // site, valor da seção, resultado
    ['nenhum', 'site', 'none'],
    ['suave', 'site', 'esmaecer'],
    ['marcante', 'site', 'cascata'],
    ['nenhum', 'none', 'none'],
    ['suave', 'none', 'none'],
    ['marcante', 'none', 'none'],
    ['nenhum', 'cascata', 'cascata'],
    ['suave', 'cascata', 'cascata'],
    ['marcante', 'esmaecer', 'esmaecer'],
  ] as const

  it.each(table)('site %s, seção %s → %s', (motion, anim, expected) => {
    expect(resolveAnim({ type: 'Features', anim }, motion)).toBe(expected)
  })

  it('Marcante usa a primeira animação de cada seção', () => {
    for (const [type, options] of Object.entries(SECTION_ANIMS)) {
      expect(resolveAnim({ type, anim: 'site' }, 'marcante')).toBe(options[0])
    }
    expect(resolveAnim({ type: 'Hero' }, 'marcante')).toBe('linhas')
    expect(resolveAnim({ type: 'CallToAction' }, 'marcante')).toBe('subir')
  })

  it('sem valor, valor desconhecido ou de outra seção conta como "Igual ao site"', () => {
    expect(resolveAnim({ type: 'Features' }, 'marcante')).toBe('cascata')
    expect(resolveAnim({ type: 'Features', anim: 'piscar' }, 'suave')).toBe('esmaecer')
    // "Linhas e cortina" é do banner: nos Destaques, vale a do site.
    expect(resolveAnim({ type: 'Features', anim: 'linhas' }, 'nenhum')).toBe('none')
  })

  it('seção sem animação no mapa (peças das Colunas) não anima', () => {
    expect(resolveAnim({ type: 'ColumnText', anim: 'esmaecer' }, 'marcante')).toBe('none')
  })

  it('Animação do site vazia ou desconhecida vira Suave', () => {
    expect(safeMotion(null)).toBe('suave')
    expect(safeMotion('agitado')).toBe('suave')
    expect(MOTIONS).toEqual(['nenhum', 'suave', 'marcante'])
  })

  it('toda seção aceita "Igual ao site" e "Sem animação", nessa ordem', () => {
    expect(sectionAnimValues('Hero')).toEqual(['site', 'none', 'linhas', 'zoom', 'esmaecer'])
    expect(sectionAnimValues('Faq')).toEqual(['site', 'none', 'esmaecer'])
  })
})

describe('campo "anim" no conteúdo', () => {
  const page = (props: Record<string, unknown>) => ({
    version: CONTENT_VERSION,
    data: {
      content: [
        {
          type: 'Features',
          props: { id: 'f', menuLabel: '', title: '', items: [{ title: 'a', text: '' }], ...props },
        },
      ],
    },
  })
  const anim = (props: Record<string, unknown>) => {
    const result = parsePageContent(page({ style: 'light', ...props }))
    if (!result.success) throw result.error
    const section = result.data.data.content[0]
    return 'anim' in section.props ? section.props.anim : undefined
  }

  it('página antiga, sem o campo, fica em "Igual ao site" (versão continua 2)', () => {
    expect(CONTENT_VERSION).toBe(2)
    expect(anim({})).toBe('site')
  })

  it('guarda a escolha da seção; valor desconhecido vira "Igual ao site"', () => {
    expect(anim({ anim: 'cascata' })).toBe('cascata')
    expect(anim({ anim: 'none' })).toBe('none')
    expect(anim({ anim: 'zoom' })).toBe('site')
    expect(anim({ anim: 42 })).toBe('site')
  })

  it('os modelos continuam válidos', () => {
    for (const seed of templateSeeds) {
      for (const page of seed.pages ?? []) {
        const parsed = parsePageContent(page.content)
        expect(parsed.success).toBe(true)
        // Os modelos já nascem em "Igual ao site".
        for (const section of parsed.success ? parsed.data.data.content : []) {
          if ('anim' in section.props) expect(section.props.anim).toBe('site')
        }
      }
    }
  })
})

describe('Animação do site nas Configurações', () => {
  it('vai para o rascunho e volta; sem ela, Suave', () => {
    const state = toSettingsState({ name: 'Café', motion: 'marcante' })
    expect(state.motion).toBe('marcante')
    expect(toSiteData({ ...state, motion: 'nenhum' }).motion).toBe('nenhum')
    expect(toSettingsState({ name: 'Café' }).motion).toBe('suave')
  })

  it('chega às seções pelas informações do site', () => {
    expect(siteInfo({ name: 'Café', motion: 'marcante' }).motion).toBe('marcante')
    expect(siteInfo({ name: 'Café' }).motion).toBe('suave')
  })
})

describe('título em linhas', () => {
  it('curto fica numa linha só', () => {
    expect(splitTitleLines('Bolos caseiros')).toEqual(['Bolos caseiros'])
  })

  it('respeita as quebras digitadas (até 3)', () => {
    expect(splitTitleLines('Doces\nfeitos à mão')).toEqual(['Doces', 'feitos à mão'])
    expect(splitTitleLines('a\nb\nc\nd')).toEqual(['a', 'b', 'c d'])
  })

  it('divide em partes de tamanho parecido, sem perder palavras', () => {
    const title = 'Bolos caseiros feitos com carinho'
    const lines = splitTitleLines(title)
    expect(lines).toEqual(['Bolos caseiros', 'feitos com carinho'])
    const long = 'Café especial torrado na hora e servido com pão de queijo quentinho'
    const three = splitTitleLines(long)
    expect(three).toHaveLength(3)
    expect(three.join(' ')).toBe(long)
  })
})

describe('desenho com a animação', () => {
  const hero = (motion: 'nenhum' | 'suave' | 'marcante', anim?: 'site' | 'zoom') =>
    renderToStaticMarkup(
      <Hero
        align="left"
        anim={anim}
        button={null}
        height="normal"
        highlight="com carinho"
        id="h"
        image={{ mediaId: 1 }}
        // Primeira seção da página: o título é o principal e a foto tem prioridade.
        metadata={{ ...metadata(motion), mainHeadingId: 'h' }}
        style="image"
        text="Frase"
        title="Bolos caseiros feitos com carinho"
      />,
    )

  it('Marcante: banner com linhas e o destaque inteiro', () => {
    const html = hero('marcante')
    expect(html).toContain('anim anim--linhas')
    expect(html).toMatch(
      /<h1 class="hero__title"><span class="line" style="--i:0"><span class="anim-part">Bolos caseiros /,
    )
    expect(html).toContain('feitos <em>com carinho</em>')
    // A foto continua com prioridade (não atrasa o maior conteúdo da tela).
    expect(html).toMatch(/<img[^>]*fetchPriority="high"|<link[^>]*rel="preload"/i)
  })

  it('Suave: esmaecer, título como sempre', () => {
    const html = hero('suave')
    expect(html).toContain('anim anim--esmaecer')
    expect(html).not.toContain('class="line"')
    expect(html).toContain('<em>com carinho</em>')
  })

  it('a escolha da seção vence a do site', () => {
    expect(hero('nenhum', 'zoom')).toContain('anim--zoom')
    expect(hero('nenhum')).not.toContain('anim--')
  })

  it('itens em sequência levam a posição', () => {
    const html = renderToStaticMarkup(
      <Features
        id="f"
        items={[
          { title: 'Um', text: '', icon: 'check', photo: null },
          { title: 'Dois', text: '', icon: 'check', photo: null },
        ]}
        marker="none"
        menuLabel=""
        metadata={metadata('marcante')}
        style="light"
        title="Por que nós"
      />,
    )
    expect(html).toContain('anim anim--cascata')
    expect(html).toContain('style="--i:1"')
  })

  it('Chamada com "Título sobe"', () => {
    const html = renderToStaticMarkup(
      <CallToAction
        button={null}
        id="c"
        menuLabel=""
        metadata={metadata('marcante')}
        style="brand"
        text="Chame"
        title="Vamos conversar?"
      />,
    )
    expect(html).toContain('anim--subir')
    expect(html).toContain('<h2><span class="line" style="--i:0"><span class="anim-part">')
  })

  it('galeria: no site cada foto abre em tela cheia; no editor, não', () => {
    const props = {
      id: 'g',
      images: [
        { mediaId: 1, caption: '' },
        { mediaId: 2, caption: '' },
      ],
      layout: 'grid' as const,
      showCaptions: false,
      menuLabel: '',
      style: 'light' as const,
      title: 'Fotos',
    }
    const site = renderToStaticMarkup(<Gallery {...props} metadata={metadata('suave')} />)
    expect(site).toContain('aria-label="Ver foto 1 de 2 em tela cheia: Bolo de cenoura"')
    expect(site).toContain('aria-label="Ver foto 2 de 2 em tela cheia"')
    expect(site).toContain('<dialog')
    // A foto grande só entra quando a janela abre.
    expect(site.match(/<img/g)).toHaveLength(2)
    const editor = renderToStaticMarkup(<Gallery {...props} metadata={metadata('suave', true)} />)
    expect(editor).not.toContain('gallery__open')
    expect(editor).not.toContain('<dialog')
  })
})
