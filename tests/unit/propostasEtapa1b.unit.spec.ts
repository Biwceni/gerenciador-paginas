import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({ toast: {} }))

import { examplePlace } from '@/components/editor/examplePlace'
import { describeStep } from '@/components/editor/historySteps'
import { headerWithoutPage } from '@/hooks/protectPage'
import {
  findChromeExamples,
  findExampleSections,
  findExampleTexts,
  footerExampleTexts,
  keptTexts,
} from '@/lib/examples'
import { finishSteps } from '@/lib/panel'
import { archivedSlug, isArchivedSlug, slugBeforeArchive } from '@/lib/slug'
import { CATALOG_TEXTS } from '@/puck/catalogTexts'
import { parsePageContent, type PageComponent, type PuckPageData } from '@/puck/schema'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 1b: A5, A6, A7 e os extras.

const css = readFileSync(path.resolve('src/components/editor/editor.css'), 'utf8')
const siteCss = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')

const page = (content: PageComponent[], kept?: string[]): PuckPageData => ({
  root: { props: kept ? { keptTexts: kept } : {} },
  content,
})

const faq = (items: { question: string; answer: string }[], title = 'Perguntas frequentes') =>
  ({
    type: 'Faq',
    props: { id: 'Faq-1', title, items, style: 'light', menuLabel: '', anim: 'site' },
  }) as unknown as PageComponent

const hero = (title: string, text = 'Um texto nosso, escrito por nós.') =>
  ({
    type: 'Hero',
    props: {
      id: 'Hero-1',
      title,
      text,
      image: null,
      button: null,
      style: 'image',
      align: 'left',
      height: 'normal',
      highlight: '',
    },
  }) as unknown as PageComponent

// Textos "do modelo" para os testes: uma resposta, um título longo e um curto, uma pergunta.
const MODEL = [
  'pelo whatsapp, no horário de atendimento.',
  'doces feitos à mão para a sua festa',
  'nossos doces',
  'vocês entregam em casa?',
  'quem somos nós',
]

describe('A7: texto de exemplo com o lugar', () => {
  it('diz qual texto é e onde está (seção, campo e posição na lista)', () => {
    const data = page([
      faq([
        { question: 'Qual o prazo?', answer: 'Três dias.' },
        { question: 'Como pagar?', answer: 'Pelo WhatsApp, no horário de atendimento.' },
      ]),
    ])
    const [hit] = findExampleTexts(data, MODEL)
    expect(hit).toMatchObject({
      sectionId: 'Faq-1',
      sectionType: 'Faq',
      path: ['items', 1, 'answer'],
      text: 'Pelo WhatsApp, no horário de atendimento.',
    })
    expect(examplePlace(hit)).toBe('Perguntas frequentes › resposta 2')
  })

  it('não conta título curto, título igual ao nome da página nem pergunta', () => {
    const short = page([hero('Nossos doces')])
    expect(findExampleTexts(short, MODEL)).toEqual([])
    const named = page([hero('Quem somos nós')])
    expect(findExampleTexts(named, MODEL, { pageTitle: 'Quem somos nós' })).toEqual([])
    expect(findExampleTexts(named, MODEL, { pageTitle: 'Sobre' })).toHaveLength(1)
    const question = page([faq([{ question: 'Vocês entregam em casa?', answer: 'Sim.' }])])
    expect(findExampleTexts(question, MODEL)).toEqual([])
    // O título longo do modelo continua contando.
    expect(
      findExampleTexts(page([hero('Doces feitos à mão para a sua festa')]), MODEL),
    ).toHaveLength(1)
  })

  it('o texto do catálogo e o "Lorem ipsum" contam sempre, mesmo curtos ou com "?"', () => {
    const data = page([
      faq([{ question: 'Nova pergunta?', answer: 'Escreva a resposta aqui.' }]),
      hero('Lorem ipsum'),
    ])
    expect(findExampleTexts(data, CATALOG_TEXTS).map((hit) => hit.text)).toEqual([
      'Nova pergunta?',
      'Escreva a resposta aqui.',
      'Lorem ipsum',
    ])
  })

  it('"Manter assim" tira o texto do aviso, e o que é guardado passa pelo formato da página', () => {
    const answer = 'Pelo WhatsApp, no horário de atendimento.'
    const data = page([faq([{ question: 'Como pagar?', answer }])], [answer])
    expect(findExampleTexts(data, MODEL)).toEqual([])
    expect(findExampleSections(data, MODEL)).toEqual([])
    expect(keptTexts(data)).toEqual([answer])
    const parsed = parsePageContent({ version: 2, data })
    expect(parsed.success && parsed.data.data.root.props.keptTexts).toEqual([answer])
    // Página antiga, sem a lista: continua igual depois de passar pelo formato.
    const old = parsePageContent({ version: 2, data: { root: { props: {} }, content: [] } })
    expect(old.success && old.data.data.root.props).toEqual({})
  })

  it('dez textos de exemplo espalhados: um por campo, sem repetir o mesmo texto na seção', () => {
    const items = Array.from({ length: 10 }, () => ({
      question: 'Pergunta nossa',
      answer: 'Pelo WhatsApp, no horário de atendimento.',
    }))
    const hits = findExampleTexts(page([faq(items)]), MODEL)
    expect(hits).toHaveLength(1)
  })

  it('o rodapé com a frase do modelo entra no aviso; a chamada em pergunta não', () => {
    const texts = footerExampleTexts([
      {
        footer: { text: 'Bolos e doces sob encomenda em {cidade}.', ctaTitle: 'Vamos conversar?' },
      },
    ])
    expect(
      findChromeExamples(
        { text: 'Bolos e doces sob encomenda em Lavras.', cta: { title: 'Vamos conversar?' } },
        texts,
      ),
    ).toEqual([{ place: 'Rodapé › Frase', text: 'Bolos e doces sob encomenda em Lavras.' }])
    expect(findChromeExamples({ text: 'Nossa frase de verdade.' }, texts)).toEqual([])
  })

  it('o painel inicial ganha o passo do rodapé só quando ele ainda tem texto do modelo', () => {
    const base = {
      tagline: 'Frase',
      whatsapp: '1',
      email: null,
      examplePages: [],
      examplePhotoPages: 0,
      home: { id: 1, live: true },
    }
    expect(finishSteps(base).some((step) => step.key === 'chrome')).toBe(false)
    const step = finishSteps({ ...base, chromeExamples: ['Rodapé › Frase'] }).find(
      (item) => item.key === 'chrome',
    )
    expect(step).toMatchObject({
      done: false,
      title: 'Troque o texto de exemplo do rodapé',
      detail: 'Ainda do modelo: frase do rodapé.',
      target: { screen: 'menu' },
    })
  })

  it('a citação é itálica sobre fundo neutro, sem borda de um lado só', () => {
    const quote = css.slice(
      css.indexOf('.ed-examples__quote {'),
      css.indexOf('}', css.indexOf('.ed-examples__quote {')),
    )
    expect(quote).toContain('font-style: italic')
    expect(quote).not.toMatch(/border-left|border-inline-start/)
  })
})

