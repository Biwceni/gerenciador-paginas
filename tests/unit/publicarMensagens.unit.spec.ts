import { describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({ toast: {} }))

import { findExampleSections, textsOf } from '@/lib/examples'
import { externalLink, validateLinkInput } from '@/lib/links'
import { samePhoto } from '@/lib/photos'
import { CATALOG_TEXTS } from '@/puck/catalogTexts'
import { editorConfig } from '@/puck/editor-config'
import { buttonsWithoutLink } from '@/puck/references'
import type { PuckPageData } from '@/puck/schema'
import { extractDescription } from '@/puck/seo'

// Entrega 3 (publicar com confiança e mensagens que ajudam).

/** O conteúdo que cada seção traz ao entrar pelo catálogo, como a ficha das seções define. */
function catalogContent() {
  const all = new Set<string>()
  for (const component of Object.values(editorConfig.components)) {
    const fields = (component.fields ?? {}) as Record<string, { defaultItemProps?: unknown }>
    textsOf(component.defaultProps).forEach((text) => all.add(text))
    for (const field of Object.values(fields)) {
      if (field.defaultItemProps) textsOf(field.defaultItemProps).forEach((text) => all.add(text))
    }
  }
  return [...all].sort()
}

const data = (content: unknown[]) => ({ root: { props: {} }, content }) as unknown as PuckPageData

describe('texto de exemplo do catálogo (achados 2.3 e 10.3)', () => {
  it('a lista do site é a mesma da ficha das seções', () => {
    expect([...CATALOG_TEXTS].sort()).toEqual(catalogContent())
  })

  it('seções no texto do catálogo aparecem no Publicar, e títulos que servem não', () => {
    const page = data([
      {
        type: 'Hero',
        props: { id: 'Hero-1', title: 'Escreva aqui um título chamativo', text: '' },
      },
      {
        type: 'Features',
        props: {
          id: 'F-1',
          title: 'Por que escolher a gente',
          items: [{ title: 'Novo destaque', text: 'Entrega no mesmo dia.' }],
        },
      },
      {
        type: 'Testimonials',
        props: {
          id: 'T-1',
          title: 'O que dizem nossos clientes',
          items: [{ quote: 'Ótimo!', name: 'Nome do cliente' }],
        },
      },
      {
        type: 'Faq',
        props: {
          id: 'Q-1',
          title: 'Perguntas frequentes',
          items: [{ question: 'Entregam?', answer: 'Sim.' }],
        },
      },
    ])
    const found = findExampleSections(page, CATALOG_TEXTS).map((section) => section.props.id)
    expect(found).toEqual(['Hero-1', 'F-1', 'T-1'])
  })
})

describe('descrição automática do Google (achado 9.4)', () => {
  it('pula o texto de exemplo e fica com o primeiro texto da pessoa', () => {
    const page = data([
      {
        type: 'TextImage',
        props: {
          id: 'A',
          text: 'Use este espaço para explicar com calma. Clique no texto para mudar.',
        },
      },
      { type: 'Contact', props: { id: 'B', text: 'Será um prazer receber você.' } },
      {
        type: 'CallToAction',
        props: { id: 'C', text: 'Bolos caseiros feitos sob encomenda em Santo André.' },
      },
    ])
    expect(extractDescription(page)).toBe('Bolos caseiros feitos sob encomenda em Santo André.')
  })

  it('só texto de exemplo: nenhuma descrição (vale a do site)', () => {
    const page = data([
      { type: 'Contact', props: { id: 'B', text: 'Será um prazer receber você.' } },
    ])
    expect(extractDescription(page)).toBeNull()
  })
})

describe('botões sem destino (achado 10.4)', () => {
  it('acha o "Novo link" sem destino e ignora os botões desligados (sem nome)', () => {
    const page = data([
      {
        type: 'LinkList',
        props: {
          id: 'L-1',
          items: [
            { label: 'Instagram', link: { kind: 'whatsapp' } },
            { label: 'Novo link', link: null },
          ],
        },
      },
      { type: 'Hero', props: { id: 'H-1', button: null } },
      {
        type: 'Columns',
        props: {
          id: 'C-1',
          column1: [
            { type: 'ColumnButton', props: { id: 'B', button: { label: '', link: null } } },
          ],
          column2: [],
          column3: [],
        },
      },
    ])
    expect(buttonsWithoutLink(page)).toEqual([
      { sectionId: 'L-1', sectionType: 'LinkList', label: 'Novo link' },
    ])
  })
})

describe('"Outro site, e-mail ou telefone" (achado 3.7)', () => {
  it.each([
    ['https://loja.com.br', 'https://loja.com.br'],
    ['contato@loja.com.br', 'mailto:contato@loja.com.br'],
    ['(11) 99999-8888', 'tel:+5511999998888'],
    ['www.instagram.com/mrs.kluana', 'https://www.instagram.com/mrs.kluana'],
    ['instagram.com/mrs.kluana', 'https://instagram.com/mrs.kluana'],
  ])('%s vira %s', (typed, href) => {
    expect(externalLink(typed)).toBe(href)
    expect(validateLinkInput(typed)).toBe(true)
  })

  it('o que não dá para entender continua recusado, sem pedir https://', () => {
    expect(externalLink('javascript:alert(1)')).toBeNull()
    expect(externalLink('minha loja')).toBeNull()
    expect(validateLinkInput('minha loja')).toMatch(/site .* e-mail .* telefone/)
  })
})

describe('foto repetida (achado 9.5)', () => {
  const library = [
    { id: 1, filename: 'normal-1600.jpg', filesize: 2000 },
    { id: 2, filename: 'bolo.png', filesize: 900 },
  ]
  it('mesmo tamanho e mesmo nome, fora o número que o sistema põe no fim', () => {
    expect(samePhoto({ name: 'normal-1600.jpg', size: 2000 }, library)?.id).toBe(1)
    expect(samePhoto({ name: 'Bolo (2).PNG', size: 900 }, library)?.id).toBe(2)
  })
  it('outro tamanho ou outro nome: é outra foto', () => {
    expect(samePhoto({ name: 'normal-1600.jpg', size: 2001 }, library)).toBeNull()
    expect(
      samePhoto({ name: 'uma-1731234567890.png', size: 70 }, [
        { id: 3, filename: 'uma-1731234500000.png', filesize: 70 },
      ]),
    ).toBeNull()
    expect(samePhoto({ name: 'praia.jpg', size: 900 }, library)).toBeNull()
  })
})
