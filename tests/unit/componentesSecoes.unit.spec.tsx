import { readFileSync } from 'node:fs'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({ toast: {} }))

import { heroPhotoMinWidth, photoNeeds } from '@/lib/photoSize'
import { fieldLimit } from '@/puck/fieldLimits'
import { LIMITS } from '@/puck/limits'
import type { Media } from '@/payload-types'
import { ANNOUNCE_STILL_MAX } from '@/puck/components/AnnounceMotion'
import {
  Announcement,
  Hero,
  PriceList,
  PRODUCT_PRICE_SHORT,
  Products,
  TEXT_IMAGE_LONG,
  TextImage,
  Features,
  Testimonials,
  Faq,
  instagramColumns,
  Contact,
  ColumnTitle,
  Video,
} from '@/puck/components/sections'
import { WhatsAppFloat } from '@/components/site/WhatsAppFloat'
import { PIECE_SHORTCUTS, pieceName } from '@/components/editor/ColumnPieces'
import { COLUMN_PIECES } from '@/puck/config'
import { pieceShows } from '@/puck/hiddenSections'
import { GalleryGrid } from '@/puck/components/GalleryGrid'
import { editorConfig } from '@/puck/editor-config'
import { tabOf } from '@/puck/fieldTabs'
import { sectionAnchors } from '@/puck/anchors'
import { balancedSplit, priceGroupWeight } from '@/puck/layout'
import type { ContentMetadata } from '@/puck/references'
import { CONTENT_VERSION, type HeroProps, parsePageContent } from '@/puck/schema'

// Pacote de componentes (avaliação de 2026-11-14), entregas C: seção por seção.

const css = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')

const photo = (id: number, width = 1600): Media =>
  ({ id, url: `/f${id}.jpg`, alt: 'Bolo', width, height: 1000 }) as Media

const metadata = (editing = false): ContentMetadata => ({
  photos: { 1: photo(1), 2: photo(2, 900) },
  forms: {},
  pageHrefs: {},
  pageAnchors: {},
  anchors: {},
  whatsappHref: null,
  site: { name: 'Mrs. Kluana', logo: null, contact: {}, motion: 'nenhum' },
  editing,
})

const hero = (props: Partial<HeroProps>) =>
  renderToStaticMarkup(
    <Hero
      align="left"
      button={null}
      height="normal"
      highlight=""
      id="h"
      image={{ mediaId: 1 }}
      metadata={metadata()}
      style="side"
      text="Bolos de pote"
      title="Doces"
      {...(props as object)}
    />,
  )

/** Um Banner completo, como o editor guarda. */
const heroProps = (props: Record<string, unknown>) => ({
  id: 'h',
  title: 'Oi',
  highlight: '',
  text: '',
  image: null,
  button: null,
  style: 'side',
  align: 'left',
  height: 'normal',
  ...props,
})

const parseHero = (props: Record<string, unknown>) =>
  parsePageContent({
    version: CONTENT_VERSION,
    data: { content: [{ type: 'Hero', props: heroProps(props) }] },
  })

const sectionClass = (html: string) => html.match(/<section class="([^"]+)"/)?.[1] ?? ''

