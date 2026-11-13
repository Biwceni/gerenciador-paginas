import { describe, expect, it } from 'vitest'

import { fieldLimit } from '@/puck/fieldLimits'
import { LIMITS, visibleLength } from '@/puck/limits'
import { layoutProblem } from '@/components/editor/zoneLimits'

// Entrega 1 do teste de estresse: o contador do painel lê o limite do mesmo formato que decide se a
// página salva.

describe('limite de cada campo, tirado do formato', () => {
  it.each([
    ['Hero', 'title', 120],
    ['Hero', 'text', 300],
    ['Hero', 'button.label', LIMITS.buttonLabel],
    ['TextImage', 'menuLabel', 40],
    ['Features', 'items[3].title', 80],
    ['Products', 'items[0].price', LIMITS.price],
    ['Products', 'items[0].button.label', LIMITS.buttonLabel],
    ['PriceList', 'groups[1].name', 60],
    ['PriceList', 'groups[1].items[4].price', LIMITS.price],
    ['Announcement', 'items[0].text', LIMITS.announcement],
    ['RichText', 'body', LIMITS.richTextLetters],
    ['ColumnText', 'text', 1000],
    ['Gallery', 'images[2].caption', 120],
  ])('%s %s: %i letras', (type, name, max) => {
    expect(fieldLimit(type, name)).toBe(max)
  })

  it('campo sem limite ou desconhecido não tem contador', () => {
    expect(fieldLimit('Hero', 'style')).toBeNull()
    expect(fieldLimit('Hero', 'naoExiste')).toBeNull()
    expect(fieldLimit(undefined, 'title')).toBeNull()
    expect(fieldLimit('Faq', 'items')).toBeNull()
  })

  it('letras visíveis não contam marcações e contam a entidade como uma', () => {
    expect(visibleLength('<p><strong>Bolo</strong> &amp; café</p>')).toBe(11)
  })
})

describe('mudança que deixaria a página sem salvar', () => {
  const piece = (n: number) => ({ type: 'ColumnText', props: { id: `ColumnText-${n}` } })
  const columns = (count: number) => ({
    type: 'Columns',
    props: {
      id: 'Columns-c1',
      column1: [],
      column2: Array.from({ length: count }, (_, n) => piece(n)),
      column3: [],
    },
  })
  const page = (content: unknown[]) => ({ root: { props: {} }, content }) as never

  it('coluna com 6 peças está certa; com 7, avisa qual coluna', () => {
    expect(layoutProblem(page([columns(6)]))).toBeNull()
    expect(layoutProblem(page([columns(7)]))).toBe(
      'A Coluna 2 já tem 6 peças, o máximo. Tire uma peça ou use outra coluna.',
    )
  })

  it('página com 101 seções', () => {
    const sections = Array.from({ length: 101 }, (_, n) => ({
      type: 'Hero',
      props: { id: `H${n}` },
    }))
    expect(layoutProblem(page(sections.slice(0, 100)))).toBeNull()
    expect(layoutProblem(page(sections))).toMatch(/100 seções, o máximo/)
  })

  it('peça solta fora das Colunas', () => {
    expect(layoutProblem(page([piece(1)]))).toMatch(/só entra dentro de uma seção Colunas/)
  })
})
