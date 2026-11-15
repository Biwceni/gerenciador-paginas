import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({ toast: {} }))

import type { EditorContextValue } from '@/components/editor/context'
import { headingWarning } from '@/components/editor/HeadingOutline'
import {
  featureProblem,
  linkProblem,
  productProblem,
  snippet,
} from '@/components/editor/ItemSummary'
import { themeStyle } from '@/components/site/theme'
import { blendColors, contrastRatio, minReadableOpacity, readableTextColor } from '@/lib/colors'
import { canRotate, nextIndex, ROTATE_MS } from '@/puck/components/AutoRotate'
import { GALLERY_FOLD, GALLERY_FOLD_MOBILE } from '@/puck/components/GalleryGrid'
import { sectionChecks } from '@/puck/checks'
import { editorConfig } from '@/puck/editor-config'
import { hiddenSections } from '@/puck/hiddenSections'
import type { PuckPageData } from '@/puck/schema'

// Pacote de componentes (avaliação de 2026-11-14), entrega 2: a base que as seções usam.

const css = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')

/** Todas as cores de 17 em 17 em cada canal: 4.913 cores, do preto ao branco. */
function sampleColors(): string[] {
  const steps = Array.from({ length: 17 }, (_, i) => Math.min(255, i * 16))
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return steps.flatMap((r) =>
    steps.flatMap((g) => steps.map((b) => `#${hex(r)}${hex(g)}${hex(b)}`)),
  )
}

