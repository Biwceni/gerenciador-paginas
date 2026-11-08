import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { resolveAnim } from '@/lib/motion'
import { photoNeeds } from '@/lib/photoSize'
import type { Media } from '@/payload-types'
import { sectionChecks } from '@/puck/checks'
import {
  Announcement,
  Features,
  Gallery,
  InstagramStrip,
  instagramColumns,
  PriceList,
  Products,
  Testimonials,
  TextImage,
} from '@/puck/components/sections'
import {
  announcementRun,
  galleryColumns,
  testimonialColumns,
  whatsAppMessageHref,
} from '@/puck/layout'
import type { ContentMetadata } from '@/puck/references'
import { sectionSummary } from '@/puck/sectionSummary'
import { CONTENT_VERSION, type PageComponent, parsePageContent } from '@/puck/schema'

// Redesign v3, entrega 4: seções novas para vender e ajustes nas que já existem.

const photo = (id: number, alt = ''): Media =>
  ({ id, url: `/f${id}.jpg`, alt, width: 1600, height: 2000 }) as Media

const metadata = (
  editing = false,
  site: Partial<ContentMetadata['site']> = {},
): ContentMetadata => ({
  photos: { 1: photo(1, 'Bolo de pote de morango'), 2: photo(2), 3: photo(3), 4: photo(4) },
  forms: {},
  pageHrefs: { 9: '/encomendas' },
  pageAnchors: {},
  anchors: {},
  whatsappHref: 'https://wa.me/5511999990000',
  site: { name: 'Mrs. Kluana', logo: null, contact: {}, motion: 'nenhum', ...site },
  editing,
})

const page = (content: unknown[]) =>
  parsePageContent({ version: CONTENT_VERSION, data: { content } })

describe('esquema: seções novas com padrão, sem mudar a versão', () => {
  it('a versão do conteúdo continua a 2', () => {
    expect(CONTENT_VERSION).toBe(2)
  })

  it('página antiga (Destaques e Galeria sem os campos novos) continua válida e igual', () => {
    const parsed = page([
      {
        type: 'Features',
        props: {
          id: 'f',
          menuLabel: '',
          title: 'Por que nós',
          items: [{ title: 'A', text: 'B' }],
          style: 'light',
        },
      },
      {
        type: 'Gallery',
        props: { id: 'g', menuLabel: '', title: '', images: [{ mediaId: 1 }], style: 'light' },
      },
    ])
    expect(parsed.success).toBe(true)
    const [features, gallery] = parsed.data!.data.content
    expect(features.type === 'Features' && features.props.marker).toBe('none')
    expect(features.type === 'Features' && features.props.items[0].photo).toBeNull()
    expect(gallery.type === 'Gallery' && gallery.props).toMatchObject({
      layout: 'grid',
      showCaptions: false,
      images: [{ mediaId: 1, caption: '' }],
      anim: 'site',
    })
  })

  it('as quatro seções novas aceitam o mínimo e completam o resto', () => {
    const parsed = page([
      {
        type: 'Products',
        props: { id: 'p', menuLabel: '', title: 'Vitrine', items: [{ name: 'Bolo' }] },
      },
      {
        type: 'PriceList',
        props: {
          id: 'c',
          menuLabel: '',
          title: 'Preços',
          groups: [{ name: 'Natal', items: [{ name: 'Panetone' }] }],
        },
      },
      { type: 'Announcement', props: { id: 'a', items: [{ text: 'Encomendas abertas' }] } },
      { type: 'InstagramStrip', props: { id: 'i', menuLabel: '', title: 'Insta', images: [] } },
    ])
    expect(parsed.success).toBe(true)
    const [products, prices, announce, insta] = parsed.data!.data.content
    expect(products.props).toMatchObject({ layout: 'three', style: 'light', anim: 'site' })
    expect(products.type === 'Products' && products.props.items[0]).toMatchObject({
      image: null,
      price: '',
    })
    expect(prices.props).toMatchObject({ columns: 'two', leader: 'dots', anim: 'site' })
    expect(announce.props).toMatchObject({ mode: 'move', style: 'brand' })
    expect('anim' in announce.props).toBe(false)
    expect(insta.props).toMatchObject({ style: 'light', anim: 'site' })
  })

  it('limites: até 12 produtos, 5 frases na faixa e 8 fotos no Instagram', () => {
    const products = Array.from({ length: 13 }, () => ({ name: 'Bolo' }))
    expect(
      page([{ type: 'Products', props: { id: 'p', menuLabel: '', title: '', items: products } }])
        .success,
    ).toBe(false)
    const phrases = Array.from({ length: 6 }, () => ({ text: 'Oi' }))
    expect(page([{ type: 'Announcement', props: { id: 'a', items: phrases } }]).success).toBe(false)
    const photos = Array.from({ length: 9 }, (_, i) => ({ mediaId: i + 1 }))
    expect(
      page([
        { type: 'InstagramStrip', props: { id: 'i', menuLabel: '', title: '', images: photos } },
      ]).success,
    ).toBe(false)
  })

  it('animação desconhecida vira "Igual ao site"; a Vitrine começa em "Um depois do outro"', () => {
    const parsed = page([
      {
        type: 'Products',
        props: { id: 'p', menuLabel: '', title: '', items: [{ name: 'A' }], anim: 'piscar' },
      },
    ])
    expect(parsed.data!.data.content[0].props).toMatchObject({ anim: 'site' })
    expect(resolveAnim({ type: 'Products' }, 'marcante')).toBe('cascata')
    expect(resolveAnim({ type: 'PriceList' }, 'marcante')).toBe('linhas')
    expect(resolveAnim({ type: 'InstagramStrip' }, 'marcante')).toBe('sequencia')
    expect(resolveAnim({ type: 'Announcement' }, 'marcante')).toBe('none')
  })
})

