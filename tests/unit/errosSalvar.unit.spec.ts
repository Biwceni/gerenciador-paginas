import { describe, expect, it } from 'vitest'

import { describeSaveError } from '@/components/editor/saveErrors'
import { CONTENT_VERSION, parsePageContent, type PuckPageData } from '@/puck/schema'

// Entrega 1 do teste de estresse (11.2 e 13.1): o erro de salvar diz qual campo e em qual seção.

const hero = (title: string) => ({
  type: 'Hero',
  props: {
    id: 'Hero-a1',
    title,
    text: '',
    image: null,
    button: { label: 'Pedir agora', link: null },
    style: 'light',
    align: 'left',
    height: 'compact',
    highlight: '',
    anim: 'site',
  },
})

const piece = (n: number) => ({
  type: 'ColumnText',
  props: { id: `ColumnText-${n}`, title: `Peça ${n}`, text: '' },
})

// Os mesmos nomes do painel, sem carregar o editor inteiro no teste.
const LABELS = {
  Hero: {
    fields: {
      title: { type: 'text', label: 'Título' },
      button: {
        type: 'object',
        label: 'Botão',
        objectFields: { label: { type: 'text', label: 'Texto do botão (vazio: sem botão)' } },
      },
    },
  },
  ColumnText: { fields: { title: { type: 'text', label: 'Título' } } },
} as const

function problem(content: unknown[]) {
  const data = { root: { props: {} }, content } as unknown as PuckPageData
  const parsed = parsePageContent({ version: CONTENT_VERSION, data })
  if (parsed.success) throw new Error('era para falhar')
  return describeSaveError(parsed.error, data, LABELS)
}

describe('erro de salvar com o lugar do problema', () => {
  it('título longo no Banner', () => {
    const result = problem([hero('x'.repeat(121))])
    expect(result.message).toBe(
      '"Título" em Banner principal passou do limite de 120 letras. Encurte para salvar.',
    )
    expect(result.target).toEqual({
      zone: 'root:default-zone',
      index: 0,
      id: 'Hero-a1',
      field: 'title',
    })
  })

  it('texto de botão longo no Banner', () => {
    const section = hero('Bolos')
    section.props.button.label = 'Clique aqui para fazer a sua encomenda'
    expect(problem([section]).message).toMatch(
      /^"Texto do botão" em Banner principal passou do limite de 30 letras/,
    )
  })

  it('sétima peça numa coluna', () => {
    const columns = {
      type: 'Columns',
      props: {
        id: 'Columns-c1',
        menuLabel: '',
        layout: 'half',
        column1: [1, 2, 3, 4, 5, 6, 7].map(piece),
        column2: [],
        column3: [],
        style: 'light',
        anim: 'site',
      },
    }
    const result = problem([hero('Bolos'), columns])
    expect(result.message).toBe('A Coluna 1 das Colunas passou de 6 peças. Tire uma para salvar.')
    expect(result.target?.index).toBe(1)
  })

  it('campo de uma peça dentro da coluna', () => {
    const long = piece(1)
    long.props.title = 'y'.repeat(121)
    const columns = {
      type: 'Columns',
      props: {
        id: 'Columns-c1',
        menuLabel: '',
        layout: 'half',
        column1: [piece(0), long],
        column2: [],
        column3: [],
        style: 'light',
        anim: 'site',
      },
    }
    const result = problem([hero('Bolos'), columns])
    expect(result.message).toBe(
      '"Título" em Título e texto (2ª peça da Coluna 1), em Colunas passou do limite de 120 letras. Encurte para salvar.',
    )
    expect(result.target).toEqual({
      zone: 'Columns-c1:column1',
      index: 1,
      id: 'ColumnText-1',
      field: 'title',
    })
  })
})