describe('C1: Banner', () => {
  it('o alinhamento aceita "À direita" e a página antiga continua válida', () => {
    const page = (align: string) => parseHero({ align })
    expect(page('right').data?.data.content[0].props).toMatchObject({ align: 'right' })
    expect(page('left').data?.data.content[0].props).toMatchObject({ align: 'left' })
    expect(page('meio').success).toBe(false)
  })

  it('Foto ao lado: "À direita" põe a foto do lado esquerdo, "No centro" vale como à esquerda', () => {
    expect(sectionClass(hero({ align: 'right' }))).toContain('hero--photo-left')
    expect(sectionClass(hero({ align: 'right' }))).not.toContain('hero--right')
    const centered = sectionClass(hero({ align: 'center' }))
    expect(centered).not.toContain('hero--center')
    expect(centered).not.toContain('hero--photo-left')
  })

  it('fundo de cor: "À direita" alinha o texto à direita', () => {
    const html = sectionClass(hero({ style: 'brand', align: 'right', image: null }))
    expect(html).toContain('hero--right')
    expect(html).not.toContain('hero--photo-left')
  })

  it('a foto ao lado vai até a borda da tela (fora da personalidade Editorial)', () => {
    expect(css).toContain('--hero-bleed')
    expect(css).toMatch(/\.hero--photo-left[^{]*\.hero__photo[^{]*\{[^}]*order:\s*-1/)
  })

  it('foto do banner: 1.200 px com fundo Foto, 700 px com Foto ao lado (metade da tela)', () => {
    expect(heroPhotoMinWidth('image')).toBe(1200)
    expect(heroPhotoMinWidth('side')).toBe(700)
    expect(heroPhotoMinWidth('brand')).toBeUndefined()
    const needs = (style: string) =>
      photoNeeds(parseHero({ style, image: { mediaId: 2 } }).data?.data ?? null).get(2)
    expect(needs('image')).toBe(1200)
    expect(needs('side')).toBe(700)
  })
})

describe('C2: Faixa de aviso', () => {
  const phrases = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `Frase ${i + 1}` }))
  const strip = (n: number, mode: 'move' | 'static', editing = false) =>
    renderToStaticMarkup(
      <Announcement
        id="a"
        items={phrases(n)}
        metadata={metadata(editing)}
        mode={mode}
        style="brand"
      />,
    )

  it('Correndo e Parada usam a mesma letra', () => {
    expect(css).not.toMatch(/\.announce--static\s*\{[^}]*font-family/)
    expect(css).not.toMatch(/announce--move\s*\{[^}]*font-(family|style)/)
  })

  it('Parada mostra até 2 frases juntas; com mais, uma por vez no site', () => {
    expect(ANNOUNCE_STILL_MAX).toBe(2)
    expect(strip(2, 'static')).not.toContain('announce__still--rotate')
    const three = strip(3, 'static')
    expect(three).toContain('announce__still--rotate')
    expect(three.match(/data-on="true"/g)).toHaveLength(1)
    expect(three).toContain('aria-label="Aviso: Frase 1. Frase 2. Frase 3"')
    // No editor, todas à vista para escrever, com o selo do que acontece no site.
    const editor = strip(3, 'static', true)
    expect(editor).not.toContain('announce__still--rotate')
    expect(editor).toContain('No site, uma frase por vez')
  })

  it('sem botão de pausar: para com mouse, foco e dedo, e fica parada com reduzir movimento', () => {
    const html = strip(2, 'move')
    expect(html).not.toContain('<input')
    expect(html).toContain('tabindex="0"')
    expect(css).not.toContain('announce__pause')
    expect(css).toMatch(/:is\(:hover, :focus-within, \[data-held\]\) \.announce__track/)
    // A troca e a trilha só existem dentro do bloco sem pedido de menos movimento.
    const motion = css.slice(
      css.indexOf(
        '@media (prefers-reduced-motion: no-preference) {\n  .site[data-animate] .announce--move',
      ),
    )
    expect(motion.slice(0, 1500)).toContain('announce__still--rotate')
  })
})

