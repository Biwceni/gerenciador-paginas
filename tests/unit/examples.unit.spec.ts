import { describe, expect, it } from 'vitest'

import {
  exampleMatcher,
  exampleTagline,
  exampleTexts,
  findExampleSections,
  isExamplePhoto,
} from '@/lib/examples'
import { fillExamples } from '@/lib/templates'
import { parsePageContent, type PageComponent, type PuckPageData } from '@/puck/schema'
import { templateSeeds } from '@/seed/templates/data'
import { pageBuilder } from '@/seed/templates/sections'

const page = (content: PageComponent[]): PuckPageData => ({ root: { props: {} }, content })
const texts = exampleTexts(templateSeeds)

// Um texto de exemplo da confeitaria, sem marcador, e um com o nome e a cidade.
const PLAIN = 'Brigadeiro, beijinho e cajuzinho, à sua escolha.'
const MARKED =
  'Encomende o bolo da sua festa, docinhos e tortas para qualquer ocasião, aqui em {cidade}.'

/** Um banner com os textos trocados. */
function hero(change: { title?: string; text?: string; label?: string }): PageComponent {
  return pageBuilder().hero({
    title: change.title ?? 'Café da nossa família',
    text: change.text ?? 'Torrado toda semana.',
    button: change.label ?? 'Fale com a gente',
  })
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
  it('juntam os textos dos modelos, com os marcadores, e deixam de fora botões e títulos bons de manter', () => {
    expect(texts).toContain(PLAIN.toLowerCase())
    expect(texts).toContain(MARKED.toLowerCase())
    expect(texts).not.toContain('fale com a gente')
    expect(texts).not.toContain('perguntas frequentes')
    expect(texts).not.toContain('como funciona')
  })

  it('modelo num formato inválido fica de fora', () => {
    expect(exampleTexts([{ pages: [{ title: 'x', slug: 'x', content: { foo: 1 } }] }])).toEqual([])
  })

  it('acham a seção que ainda tem um texto do modelo', () => {
    const own = hero({})
    const kept = hero({ text: PLAIN })
    expect(findExampleSections(page([own, kept]), texts)).toEqual([kept])
  })

  it('reconhecem o texto com qualquer nome e cidade no lugar dos marcadores', () => {
    const filled = hero({ text: MARKED.replace('{cidade}', 'Uberlândia') })
    const other = hero({ text: MARKED.replace('{cidade}', 'São José do Rio Preto') })
    expect(findExampleSections(page([filled, other]), texts)).toEqual([filled, other])
  })

  it('o texto que a pessoa mudou, mesmo que um pouco, deixa de ser exemplo', () => {
    const changed = hero({ text: MARKED.replace('{cidade}', 'Uberlândia').replace('bolo', 'pão') })
    expect(findExampleSections(page([changed]), texts)).toEqual([])
  })

  it('não ligam para espaços nem para letra maiúscula, que o editor pode mudar', () => {
    const section = hero({ text: `  ${PLAIN.toUpperCase().replace(' ', '  ')} ` })
    expect(findExampleSections(page([section]), texts)).toEqual([section])
  })

  it('o que a pessoa escreveu e os textos dos botões não contam', () => {
    expect(findExampleSections(page([hero({ label: 'Saiba mais' })]), texts)).toEqual([])
  })

  it('nome com caracteres especiais não quebra a comparação', () => {
    const isExample = exampleMatcher(['feito por {nome}.'])
    expect(isExample('feito por doces (& cia) [ana]*.')).toBe(true)
    expect(isExample('feito por.')).toBe(false)
  })

  it('o marcador aceita um nome ou uma cidade, não a frase que a pessoa reescreveu', () => {
    const isExample = exampleMatcher([
      'encomende aqui em {cidade}.',
      'doces da {nome} feitos à mão',
    ])
    expect(isExample('encomende aqui em são josé do rio preto.')).toBe(true)
    expect(isExample('doces da doces mineiros da lu feitos à mão')).toBe(true)
    expect(
      isExample('encomende aqui em uberlândia e região, com entrega grátis acima de r$ 100.'),
    ).toBe(false)
    expect(isExample('doces da lu e da mari, feitos à mão')).toBe(false)
  })

  it('um texto que é só o nome não faz de qualquer texto um exemplo', () => {
    const isExample = exampleMatcher(['{nome}', '{nome} · {cidade}'])
    expect(isExample('o que eu escrevi')).toBe(false)
  })

  it('acham texto dentro das colunas', () => {
    const columns: PageComponent = {
      type: 'Columns',
      props: {
        id: 'Columns-1',
        menuLabel: '',
        anim: 'site',
        layout: 'half',
        column1: [{ type: 'ColumnText', props: { id: 'c1', title: '', text: PLAIN } }],
        column2: [],
        column3: [],
        style: 'light',
      },
    }
    expect(findExampleSections(page([columns]), texts)).toEqual([columns])
  })

  it('numa página inteira de modelo, já com o nome e a cidade, as seções com texto aparecem', () => {
    for (const seed of templateSeeds.filter((item) => item.kind === 'site')) {
      const parsed = parsePageContent(seed.pages?.[0].content)
      if (!parsed.success) throw new Error('modelo inválido')
      const data = fillExamples(parsed.data.data, { name: 'Doces da Ana', city: 'Uberlândia' })
      const found = new Set(findExampleSections(data, texts))
      // A galeria pode ter só um título bom de manter ("Nossos trabalhos"): falta só a foto.
      for (const section of data.content.filter((item) => item.type !== 'Gallery')) {
        expect(found.has(section), `${seed.key} › ${section.type}`).toBe(true)
      }
    }
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