describe('sem item sozinho na última linha', () => {
  it('galeria de 2 a 12 fotos: a última linha nunca tem uma foto só', () => {
    expect(galleryColumns(1)).toBe(1)
    for (let count = 2; count <= 12; count++) {
      const columns = galleryColumns(count)
      expect(columns).toBeGreaterThan(1)
      expect(count % columns, `${count} fotos em ${columns} colunas`).not.toBe(1)
    }
    expect(galleryColumns(5)).toBe(3)
    expect(galleryColumns(7)).toBe(4)
    expect(galleryColumns(12)).toBe(3)
  })

  it('depoimentos de 1 a 6: 3 em 3 colunas, 4 em 2 + 2, sem sobra de um', () => {
    expect(testimonialColumns(3)).toBe(3)
    expect(testimonialColumns(4)).toBe(2)
    for (let count = 2; count <= 6; count++) {
      expect(count % testimonialColumns(count)).not.toBe(1)
    }
  })

  it('Instagram de 4 a 8 fotos: sem foto sozinha no computador nem no celular', () => {
    for (let count = 4; count <= 8; count++) {
      const { desktop, mobile } = instagramColumns(count)
      expect(count % desktop).not.toBe(1)
      expect(count % mobile).not.toBe(1)
    }
  })

  it('a galeria e os depoimentos levam as colunas no desenho', () => {
    const gallery = renderToStaticMarkup(
      <Gallery
        id="g"
        images={[1, 2, 3, 4].map((mediaId) => ({ mediaId, caption: '' }))}
        layout="grid"
        menuLabel=""
        metadata={metadata()}
        showCaptions={false}
        style="light"
        title=""
      />,
    )
    expect(gallery).toContain('data-count="4"')
    expect(gallery).toContain('--cols:4')
    const testimonials = renderToStaticMarkup(
      <Testimonials
        id="t"
        items={[1, 2, 3].map((n) => ({ quote: `Ótimo ${n}`, name: 'Ana', photo: null }))}
        menuLabel=""
        metadata={metadata()}
        style="soft"
        title=""
      />,
    )
    expect(testimonials).toContain('--cols:3')
  })
})

