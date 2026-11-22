import { readFileSync } from 'node:fs'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  categorySlug,
  matchesSearch,
  parsePrice,
  productCategories,
  PRODUCTS_SEARCH_FROM,
  sortedOrder,
} from '@/lib/products'
import type { Media } from '@/payload-types'
import { sectionChecks } from '@/puck/checks'
import { findIcons, ICON_INFO, ICON_THEMES } from '@/puck/components/FeatureIcon'
import { featureColumns, Features, Products } from '@/puck/components/sections'
import { hiddenSections } from '@/puck/hiddenSections'
import type { ContentMetadata } from '@/puck/references'
import {
  CONTENT_VERSION,
  FEATURE_ICONS,
  type FeaturesProps,
  parsePageContent,
  type ProductsProps,
} from '@/puck/schema'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 3b: C3 (destaques mais flexíveis),
// B2 (cartão que serve a qualquer coisa) e B3 (categorias, filtro, busca e ordem).

const siteCss = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')
const iconSource = readFileSync(path.resolve('src/puck/components/FeatureIcon.tsx'), 'utf8')

const photo = (id: number) =>
  ({ id, url: `/f${id}.jpg`, width: 1600, height: 1200, alt: `Foto ${id}` }) as unknown as Media

const metadata: ContentMetadata = {
  photos: { 1: photo(1), 2: photo(2), 3: photo(3) },
  forms: {},
  pageHrefs: {},
  pageAnchors: {},
  anchors: {},
  whatsappHref: 'https://wa.me/5531999990000',
  site: { name: 'Loja', logo: null, contact: {} },
  mainHeadingId: 'h',
}

const parse = (content: unknown[]) =>
  parsePageContent({ version: CONTENT_VERSION, data: { root: { props: {} }, content } })

const render = (node: React.ReactElement) => renderToStaticMarkup(node)
const url = (address: string) => ({ kind: 'url' as const, url: address })

const feature = (title: string, extra: Record<string, unknown> = {}) => ({
  title,
  text: 'Frase',
  icon: 'check',
  photo: null,
  ...extra,
})

const features = (items: unknown[], marker = 'icon') => {
  const parsed = parse([
    {
      type: 'Features',
      props: { id: 'f', style: 'light', menuLabel: '', title: 'T', marker, items },
    },
  ])
  expect(parsed.success).toBe(true)
  return parsed.data!.data.content[0].props as FeaturesProps
}

const product = (name: string, extra: Record<string, unknown> = {}) => ({
  image: { mediaId: 1 },
  name,
  text: '',
  price: 'R$ 10',
  button: { label: 'Pedir', link: { kind: 'whatsapp' } },
  ...extra,
})

const products = (items: unknown[], extra: Record<string, unknown> = {}) => {
  const parsed = parse([
    { type: 'Products', props: { id: 'p', menuLabel: '', title: 'V', items, ...extra } },
  ])
  expect(parsed.success).toBe(true)
  return parsed.data!.data.content[0].props as ProductsProps
}

