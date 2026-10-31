import { describe, expect, it } from 'vitest'

import { exampleTagline, exampleTexts, findExampleSections, isExamplePhoto } from '@/lib/examples'
import { parsePageContent, type PageComponent, type PuckPageData } from '@/puck/schema'
import { templateSeeds } from '@/seed/templates/data'
import { L_S, pageBuilder } from '@/seed/templates/sections'

const page = (content: PageComponent[]): PuckPageData => ({ root: { props: {} }, content })
const texts = exampleTexts(templateSeeds)

/** Um banner dos modelos com os textos trocados. */
function hero(change: { title?: string; text?: string; label?: string }): PageComponent {
  const section = pageBuilder().hero({ button: 'Fale com a gente' })
  if (section.type !== 'Hero') throw new Error('esperava um banner')
  return {
    ...section,
    props: {
      ...section.props,
      title: change.title ?? 'Café da nossa família',
      text: change.text ?? 'Torrado toda semana.',
      button: { label: change.label ?? 'Fale com a gente', link: { kind: 'whatsapp' } },
    },
  }
}

describe('foto de exemplo', () => {
  it('é a que tem o endereço de origem de um modelo', () => {
    expect(isExamplePhoto({ sourceUrl: 'https://images.pexels.com/photos/1/a.jpeg' })).toBe(true)
    expect(isExamplePhoto({ sourceUrl: null })).toBe(false)
    expect(isExamplePhoto({})).toBe(false)
    expect(isExamplePhoto(null)).toBe(false)
  })
})

describe('textos de exemplo', () => {
  it('juntam os textos dos modelos e deixam de fora botões, menu e títulos bons de manter', () => {
    expect(texts).toContain(L_S.toLowerCase())
    expect(texts).not.toContain('fale com a gente')
    expect(texts).not.toContain('perguntas frequentes')
  })

  it('modelo num formato inválido fica de fora', () => {
    expect(exampleTexts([{ pages: [{ title: 'x', slug: 'x', content: { foo: 1 } }] }])).toEqual([])
  })

  it('acham a seção que ainda tem um texto do modelo', () => {
    const own = hero({})
    const kept = hero({ text: L_S })
    expect(findExampleSections(page([own, kept]), texts)).toEqual([kept])
  })

  it('não ligam para espaços nem para letra maiúscula, que o editor pode mudar', () => {
    const section = hero({ text: `  ${L_S.toUpperCase().replace(' ', '  ')} ` })
    expect(findExampleSections(page([section]), texts)).toEqual([section])
  })

  it('o que a pessoa escreveu e os textos dos botões não contam', () => {
    expect(findExampleSections(page([hero({ label: 'Saiba mais' })]), texts)).toEqual([])
  })

  it('acham texto dentro das colunas', () => {
    const columns: PageComponent = {
      type: 'Columns',
      props: {
        id: 'Columns-1',
        menuLabel: '',
        layout: 'half',
        column1: [{ type: 'ColumnText', props: { id: 'c1', title: '', text: L_S } }],
        column2: [],
        column3: [],
        style: 'light',
      },
    }
    expect(findExampleSections(page([columns]), texts)).toEqual([columns])
  })

  it('numa página inteira de modelo, todas as seções aparecem', () => {
    const parsed = parsePageContent(templateSeeds[0].pages?.[0].content)
    if (!parsed.success) throw new Error('modelo inválido')
    const found = findExampleSections(parsed.data.data, texts)
    expect(found).toHaveLength(parsed.data.data.content.length)
  })
})

describe('frase de exemplo das Configurações', () => {
  const colors = (primary: string) => ({
    primary,
    surface: '#ffffff',
    background: '#ffffff',
    text: '#000000',
    footer: '#000000',
  })
  const models = [
    { site: { tagline: 'Frase do café', colors: colors('#111111') } },
    { site: { tagline: 'Frase da clínica', colors: colors('#333333') } },
  ]

  it('vem do modelo com as mesmas cores do site', () => {
    expect(exampleTagline(colors('#333333'), models)).toBe('Frase da clínica')
  })

  it('com as cores mudadas, usa uma frase geral', () => {
    expect(exampleTagline(colors('#999999'), models)).toBe(
      'Uma frase curta sobre o que você faz e para quem.',
    )
  })
})