describe('Vitrine de produtos', () => {
  const items = [
    {
      image: { mediaId: 1 },
      name: 'Bolo de pote',
      text: 'De morango.',
      price: 'R$ 18',
      button: { label: 'Pedir pelo WhatsApp', link: { kind: 'whatsapp' as const } },
    },
    {
      image: null,
      name: 'Sem foto',
      text: '',
      price: '',
      button: { label: 'Pedir pelo WhatsApp', link: { kind: 'whatsapp' as const } },
    },
    {
      image: { mediaId: 2 },
      name: 'Kit presente',
      text: '',
      price: 'sob consulta',
      button: { label: 'Ver kits', link: { kind: 'page' as const, pageId: 9 } },
    },
  ]
  const render = (editing = false) =>
    renderToStaticMarkup(
      <Products
        id="p"
        items={items}
        layout="three"
        menuLabel=""
        metadata={metadata(editing)}
        style="light"
        text="Tudo sob encomenda."
        title="O que sai da cozinha"
      />,
    )

  it('no site, produto sem foto não aparece', () => {
    const html = render()
    expect(html).not.toContain('Sem foto')
    expect(html.match(/class="product /g)).toHaveLength(2)
  })

  it('"Pedir pelo WhatsApp" abre a conversa com o nome do produto', () => {
    const href = whatsAppMessageHref('https://wa.me/5511999990000', ' Bolo  de pote ')
    expect(href).toBe(
      'https://wa.me/5511999990000?text=Ol%C3%A1%21+Quero+saber+sobre%3A+Bolo+de+pote',
    )
    expect(render()).toContain(href!.replace(/&/g, '&amp;'))
    expect(whatsAppMessageHref(null, 'Bolo')).toBeNull()
  })

  it('o botão também leva a uma página, com o nome do produto para o leitor de tela', () => {
    const html = render()
    expect(html).toContain('href="/encomendas"')
    expect(html).toContain('<span class="visually-hidden">: Kit presente</span>')
    expect(html).toContain('class="product__price">sob consulta</p>')
  })

  it('no editor, o produto sem foto aparece com o aviso', () => {
    const html = render(true)
    expect(html).toContain('Sem foto')
    expect(html).toContain('Escolha a foto do produto')
  })
})

describe('Cardápio com preços', () => {
  const groups = [
    {
      name: 'Ovos de colher',
      image: null,
      items: [
        { name: 'Brigadeiro', description: '500 g', price: 'R$ 89' },
        { name: '', description: '', price: 'R$ 0' },
      ],
    },
    {
      name: 'Natal',
      image: { mediaId: 1 },
      items: [{ name: 'Panetone', description: '', price: 'R$ 75' }],
    },
  ]

  it('nome, ligação e preço em cada linha; item sem nome some no site', () => {
    const html = renderToStaticMarkup(
      <PriceList
        columns="two"
        groups={groups}
        id="c"
        leader="line"
        menuLabel=""
        metadata={metadata()}
        style="light"
        text=""
        title="Preços"
      />,
    )
    expect(html).toContain('prices prices--line')
    expect(html.match(/class="price-item /g)).toHaveLength(2)
    expect(html).toContain('<span aria-hidden="true" class="price-item__leader"></span>')
    expect(html).toContain('class="price-item__description">500 g</span>')
    expect(html).toContain('price-group price-group--photo')
  })
})

describe('Faixa de aviso', () => {
  const items = [{ text: 'Encomendas de Natal abertas' }, { text: 'Kits presente' }]

  it('correndo: o aviso inteiro no aria-label, a trilha escondida e o botão de parar', () => {
    const html = renderToStaticMarkup(
      <Announcement id="a" items={items} metadata={metadata()} mode="move" style="brand" />,
    )
    expect(html).toContain('announce announce--brand announce--move')
    expect(html).toContain('aria-label="Aviso: Encomendas de Natal abertas. Kits presente"')
    expect(html).toContain('role="note"')
    expect(html).toContain('<div aria-hidden="true" class="announce__track" style="--duration:')
    expect(html.match(/class="announce__half"/g)).toHaveLength(2)
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('Parar a faixa de aviso')
  })

  it('parada, ou no editor: as frases no centro, sem trilha', () => {
    const still = renderToStaticMarkup(
      <Announcement id="a" items={items} metadata={metadata()} mode="static" style="soft" />,
    )
    expect(still).toContain('announce--static')
    expect(still).not.toContain('announce__track')
    expect(still).not.toContain('aria-hidden="true" class="announce__still"')
    const editor = renderToStaticMarkup(
      <Announcement id="a" items={items} metadata={metadata(true)} mode="move" style="brand" />,
    )
    expect(editor).not.toContain('announce__track')
  })

  it('repete as frases até encher a tela, e nada quando estão vazias', () => {
    expect(announcementRun(['Oi'])).toHaveLength(10)
    // Um aviso de ~120 letras se repete: uma metade só dele não cobriria uma tela de 1440 px.
    expect(announcementRun(['a'.repeat(116)]).length).toBeGreaterThanOrEqual(2)
    expect(announcementRun(['a'.repeat(260)])).toHaveLength(1)
    expect(announcementRun(['  '])).toEqual([])
    expect(
      renderToStaticMarkup(
        <Announcement
          id="a"
          items={[{ text: ' ' }]}
          metadata={metadata()}
          mode="move"
          style="brand"
        />,
      ),
    ).toBe('')
  })
})

describe('Instagram', () => {
  const images = [1, 2, 3, 4].map((mediaId) => ({ mediaId }))

  it('o @ e o botão vêm das Configurações', () => {
    const html = renderToStaticMarkup(
      <InstagramStrip
        id="i"
        images={images}
        menuLabel=""
        metadata={metadata(false, { instagram: '@mrs.kluana' })}
        style="light"
        title="No Instagram"
      />,
    )
    expect(html).toContain('href="https://instagram.com/mrs.kluana"')
    expect(html).toContain('Seguir no Instagram')
    expect(html).toContain('class="section-lead">@mrs.kluana</p>')
    expect(html.match(/<img/g)).toHaveLength(4)
  })

  it('sem o @: as fotos sem o botão no site; no editor, o aviso', () => {
    const site = renderToStaticMarkup(
      <InstagramStrip
        id="i"
        images={images}
        menuLabel=""
        metadata={metadata()}
        style="light"
        title=""
      />,
    )
    expect(site).not.toContain('Seguir no Instagram')
    expect(site).toContain('class="insta"')
    const editor = renderToStaticMarkup(
      <InstagramStrip
        id="i"
        images={images.slice(0, 2)}
        menuLabel=""
        metadata={metadata(true)}
        style="light"
        title=""
      />,
    )
    expect(editor).toContain('Configurações do site')
    expect(editor).toContain('Escolha mais 2 foto(s)')
  })
})

describe('ajustes nas seções que já existem', () => {
  it('Texto com foto sem foto: no site, o texto no centro; no editor, o aviso', () => {
    const props = {
      id: 't',
      image: null,
      menuLabel: '',
      side: 'right' as const,
      style: 'light' as const,
      text: 'Começamos em 2019.',
      title: 'Nossa história',
    }
    const site = renderToStaticMarkup(<TextImage {...props} metadata={metadata()} />)
    expect(site).toContain('text-image--solo')
    expect(site).not.toContain('text-image__photo')
    const editor = renderToStaticMarkup(<TextImage {...props} metadata={metadata(true)} />)
    expect(editor).not.toContain('text-image--solo')
    expect(editor).toContain('Escolha uma foto')
  })

  it('Galeria: legenda escrita ou a descrição da foto, e o mosaico', () => {
    const html = renderToStaticMarkup(
      <Gallery
        id="g"
        images={[
          { mediaId: 1, caption: '' },
          { mediaId: 2, caption: 'Mesa de doces' },
        ]}
        layout="masonry"
        menuLabel=""
        metadata={metadata()}
        showCaptions
        style="light"
        title=""
      />,
    )
    expect(html).toContain('gallery gallery--masonry gallery--captions')
    expect(html).toContain('class="gallery__caption">Bolo de pote de morango</figcaption>')
    expect(html).toContain('class="gallery__caption">Mesa de doces</figcaption>')
    expect(html).toContain('em tela cheia: Mesa de doces')
  })

  it('Destaques com o marcador "Foto": foto redonda no lugar do ícone', () => {
    const html = renderToStaticMarkup(
      <Features
        id="f"
        items={[
          { title: 'Bolos', text: '', icon: 'cake', photo: { mediaId: 1 } },
          { title: 'Entrega', text: '', icon: 'truck', photo: null },
        ]}
        marker="photo"
        menuLabel=""
        metadata={metadata()}
        style="light"
        title=""
      />,
    )
    expect(html.match(/class="features__photo"/g)).toHaveLength(1)
    expect(html).toContain('alt=""')
    expect(html).not.toContain('features__icon')
  })
})

describe('resumo, fotos pequenas e checagens do Publicar', () => {
  const content = page([
    {
      type: 'Products',
      props: {
        id: 'p',
        menuLabel: '',
        title: 'Vitrine',
        items: [{ name: 'Bolo', image: { mediaId: 1 } }, { name: 'Torta' }],
      },
    },
    {
      type: 'InstagramStrip',
      props: { id: 'i', menuLabel: '', title: '', images: [{ mediaId: 2 }, { mediaId: 3 }] },
    },
    {
      type: 'Features',
      props: {
        id: 'f',
        menuLabel: '',
        title: '',
        marker: 'photo',
        items: [{ title: 'A', text: '', photo: { mediaId: 4 } }],
        style: 'light',
      },
    },
    { type: 'Announcement', props: { id: 'a', items: [{ text: 'Natal' }, { text: 'Páscoa' }] } },
  ]).data!.data

  it('a aba Ordem resume as seções novas', () => {
    const [products, insta, , announce] = content.content as PageComponent[]
    expect(sectionSummary(products)).toBe('Bolo, Torta')
    expect(sectionSummary(insta)).toBe('2 fotos')
    expect(sectionSummary(announce)).toBe('Natal, Páscoa')
  })

  it('as fotinhas dos Destaques e do Instagram não pedem 700 px', () => {
    const needs = photoNeeds(content)
    expect(needs.get(1)).toBe(700)
    expect(needs.has(2)).toBe(false)
    expect(needs.has(4)).toBe(false)
  })

  it('avisa produto sem foto, Instagram com menos de 4 fotos e sem o @', () => {
    const checks = sectionChecks(content, { hasPhoto: () => true, instagram: '' })
    expect(checks.map((check) => check.title)).toEqual([
      'Um produto está sem foto',
      'A seção Instagram tem menos de 4 fotos',
      'Falta o Instagram nas Configurações',
    ])
    // Foto apagada da biblioteca conta como sem foto.
    const deleted = sectionChecks(content, { hasPhoto: (id) => id !== 1, instagram: '@kluana' })
    expect(deleted[0].title).toBe('2 produtos estão sem foto')
    expect(deleted).toHaveLength(2)
  })

  it('avisa produto sem nome, preço R$ 0,00 e nome de exemplo', () => {
    const data = page([
      {
        type: 'Products',
        props: {
          id: 'p',
          menuLabel: '',
          title: '',
          items: [
            { name: ' ', image: { mediaId: 1 } },
            { name: 'Nome do produto', image: { mediaId: 2 }, price: 'R$ 0,00' },
          ],
        },
      },
      {
        type: 'PriceList',
        props: {
          id: 'c',
          menuLabel: '',
          title: '',
          groups: [{ name: 'Natal', items: [{ name: 'Panetone', price: 'R$0,00' }] }],
        },
      },
    ]).data!.data
    expect(sectionChecks(data, { hasPhoto: () => true }).map((check) => check.title)).toEqual([
      'Um produto está sem nome',
      '2 preços ainda estão como R$ 0,00',
      'Um item ainda tem nome de exemplo',
    ])
  })
})