describe('C3: destaques mais flexíveis', () => {
  it('aceita até 12 destaques, e não 13', () => {
    expect(features(Array.from({ length: 12 }, (_, i) => feature(`D${i}`))).items).toHaveLength(12)
    const parsed = parse([
      {
        type: 'Features',
        props: {
          id: 'f',
          style: 'light',
          menuLabel: '',
          title: '',
          items: Array.from({ length: 13 }, (_, i) => feature(`D${i}`)),
        },
      },
    ])
    expect(parsed.success).toBe(false)
  })

  it('destaques salvos antes continuam válidos e iguais (sem link)', () => {
    const props = features([feature('A'), feature('B')])
    expect(props.items[0].button).toBeUndefined()
    const html = render(<Features {...props} metadata={metadata} />)
    expect(html).not.toContain('features__link')
    expect(html).toContain('features--two')
  })

  it('colunas pela quantidade: 2 e 4 em duas, 8 e 12 em quatro, o resto em três', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(featureColumns)).toEqual([
      3, 2, 3, 2, 3, 3, 3, 4, 3, 3, 3, 4,
    ])
  })

  it('link do item: "Saiba mais →" quando o texto está vazio, com o título para o leitor de tela', () => {
    const props = features([
      feature('Entrega', { button: { label: '', link: url('https://example.com/a') } }),
      feature('Loja', { button: { label: 'Ver lojas', link: url('https://example.com/b') } }),
      feature('Sem destino', { button: { label: 'Ver', link: null } }),
    ])
    const html = render(<Features {...props} metadata={metadata} />)
    expect(html).toContain('Saiba mais<span aria-hidden="true"> →</span>')
    expect(html).toContain('<span class="visually-hidden">: Entrega</span>')
    expect(html).toContain('Ver lojas')
    // Sem destino no ar: sem link (nada de link quebrado).
    expect(html.match(/features__item--linked/g)).toHaveLength(2)
  })

  it('"Foto grande": a foto ocupa o item; sem foto fica a cor escura do site', () => {
    const props = features(
      [feature('Com foto', { photo: { mediaId: 1 } }), feature('Sem foto')],
      'cover',
    )
    const html = render(<Features {...props} metadata={metadata} />)
    expect(html).toContain('features--cover')
    expect(html).toContain('features__cover--empty')
    expect(html.match(/class="features__cover/g)).toHaveLength(2)
    // Sombra de até 80% e título branco com sombra de texto.
    expect(siteCss).toContain('rgb(0 0 0 / 0.8) 0%')
    expect(siteCss).toMatch(/\.features--cover h3,[\s\S]*?color: #fff;\s*text-shadow/)
  })

  it('"Foto grande" só com foto (sem texto) ainda aparece no site e não conta como seção vazia', () => {
    const props = features([feature('', { text: '', photo: { mediaId: 1 } })], 'cover')
    expect(render(<Features {...props} metadata={metadata} />)).toContain('features__item')
    const parsed = parse([
      {
        type: 'Features',
        props: {
          id: 'f',
          style: 'light',
          menuLabel: '',
          title: '',
          marker: 'cover',
          items: props.items,
        },
      },
    ])
    expect(hiddenSections(parsed.data!.data, (id) => id === 1)).toEqual([])
  })

  it('o Publicar avisa do destaque sem foto também na "Foto grande"', () => {
    const parsed = parse([
      {
        type: 'Features',
        props: {
          id: 'f',
          style: 'light',
          menuLabel: '',
          title: '',
          marker: 'cover',
          items: [feature('A')],
        },
      },
    ])
    expect(
      sectionChecks(parsed.data!.data, { hasPhoto: () => false }).map((c) => c.title),
    ).toContain('Um destaque está sem foto')
  })
})

describe('C3: biblioteca de ícones', () => {
  it('tem cerca de 80 ícones, todos com desenho, nome, tema e traço de 1,8 px', () => {
    expect(FEATURE_ICONS.length).toBeGreaterThanOrEqual(78)
    for (const icon of FEATURE_ICONS) {
      expect(ICON_INFO[icon].label).toBeTruthy()
      expect(ICON_INFO[icon].themes.length).toBeGreaterThan(0)
      expect(iconSource).toMatch(new RegExp(`\\n  ${icon}: `))
    }
    expect(iconSource).not.toMatch(/strokeWidth="1\.[67]"/)
    expect(iconSource.match(/strokeWidth="1\.8"/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('os ícones de antes continuam valendo (páginas salvas não mudam)', () => {
    for (const old of ['tooth', 'check', 'cake', 'truck', 'scissors']) {
      expect(FEATURE_ICONS).toContain(old)
    }
  })

  it('busca por palavra sem acento e por tema', () => {
    expect(findIcons('vacina')).toEqual(['syringe'])
    expect(findIcons('saude')).toContain('stethoscope')
    expect(findIcons('', 'comida')).toContain('pizza')
    expect(findIcons('', 'comida')).not.toContain('car')
    expect(findIcons('carro', 'comida')).toEqual([])
    // Todo tema tem ícones.
    for (const [theme] of ICON_THEMES) expect(findIcons('', theme).length).toBeGreaterThan(2)
  })
})

describe('B2: cartão da Vitrine', () => {
  it('itens salvos antes continuam iguais: sem selo, sem preço antigo, sem "Mais detalhes"', () => {
    const props = products([product('Bolo')])
    const html = render(<Products {...props} metadata={metadata} />)
    expect(html).toContain('<p class="product__price">R$ 10</p>')
    expect(html).not.toMatch(/product__badge|product__old|product__more|products-tools/)
  })

  it('preço antigo riscado e o novo na segunda cor; o leitor de tela ouve "De ... por ..."', () => {
    const props = products([product('Protetor', { price: 'R$ 55,90', oldPrice: 'R$ 79,90' })])
    const html = render(<Products {...props} metadata={metadata} />)
    expect(html).toContain('product__price--sale')
    expect(html).toContain(
      '<s class="product__old"><span class="visually-hidden">De </span>R$ 79,90</s>',
    )
    expect(html).toContain('<span class="visually-hidden"> por </span>')
    expect(siteCss).toMatch(
      /\.product__price--sale \.product__now \{\s*color: var\(--color-second-text/,
    )
  })

  it('selo em cima da foto ou embaixo dela, na segunda cor', () => {
    const top = render(
      <Products {...products([product('A', { badge: '-30%' })])} metadata={metadata} />,
    )
    expect(top).toMatch(/product__photo">.*<span class="product__badge">-30%<\/span><\/div>/)
    const below = render(
      <Products
        {...products([product('A', { badge: 'Novo' })], { badgeBelow: true })}
        metadata={metadata}
      />,
    )
    expect(below).toContain(
      '<div class="product__body"><span class="product__badge product__badge--below">Novo</span>',
    )
    expect(siteCss).toMatch(/\.product__badge \{[\s\S]*?background: var\(--color-second/)
  })

  it('selo de até 24 letras; mais que isso é recusado', () => {
    expect(products([product('A', { badge: 'x'.repeat(24) })]).items[0].badge).toHaveLength(24)
    const parsed = parse([
      {
        type: 'Products',
        props: {
          id: 'p',
          menuLabel: '',
          title: '',
          items: [product('A', { badge: 'x'.repeat(25) })],
        },
      },
    ])
    expect(parsed.success).toBe(false)
  })

  it('esgotado tira o botão de pedir e diz "Esgotado"; sob consulta troca o preço', () => {
    const html = render(
      <Products
        {...products([
          product('Esgotado', { status: 'soldout' }),
          product('Consulta', { status: 'consult', price: 'R$ 100' }),
        ])}
        metadata={metadata}
      />,
    )
    expect(html).toContain('<p class="product__status">Esgotado</p>')
    expect(html.match(/<a [^>]*class="product__link/g)).toHaveLength(1)
    expect(html).toContain('product__price--consult">Sob consulta</p>')
    expect(html).not.toContain('R$ 100')
  })

  it('situação desconhecida vira "disponível" em vez de quebrar a página', () => {
    expect(products([product('A', { status: 'xyz' })]).items[0].status).toBeUndefined()
  })

  it('"Mais detalhes" só com texto ou fotos a mais, e com o nome do item no botão', () => {
    const html = render(
      <Products
        {...products([
          product('Com texto', { details: 'Linha 1\nLinha 2' }),
          product('Com fotos', { photos: [{ image: { mediaId: 2 } }, { image: { mediaId: 3 } }] }),
          product('Nada'),
        ])}
        metadata={metadata}
      />,
    )
    expect(html.match(/class="product__more"/g)).toHaveLength(2)
    expect(html).toContain('aria-label="Mais detalhes: Com texto"')
    expect(html).toContain('<dialog aria-labelledby=')
    // A segunda: foto principal e as duas a mais, num grupo que rola.
    expect(html).toContain('data-count="3"')
    expect(html).toContain('Linha 1')
  })

  it('até 4 fotos a mais por item', () => {
    const photos = Array.from({ length: 5 }, () => ({ image: { mediaId: 2 } }))
    const parsed = parse([
      {
        type: 'Products',
        props: { id: 'p', menuLabel: '', title: '', items: [product('A', { photos })] },
      },
    ])
    expect(parsed.success).toBe(false)
  })
})

describe('B3: categorias, busca e ordem', () => {
  it('a Vitrine aceita até 60 itens', () => {
    expect(products(Array.from({ length: 60 }, (_, i) => product(`P${i}`))).items).toHaveLength(60)
  })

  it('categorias na ordem em que aparecem, sem repetir por caixa ou acento', () => {
    expect(
      productCategories(['Vitaminas', '', 'Higiene', 'vitaminas ', 'Higiêne', undefined]),
    ).toEqual(['Vitaminas', 'Higiene'])
    expect(categorySlug('Mamãe e bebê')).toBe('mamae-e-bebe')
  })

  it('lê preços escritos à mão', () => {
    expect(parsePrice('R$ 1.200,90')).toBe(1200.9)
    expect(parsePrice('a partir de R$ 45')).toBe(45)
    expect(parsePrice('R$ 6,90')).toBe(6.9)
    expect(parsePrice('sob consulta')).toBeNull()
    expect(parsePrice('')).toBeNull()
  })

  it('ordena por nome, por preço (sem preço no fim) e mais novos primeiro', () => {
    const items = [
      { name: 'Café', price: 20 },
      { name: 'açaí', price: null },
      { name: 'Bolo', price: 5 },
    ]
    expect(sortedOrder(items, 'manual')).toEqual([0, 1, 2])
    expect(sortedOrder(items, 'name')).toEqual([1, 2, 0])
    expect(sortedOrder(items, 'price')).toEqual([2, 0, 1])
    expect(sortedOrder(items, 'newest')).toEqual([2, 1, 0])
  })

  it('busca sem acento, com todas as palavras', () => {
    expect(matchesSearch('Vitamina C 1g Vitamínicos', 'vitaminico')).toBe(true)
    expect(matchesSearch('Protetor solar FPS 50', 'solar 50')).toBe(true)
    expect(matchesSearch('Protetor solar', 'xpto')).toBe(false)
  })

  it('filtros com 2 ou mais categorias; busca e "Ordenar" só a partir de 12 itens', () => {
    expect(PRODUCTS_SEARCH_FROM).toBe(12)
    const few = render(
      <Products
        {...products([product('A', { category: 'X' }), product('B', { category: 'Y' })])}
        metadata={metadata}
      />,
    )
    expect(few).toContain('aria-label="Categorias"')
    expect(few).toContain('aria-pressed="true"')
    expect(few).not.toContain('type="search"')
    const one = render(
      <Products {...products([product('A', { category: 'X' })])} metadata={metadata} />,
    )
    expect(one).not.toContain('products-tools')
    const many = render(
      <Products
        {...products(Array.from({ length: 12 }, (_, i) => product(`P${i}`)))}
        metadata={metadata}
      />,
    )
    expect(many).toContain('type="search"')
    expect(many).toContain('Ordenar')
  })

  it('a ordem escolhida na seção já vale no site', () => {
    const html = render(
      <Products
        {...products([product('Caro', { price: 'R$ 90' }), product('Barato', { price: 'R$ 9' })], {
          sort: 'price',
        })}
        metadata={metadata}
      />,
    )
    expect(html.indexOf('Barato')).toBeLessThan(html.indexOf('Caro'))
  })

  it('no celular as categorias ficam numa linha que rola para o lado', () => {
    expect(siteCss).toMatch(/\.products-tools__cats \{\s*flex-wrap: nowrap;/)
  })
})
