import { describe, expect, it } from 'vitest'

import { columnTargets, pieceIndex } from '@/components/editor/columnTargets'
import { hiddenColumnNotice } from '@/components/editor/zoneLimits'

// Entrega 2 (achados 8.1 e 8.5): a pergunta "em qual coluna?" no celular e o aviso ao trocar
// "Três iguais" por um modelo de duas colunas.

const piece = (id: string) => ({ type: 'ColumnText', props: { id, title: id, text: '' } })
const columns = (id: string, layout: string, counts: [number, number, number]) => ({
  type: 'Columns',
  props: {
    id,
    layout,
    column1: Array.from({ length: counts[0] }, (_, n) => piece(`${id}-a${n}`)),
    column2: Array.from({ length: counts[1] }, (_, n) => piece(`${id}-b${n}`)),
    column3: Array.from({ length: counts[2] }, (_, n) => piece(`${id}-c${n}`)),
  },
})
const hero = { type: 'Hero', props: { id: 'Hero-1' } }

describe('columnTargets', () => {
  it('lista só as colunas que o modelo mostra, e marca as cheias', () => {
    const { sections, preferred } = columnTargets(
      [hero, columns('Columns-1', 'half', [6, 1, 2]), columns('Columns-2', 'thirds', [0, 0, 0])],
      null,
    )
    expect(sections).toHaveLength(2)
    expect(sections[0].columns.map((slot) => [slot.n, slot.count, slot.full])).toEqual([
      [1, 6, true],
      [2, 1, false],
    ])
    expect(sections[1].columns).toHaveLength(3)
    expect(sections[1].columns[2].zone).toBe('Columns-2:column3')
    expect(preferred).toBe('Columns-1')
  })

  it('vem marcada a seção escolhida, ou a que tem a peça escolhida', () => {
    const content = [
      hero,
      columns('Columns-1', 'half', [1, 1, 0]),
      columns('Columns-2', 'half', [1, 0, 0]),
    ]
    expect(columnTargets(content, { index: 2, zone: 'root:default-zone' }).preferred).toBe(
      'Columns-2',
    )
    expect(columnTargets(content, { index: 0, zone: 'Columns-2:column1' }).preferred).toBe(
      'Columns-2',
    )
    expect(columnTargets(content, { index: 0, zone: 'root:default-zone' }).preferred).toBe(
      'Columns-1',
    )
  })

  it('sem Colunas na página, não há onde pôr a peça', () => {
    expect(columnTargets([hero], null)).toEqual({ sections: [], preferred: null })
  })
})

describe('pieceIndex', () => {
  const slot = { n: 2 as const, zone: 'Columns-1:column2', count: 3, full: false }
  it('entra logo abaixo da peça escolhida na mesma coluna', () => {
    expect(pieceIndex(slot, { index: 0, zone: 'Columns-1:column2' })).toBe(1)
  })
  it('senão, entra no fim da coluna', () => {
    expect(pieceIndex(slot, { index: 0, zone: 'Columns-1:column1' })).toBe(3)
    expect(pieceIndex(slot, null)).toBe(3)
  })
})

describe('hiddenColumnNotice', () => {
  const data = (layout: string, third: number) => ({
    root: { props: {} },
    content: [columns('Columns-1', layout, [1, 1, third])],
  })
  it('avisa quando a terceira coluna tinha peças', () => {
    expect(hiddenColumnNotice(data('half', 1) as never, data('thirds', 1) as never)).toMatch(
      /^A peça da Coluna 3 fica guardada, sem aparecer na página\. Ela volta/,
    )
    expect(hiddenColumnNotice(data('wide-left', 2) as never, data('thirds', 2) as never)).toMatch(
      /^As 2 peças da Coluna 3 ficam guardadas.*Elas voltam/,
    )
  })
  it('não avisa sem peças na terceira coluna, nem sem troca de modelo', () => {
    expect(hiddenColumnNotice(data('half', 0) as never, data('thirds', 0) as never)).toBeNull()
    expect(hiddenColumnNotice(data('half', 1) as never, data('half', 1) as never)).toBeNull()
  })
})