describe('A6: menu e páginas', () => {
  it('arquivar tira a página do menu e do botão do topo, e só ela', () => {
    const header = {
      notice: { text: 'Aviso' },
      items: [
        { label: 'Sobre', link: { kind: 'page' as const, page: 3 } },
        { label: 'Cafés', link: { kind: 'section' as const, page: 3, section: 'x' } },
        { label: 'Contato', link: { kind: 'page' as const, page: 4 } },
      ],
      button: { label: 'Fale', link: { kind: 'page' as const, page: 3 } },
    }
    expect(headerWithoutPage(header, 3)).toEqual({
      notice: { text: 'Aviso' },
      items: [{ label: 'Contato', link: { kind: 'page', page: 4 } }],
      button: { label: null, link: { kind: 'page', page: null } },
    })
    expect(headerWithoutPage(header, 9)).toBeNull()
  })

  it('o endereço da arquivada fica livre, e volta ao restaurar', () => {
    expect(archivedSlug('contato', 12)).toBe('contato-arquivada-12')
    expect(archivedSlug('contato-arquivada-12', 12)).toBe('contato-arquivada-12')
    expect(isArchivedSlug('contato-arquivada-12')).toBe(true)
    expect(isArchivedSlug('arquivada')).toBe(false)
    expect(slugBeforeArchive('contato-arquivada-12')).toBe('contato')
    expect(archivedSlug('a'.repeat(80), 7).length).toBeLessThanOrEqual(80)
  })
})

describe('A5: o que se perdia no editor', () => {
  it('"Guardado" fica na cor de "ok" do painel, embaixo do campo', () => {
    expect(css).toMatch(/\.ed-saved-note \{[^}]*color: var\(--gp-ok\)/)
  })

  it('o botão vazio vira convite tracejado no painel e some da prévia fora do mouse', () => {
    expect(css).toMatch(/\.ed-add-optional \{[^}]*border: 2px dashed/)
    expect(siteCss).toContain("content: '+ Botão (opcional)'")
    expect(siteCss).toMatch(
      /\[data-puck-component\]:not\(:hover, :focus-within\) \.button:has\(> \[contenteditable\]:empty\)/,
    )
  })
})

describe('extra do A5: mudanças de agora', () => {
  const base = page([hero('Título'), faq([{ question: 'P?', answer: 'R.' }])])

  it('diz o que cada passo mudou', () => {
    const renamed = page([hero('Outro título'), faq([{ question: 'P?', answer: 'R.' }])])
    expect(describeStep(renamed, base)).toBe('Mudou em Banner principal: título')
    expect(describeStep(page([base.content[0]]), base)).toBe('Saiu: Perguntas frequentes')
    expect(describeStep(base, page([base.content[0]]))).toBe('Entrou: Perguntas frequentes')
    expect(describeStep(page([base.content[1], base.content[0]]), base)).toBe(
      'Mudou a ordem das seções',
    )
    expect(describeStep(page(base.content, ['x']), base)).toBe(
      'Um texto de exemplo ficou como está',
    )
    expect(describeStep(base, base)).toBeNull()
  })
})