describe('A3: contraste automático', () => {
  it('a letra sobre a cor do site lê com 4,5:1 ou mais em qualquer cor', () => {
    const worst = sampleColors()
      .map((color) => ({ color, ratio: contrastRatio(readableTextColor(color), color) }))
      .sort((a, b) => a.ratio - b.ratio)[0]
    expect(worst.ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('nas cores do meio, usa o preto puro (o quase preto não chegava a 4,5:1)', () => {
    // Cinza médio (e verdes médios como #3c8a5a): #111 dá 4,4:1 e o branco 4,3:1.
    for (const color of ['#7a7a7a', '#3c8a5a']) {
      expect(contrastRatio('#111111', color)).toBeLessThan(4.5)
      expect(contrastRatio('#ffffff', color)).toBeLessThan(4.5)
      expect(readableTextColor(color)).toBe('#000000')
    }
    // Cores fáceis continuam como antes.
    expect(readableTextColor('#ffffff')).toBe('#111111')
    expect(readableTextColor('#1d4ed8')).toBe('#ffffff')
  })

  it('o piso de opacidade garante 4,5:1 no texto suave', () => {
    for (const [text, background] of [
      ['#111111', '#d94a63'],
      ['#ffffff', '#3b6e2a'],
      ['#1f2933', '#f3f4f6'],
      ['#000000', '#7a7a7a'],
    ]) {
      const floor = minReadableOpacity(text, background)
      expect(
        contrastRatio(blendColors(text, background, floor), background),
      ).toBeGreaterThanOrEqual(4.5)
    }
    // Preto no branco aguenta bem mais transparência que um rosa médio.
    expect(minReadableOpacity('#000000', '#ffffff')).toBeLessThan(
      minReadableOpacity('#111111', '#d94a63'),
    )
  })

  it('o tema manda o piso de cada fundo e os textos suaves usam o maior dos dois', () => {
    const theme = themeStyle({
      colors: {
        primary: '#d94a63',
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#111111',
        footer: '#111111',
      },
    }) as Record<string, string>
    for (const name of ['light', 'soft', 'brand', 'footer', 'deep']) {
      expect(Number(theme[`--soft-min-${name}`])).toBeGreaterThan(0)
    }
    // Rótulos do Contato e legendas: piso no lugar da opacidade fixa (achado Contact-1).
    expect(css).toMatch(/\.contact__label \{[^}]*opacity: max\(0\.75, var\(--soft-min, 0\)\)/)
    expect(css).toMatch(/\.section--brand \{[^}]*--soft-min: var\(--soft-min-brand, 0\)/)
    // Links do Texto simples na cor principal que lê no fundo e no Suave (achado RichText-2).
    expect(css).toMatch(/\.rich-text a \{[^}]*color: var\(--color-accent-text/)
  })
})

describe('A5: resumo dos itens da lista', () => {
  const editor = {
    pageId: 1,
    whatsappHref: 'https://wa.me/5511987654321',
    pages: [
      { id: 1, title: 'Início', slug: '', published: true, sections: [] },
      { id: 2, title: 'Cardápio', slug: 'cardapio', published: true, sections: [] },
      { id: 3, title: 'Páscoa', slug: 'pascoa', published: false, sections: [] },
    ],
  } as unknown as EditorContextValue

  it('o começo do texto, curto e sem quebras', () => {
    expect(snippet('Atendimento   excelente do começo ao fim. Recomendo para todo mundo.')).toBe(
      'Atendimento excelente do começo…',
    )
    expect(snippet('Curto')).toBe('Curto')
    expect(snippet(undefined)).toBe('')
  })

  it('link sem destino, página em rascunho ou apagada não aparece no site', () => {
    expect(linkProblem({ link: null }, editor)).toBe('Não aparece no site: sem destino')
    expect(linkProblem({ link: { kind: 'page', pageId: 3 } }, editor)).toBe(
      'Não aparece no site: a página está em rascunho',
    )
    expect(linkProblem({ link: { kind: 'section', pageId: 9, sectionId: 'x' } }, editor)).toBe(
      'Não aparece no site: a página foi apagada',
    )
    expect(linkProblem({ link: { kind: 'page', pageId: 2 } }, editor)).toBeNull()
    expect(linkProblem({ link: { kind: 'url', url: 'https://x.com' } }, editor)).toBeNull()
    // A própria página, mesmo em rascunho, vai ao ar junto ao publicar.
    expect(linkProblem({ link: { kind: 'page', pageId: 1 } }, editor)).toBeNull()
  })

  it('WhatsApp sem número nas Configurações também some', () => {
    expect(linkProblem({ link: { kind: 'whatsapp' } }, { ...editor, whatsappHref: null })).toMatch(
      /WhatsApp/,
    )
    expect(linkProblem({ link: { kind: 'whatsapp' } }, editor)).toBeNull()
  })

  it('produto sem foto avisa no item', () => {
    expect(productProblem({ image: null })).toBe('Não aparece no site: sem foto')
    expect(productProblem({ image: { mediaId: 4 } })).toBeNull()
  })
})

describe('A6: preencher sozinho', () => {
  it('item novo do Cardápio nasce com o preço vazio, como na Vitrine (PriceList-3)', () => {
    const groups = (
      editorConfig.components.PriceList.fields as Record<
        string,
        {
          defaultItemProps?: { items: { price: string }[] }
          arrayFields?: Record<string, { defaultItemProps?: { price: string } }>
        }
      >
    ).groups
    expect(groups.defaultItemProps?.items[0].price).toBe('')
    expect(groups.arrayFields?.items.defaultItemProps?.price).toBe('')
  })
})

describe('A7: listas no celular e troca automática', () => {
  const calm = {
    visible: true,
    reducedMotion: false,
    paused: false,
    interacting: false,
    otherMotion: false,
    scrollable: true,
  }

  it('troca só com a lista na tela, sem ninguém mexendo e sem outra coisa correndo', () => {
    expect(canRotate(calm)).toBe(true)
    expect(canRotate({ ...calm, visible: false })).toBe(false)
    expect(canRotate({ ...calm, reducedMotion: true })).toBe(false)
    expect(canRotate({ ...calm, paused: true })).toBe(false)
    expect(canRotate({ ...calm, interacting: true })).toBe(false)
    // Faixa de aviso Correndo à vista: os depoimentos esperam.
    expect(canRotate({ ...calm, otherMotion: true })).toBe(false)
    // No computador a lista cabe inteira: nada troca.
    expect(canRotate({ ...calm, scrollable: false })).toBe(false)
  })

  it('a cada 6 segundos, o próximo; depois do último, volta ao primeiro', () => {
    expect(ROTATE_MS).toBe(6000)
    expect(nextIndex(0, 3)).toBe(1)
    expect(nextIndex(2, 3)).toBe(0)
    expect(nextIndex(0, 0)).toBe(0)
  })

  it('no celular: Destaques e Vitrine 2 por linha, depoimentos em faixa, galeria dobrada', () => {
    expect(css).toMatch(
      /\.site \.features,\s*\.site \.features--two \{\s*grid-template-columns: repeat\(2/,
    )
    expect(css).toMatch(/\.site \.products--three \{\s*--n: 2;/)
    expect(css).toMatch(/\.site \.auto-rotate \.testimonials \{[^}]*scroll-snap-type: x mandatory/)
    expect(css).toMatch(/\.gallery\[data-folded\] > li:nth-child\(n \+ 11\)/)
    expect(css).toMatch(/\.gallery\[data-folded\] > li:nth-child\(n \+ 13\)/)
    expect([GALLERY_FOLD, GALLERY_FOLD_MOBILE]).toEqual([12, 10])
  })
})

describe('B1: avisos do Publicar', () => {
  const hasPhoto = (id: number) => id !== 99
  const page = (content: unknown[]) => ({ root: { props: {} }, content }) as unknown as PuckPageData

  it('Chamada para ação toda vazia entra nas seções que não vão aparecer (CallToAction-1)', () => {
    const cta = (props: Record<string, unknown>) => ({
      type: 'CallToAction',
      props: { id: 'c1', title: '', text: '', button: { label: '', link: null }, ...props },
    })
    expect(hiddenSections(page([cta({})]), hasPhoto)).toEqual([
      { id: 'c1', type: 'CallToAction', reason: 'está sem título, frase e botão' },
    ])
    expect(hiddenSections(page([cta({ title: 'Vamos conversar?' })]), hasPhoto)).toEqual([])
    expect(
      hiddenSections(
        page([cta({ button: { label: 'Chamar', link: { kind: 'whatsapp' } } })]),
        hasPhoto,
      ),
    ).toEqual([])
    // Botão com nome e sem destino não aparece no site: continua vazia.
    expect(
      hiddenSections(page([cta({ button: { label: 'Chamar', link: null } })]), hasPhoto),
    ).toHaveLength(1)
  })

  it('uma coluna vazia avisa; todas vazias já são seção escondida (Columns-4)', () => {
    const text = { type: 'ColumnText', props: { id: 't', title: 'Entrega', text: '' } }
    const columns = (column1: unknown[], column2: unknown[]) => ({
      type: 'Columns',
      props: { id: 'k', layout: 'half', style: 'light', column1, column2, column3: [] },
    })
    const titles = (data: PuckPageData) => sectionChecks(data, { hasPhoto }).map((c) => c.title)
    expect(titles(page([columns([], [text])]))).toContain('Uma coluna está vazia')
    expect(titles(page([columns([text], [text])]))).not.toContain('Uma coluna está vazia')
    expect(titles(page([columns([], [])]))).not.toContain('Uma coluna está vazia')
    // A terceira coluna não conta no modelo de duas.
    expect(titles(page([columns([text], [text])]))).toEqual([])
  })

  it('Destaques com marcador Foto e item sem foto avisam (Features-2)', () => {
    const features = (marker: string, photo: unknown) => ({
      type: 'Features',
      props: {
        id: 'f',
        title: '',
        marker,
        style: 'light',
        items: [
          { title: 'Entrega', text: '', icon: 'check', photo },
          { title: 'Retirada', text: '', icon: 'check', photo: { mediaId: 1 } },
        ],
      },
    })
    const titles = (data: PuckPageData) => sectionChecks(data, { hasPhoto }).map((c) => c.title)
    expect(titles(page([features('photo', null)]))).toContain('Um destaque está sem foto')
    expect(titles(page([features('photo', { mediaId: 99 })]))).toContain(
      'Um destaque está sem foto',
    )
    expect(titles(page([features('icon', null)]))).not.toContain('Um destaque está sem foto')
    expect(titles(page([features('photo', { mediaId: 2 })]))).not.toContain(
      'Um destaque está sem foto',
    )
  })

  it('o item do painel avisa quando o marcador é Foto e falta a foto', () => {
    const editor = { photoById: { 1: {} } } as unknown as EditorContextValue
    expect(featureProblem({ photo: null }, editor, { marker: 'photo' })).toMatch(/Sem foto/)
    expect(featureProblem({ photo: { mediaId: 1 } }, editor, { marker: 'photo' })).toBeNull()
    expect(featureProblem({ photo: null }, editor, { marker: 'icon' })).toBeNull()
  })
})

describe('B2: título da página', () => {
  it('avisa quando falta o título principal ou quando há mais de um', () => {
    expect(headingWarning([{ level: 1 }, { level: 2 }], false)).toBeNull()
    expect(headingWarning([{ level: 2 }], false)).toMatch(/Falta o título principal/)
    expect(headingWarning([{ level: 1 }, { level: 1 }], false)).toMatch(/mais de um/)
    // Na página inicial sem Banner, o título existe, mas escondido.
    expect(headingWarning([{ level: 2 }], true)).toMatch(/escondido/)
  })
})