describe('C3: Vitrine', () => {
  const product = (price = '', link: { kind: string } | null = { kind: 'whatsapp' }) => ({
    image: { mediaId: 1 },
    name: 'Bolo de pote',
    text: '',
    price,
    button: { label: 'Pedir pelo WhatsApp', link },
  })
  const site = { ...metadata(), whatsappHref: 'https://wa.me/5511999990000' }
  const shelf = (items: ReturnType<typeof product>[]) =>
    renderToStaticMarkup(
      <Products
        id="p"
        items={items as never}
        layout="three"
        menuLabel=""
        metadata={site}
        style="light"
        text=""
        title="Produtos"
      />,
    )

  it('a grade se ajusta à quantidade: 4 viram 2+2, a sobra fica no centro', () => {
    expect(shelf([1, 2, 3, 4, 5].map(() => product()))).toContain('data-count="5"')
    expect(css).toMatch(/\.products--three\[data-count='4'\]\s*\{\s*--n: 2/)
    expect(css).toMatch(/:last-child:nth-child\(3n \+ 1\)\s*\{\s*grid-column: 3 \/ span 2/)
    expect(css).toMatch(/:nth-last-child\(2\):nth-child\(3n \+ 1\)\s*\{\s*grid-column: 2 \/ span 2/)
  })

  it('botão de pedir cheio, com o ícone do WhatsApp quando abre a conversa', () => {
    const whats = shelf([product()])
    expect(whats).toContain('product__link product__link--whats')
    expect(whats).toContain('<svg')
    const other = shelf([product('', { kind: 'external' }) as never])
    expect(other).not.toContain('product__link--whats')
    expect(css).toMatch(/\.site \.product__link \{[^}]*background: var\(--color-primary\)/)
  })

  it('botão até 22 letras; preço longo numa linha só, menor', () => {
    expect(LIMITS.productButton).toBe(22)
    expect(fieldLimit('Products', 'items[0].button.label')).toBe(22)
    // Os outros botões continuam com 30.
    expect(fieldLimit('Hero', 'button.label')).toBe(LIMITS.buttonLabel)
    const long = shelf([product('a partir de R$ 1.200,00')])
    expect('a partir de R$ 1.200,00'.length).toBeGreaterThan(PRODUCT_PRICE_SHORT)
    expect(long).toContain('data-long="true"')
    expect(shelf([product('R$ 45')])).not.toContain('data-long')
    expect(css).toMatch(/\.product__price \{\s*white-space: nowrap/)
  })
})

describe('C4: Cardápio', () => {
  const group = (name: string, count: number) => ({
    name,
    image: null,
    items: Array.from({ length: count }, (_, i) => ({
      name: `${name} ${i + 1}`,
      description: '',
      price: 'R$ 10',
    })),
  })
  const menu = (groups: ReturnType<typeof group>[], columns: 'one' | 'two' = 'two') =>
    renderToStaticMarkup(
      <PriceList
        columns={columns}
        groups={groups as never}
        id="m"
        leader="dots"
        menuLabel=""
        metadata={metadata()}
        style="light"
        text=""
        title="Cardápio"
      />,
    )

  it('reparte os grupos em duas colunas do tamanho mais parecido, sem mudar a ordem', () => {
    expect(balancedSplit([10, 2, 2, 2, 2])).toBe(1)
    expect(balancedSplit([3, 3, 3, 3])).toBe(2)
    expect(balancedSplit([1, 1, 8])).toBe(2)
    expect(balancedSplit([5])).toBe(1)
    expect(priceGroupWeight(3, true)).toBeGreaterThan(priceGroupWeight(3, false))
    const html = menu([group('Bolos', 10), group('Doces', 2), group('Tortas', 2), group('Kits', 3)])
    const columns = html.split('class="prices__column"').slice(1)
    expect(columns).toHaveLength(2)
    expect(columns[0]).toContain('Bolos 1')
    expect(columns[0]).not.toContain('Doces 1')
    expect(columns[1]).toContain('Kits 1')
  })

  it('uma coluna (ou um grupo só) não reparte', () => {
    expect(menu([group('Bolos', 3), group('Doces', 2)], 'one')).not.toContain('prices__column')
    expect(menu([group('Bolos', 3)])).not.toContain('prices__column')
  })

  it('no celular: nome numa linha com "…", preço embaixo, descrição em até 2 linhas', () => {
    const mobile = css.slice(css.indexOf('/* No celular (C4'))
    expect(mobile).toMatch(/\.price-item__name \{[^}]*text-overflow: ellipsis/)
    expect(mobile).toMatch(/\.price-item__leader \{\s*display: none/)
    expect(mobile).toMatch(/\.price-item__description \{[^}]*-webkit-line-clamp: 2/)
  })
})

describe('C5: Texto com foto', () => {
  const block = (title: string, text: string, editing = false) =>
    renderToStaticMarkup(
      <TextImage
        id="t"
        image={{ mediaId: 1 }}
        menuLabel=""
        metadata={metadata(editing)}
        side="right"
        style="light"
        text={text}
        title={title}
      />,
    )

  it('só a foto, sem texto: no centro e mais larga, sem a coluna de texto vazia', () => {
    const html = block('', '')
    expect(html).toContain('text-image--photo-only')
    expect(html).not.toContain('text-image__text')
    expect(css).toMatch(/\.text-image--photo-only \{\s*grid-template-columns: minmax\(0, 960px\)/)
    // No editor, a coluna de texto continua para dar para escrever.
    expect(block('', '', true)).toContain('text-image__text')
  })

  it('texto longo: a foto fica parada no topo enquanto o texto passa', () => {
    expect(block('Nossa história', 'a'.repeat(TEXT_IMAGE_LONG + 1))).toContain('text-image--long')
    expect(block('Nossa história', 'Curto')).not.toContain('text-image--long')
    expect(css).toMatch(/\.text-image--long \.text-image__photo \{\s*position: sticky/)
  })
})

describe('C6: Destaques', () => {
  const list = (count: number, marker: 'none' | 'icon' | 'number', steps: 'grid' | 'line') =>
    renderToStaticMarkup(
      <Features
        id="f"
        items={Array.from({ length: count }, (_, i) => ({
          title: `Passo ${i + 1}`,
          text: '',
          icon: 'check' as const,
          photo: null,
        }))}
        marker={marker}
        menuLabel=""
        metadata={metadata()}
        steps={steps}
        style="light"
        title="Como funciona"
      />,
    )

  it('ícone num círculo na cor do site; foto de 72 px', () => {
    expect(css).toMatch(
      /\.site \.features__icon \{[^}]*width: 64px[^}]*padding: 14px[^}]*background: var\(--color-primary\)/,
    )
    expect(css).toMatch(/\.site \.features__photo \{\s*width: 72px/)
  })

  it('um destaque só fica no centro e mais largo', () => {
    expect(list(1, 'icon', 'grid')).toContain('data-count="1"')
    expect(css).toMatch(
      /\.features\[data-count='1'\] \{\s*grid-template-columns: minmax\(0, 640px\)/,
    )
  })

  it('Linha de passos: só com Números, uma coluna por passo', () => {
    const line = list(4, 'number', 'line')
    expect(line).toContain('features--steps')
    expect(line).toContain('--n:4')
    expect(line).toContain('<ol')
    expect(list(4, 'icon', 'line')).not.toContain('features--steps')
    expect(list(4, 'number', 'grid')).not.toContain('features--steps')
  })

  it('o campo "Arrumação dos passos" fica em Aparência e o Marcador junto dos itens', () => {
    const fields = editorConfig.components.Features.fields as Record<string, { label?: string }>
    expect(fields.steps.label).toBe('Arrumação dos passos')
    expect(tabOf('Features', 'steps')).toBe('aparencia')
    expect(tabOf('Features', 'marker')).toBe('conteudo')
    expect(editorConfig.components.Features.defaultProps?.steps).toBe('grid')
  })
})

describe('C7: Depoimentos', () => {
  const quotes = (count: number, withPhoto = false) =>
    renderToStaticMarkup(
      <Testimonials
        id="t"
        items={Array.from({ length: count }, (_, i) => ({
          quote: `Ótimo ${i + 1}`,
          name: 'Ana',
          photo: withPhoto && i === 0 ? { mediaId: 1 } : null,
        }))}
        menuLabel=""
        metadata={metadata(true)}
        style="light"
        title="Clientes"
      />,
    )

  it('com 3 ou mais, o primeiro em destaque e os outros em duas colunas', () => {
    expect(quotes(3)).toContain('testimonials testimonials--featured')
    expect(quotes(2)).not.toContain('testimonials--featured')
    expect(css).toMatch(/\.testimonials--featured > li:first-child \{\s*flex-basis: 100%/)
    expect(css).toMatch(/\.testimonials--featured \{\s*--n: 2/)
  })

  it('com foto em algum, todos guardam a altura da foto', () => {
    expect(quotes(3, true)).toContain('testimonials--photos')
    expect(quotes(3)).not.toContain('testimonials--photos')
    expect(css).toMatch(/\.testimonials--photos figcaption \{\s*min-height: 48px/)
  })

  it('depoimento até 300 letras', () => {
    expect(LIMITS.testimonial).toBe(300)
    expect(fieldLimit('Testimonials', 'items[0].quote')).toBe(300)
  })
})

describe('C8: Perguntas frequentes', () => {
  const faq = (title: string) =>
    renderToStaticMarkup(
      <Faq
        id="q"
        items={[{ question: 'Entregam?', answer: 'Sim.' }]}
        menuLabel=""
        metadata={metadata()}
        style="light"
        title={title}
      />,
    )

  it('pergunta de 17 a 18 px e seta de 24 px', () => {
    expect(faq('Dúvidas')).toContain('height="24"')
    expect(css).toMatch(/\.faq summary \{\s*font-size: clamp\(17px, 1\.5cqi, 18px\)/)
  })

  it('no computador, título à esquerda parado e perguntas à direita com ~620 px', () => {
    expect(faq('Dúvidas')).toContain('faq-layout')
    expect(faq('')).not.toContain('faq-layout')
    expect(css).toMatch(/\.faq-layout \{[^}]*minmax\(0, 620px\)/)
    expect(css).toMatch(/\.faq-layout > \.section-title \{\s*position: sticky/)
  })
})

describe('C9: Galeria e Instagram', () => {
  it('mosaico em linhas: a ordem da lista e a largura pelo formato da foto', () => {
    const wide = { ...photo(1), width: 1600, height: 900 } as Media
    const tall = { ...photo(2), width: 800, height: 1200 } as Media
    const html = renderToStaticMarkup(
      <GalleryGrid
        items={[
          { photo: wide, caption: '' },
          { photo: tall, caption: '' },
        ]}
        layout="masonry"
        viewer={false}
      />,
    )
    expect(html).toContain('--ar:1.778')
    expect(html).toContain('--ar:0.667')
    expect(html.indexOf('--ar:1.778')).toBeLessThan(html.indexOf('--ar:0.667'))
    expect(css).toMatch(
      /\.gallery\.gallery--masonry > li \{\s*flex: var\(--ar, 1\) 1 calc\(var\(--ar, 1\) \* var\(--row-h\)\)/,
    )
    expect(css).toMatch(/\.gallery\.gallery--masonry \{[^}]*display: flex/)
  })

  it('legendas com quebra equilibrada', () => {
    expect(css).toMatch(/\.site \.gallery__caption,\s*\.site figcaption \{\s*text-wrap: pretty/)
  })

  it('Instagram com 6 fotos em 3+3', () => {
    expect(instagramColumns(6).desktop).toBe(3)
    expect(instagramColumns(5).desktop).toBe(5)
  })
})

describe('C10: Chamada para ação', () => {
  it('título de até 80 px, mais respiro e botão de 56 px', () => {
    expect(css).toMatch(/\.site \.cta h2 \{\s*font-size: clamp\(36px, 6\.4cqi, 80px\)/)
    expect(css).toMatch(/\.site \.section:has\(> \.cta\) \{\s*padding-block: clamp\(72px/)
    expect(css).toMatch(/\.site \.section \.cta \.button \{\s*min-height: 56px/)
  })
})

describe('C11: Contato', () => {
  const site = {
    ...metadata(),
    site: {
      ...metadata().site,
      contact: {
        whatsapp: '(11) 99999-0000',
        phone: '(11) 3333-0000',
        email: 'oi@doces.com',
        address: 'Rua A, 1',
        hours: 'Seg a sex',
      },
    },
  } as ContentMetadata
  const contact = (show: string[], featured: string) =>
    renderToStaticMarkup(
      <Contact
        featured={featured as never}
        id="c"
        menuLabel=""
        metadata={site}
        show={show as never}
        style="soft"
        text=""
        title="Fale com a gente"
      />,
    )
  const all = ['whatsapp', 'phone', 'email', 'address', 'hours']

  it('mostra só os canais marcados', () => {
    const html = contact(['phone', 'hours'], 'none')
    expect(html).toContain('Telefone')
    expect(html).toContain('Horário')
    expect(html).not.toContain('WhatsApp')
    expect(html).not.toContain('Endereço')
  })

  it('o canal em destaque vai num bloco com botão; os outros em linhas', () => {
    const html = contact(all, 'whatsapp')
    expect(html).toContain('contact__featured')
    expect(html).toContain('Chamar no WhatsApp')
    expect(html.match(/class="contact__item/g)).toHaveLength(4)
    expect(contact(all, 'email')).toContain('Mandar um e-mail')
  })

  it('destaque de um canal escondido ou "Nenhum": todos em linhas', () => {
    expect(contact(['phone', 'email'], 'whatsapp')).not.toContain('contact__featured')
    const none = contact(all, 'none')
    expect(none).not.toContain('contact__featured')
    expect(none.match(/class="contact__item/g)).toHaveLength(5)
  })

  it('os campos ficam na aba Conteúdo, com padrão de todos os canais e WhatsApp em destaque', () => {
    expect(tabOf('Contact', 'show')).toBe('conteudo')
    expect(tabOf('Contact', 'featured')).toBe('conteudo')
    expect(editorConfig.components.Contact.defaultProps).toMatchObject({
      show: all,
      featured: 'whatsapp',
    })
  })
})

describe('C12: Lista de links', () => {
  it('tem "Nome no menu", na aba Conteúdo, e vira âncora', () => {
    const fields = editorConfig.components.LinkList.fields as Record<string, { label?: string }>
    expect(fields.menuLabel.label).toBe('Nome no menu (opcional)')
    expect(tabOf('LinkList', 'menuLabel')).toBe('conteudo')
    expect(
      sectionAnchors({
        content: [{ type: 'LinkList', props: { id: 'l', menuLabel: 'Links' } }] as never,
      }),
    ).toEqual({ l: 'links' })
  })

  it('página antiga sem o campo continua válida', () => {
    const ok = parsePageContent({
      version: CONTENT_VERSION,
      data: {
        content: [
          {
            type: 'LinkList',
            props: {
              id: 'l',
              title: 'Oi',
              text: '',
              items: [{ label: 'Instagram', link: null }],
              style: 'soft',
              anim: 'site',
            },
          },
        ],
      },
    })
    expect(ok.data?.data.content[0].props).toMatchObject({ menuLabel: '' })
  })
})

describe('C13: Colunas', () => {
  it('peça nova "Título", que o site mostra só com texto', () => {
    expect(COLUMN_PIECES).toContain('ColumnTitle')
    expect(renderToStaticMarkup(<ColumnTitle id="t" title="Nossa história" />)).toBe(
      '<h3 class="column-title">Nossa história</h3>',
    )
    expect(renderToStaticMarkup(<ColumnTitle id="t" title="  " />)).toBe('')
    expect(pieceShows({ type: 'ColumnTitle', props: { title: 'Oi' } }, () => true)).toBe(true)
    expect(pieceShows({ type: 'ColumnTitle', props: { title: '' } }, () => true)).toBe(false)
    expect(tabOf('ColumnTitle', 'title')).toBe('conteudo')
  })

  it('atalhos "+ Título, + Texto, + Foto, + Botão" e nomes das peças na lista', () => {
    expect(PIECE_SHORTCUTS.map((item) => item.label)).toEqual(['Título', 'Texto', 'Foto', 'Botão'])
    expect(pieceName({ type: 'ColumnTitle', props: { title: 'Nossa história' } })).toBe(
      'Título: Nossa história',
    )
    expect(pieceName({ type: 'ColumnImage', props: { caption: '' } })).toBe('Foto')
    expect(pieceName({ type: 'ColumnButton', props: { button: { label: 'Fale' } } })).toBe(
      'Botão: Fale',
    )
  })

  it('o painel das peças fica em Conteúdo; o Texto chega sem título', () => {
    expect(tabOf('Columns', 'pieces')).toBe('conteudo')
    expect(editorConfig.components.ColumnText.defaultProps).toMatchObject({ title: '' })
  })

  it('espaço fixo entre as peças e coluna vazia tracejada no editor', () => {
    expect(css).toMatch(/\.site \.columns__column,[^{]*\{\s*display: grid;\s*gap: 20px/)
    expect(css).toMatch(/\.site \.columns__empty \{[^}]*border: 2px dashed/)
  })
})

describe('C14: Texto simples', () => {
  it('largura de leitura de cerca de 68 letras', () => {
    expect(css).toMatch(/\.site \.rich-text > div \{\s*max-width: 34em/)
  })
})

describe('C15: Vídeo', () => {
  const video = (cover: { mediaId: number } | null) =>
    renderToStaticMarkup(
      <Video
        caption=""
        cover={cover}
        id="v"
        menuLabel=""
        metadata={metadata()}
        style="light"
        title="Nosso ateliê"
        videoId="dQw4w9WgXcQ"
      />,
    )

  it('sem foto de capa, a miniatura do YouTube pelo nosso servidor (nada do Google antes do play)', () => {
    const html = video(null)
    expect(html).toContain('video__thumb')
    expect(html).toContain('/_next/image?url=https%3A%2F%2Fi.ytimg.com%2Fvi%2FdQw4w9WgXcQ')
    expect(html).not.toMatch(/src="https:\/\/i\.ytimg\.com/)
    expect(video({ mediaId: 1 })).not.toContain('i.ytimg.com')
  })

  it('play de 64 px na cor do site', () => {
    expect(css).toMatch(
      /\.site \.video__play \{\s*width: 64px;\s*height: 64px;\s*background: var\(--color-primary\)/,
    )
  })
})

describe('C16: Botão do WhatsApp', () => {
  it('no celular, só o ícone redondo de 56 px, sempre à vista', () => {
    const html = renderToStaticMarkup(<WhatsAppFloat href="https://wa.me/5511999990000" />)
    expect(html).toContain('aria-label="Falar no WhatsApp"')
    expect(html).not.toContain('data-hidden')
    expect(html).not.toContain('<span>WhatsApp</span>')
    expect(css).toMatch(
      /\.site \.wa-float \{\s*justify-content: center;\s*width: 56px;\s*height: 56px/,
    )
  })
})
