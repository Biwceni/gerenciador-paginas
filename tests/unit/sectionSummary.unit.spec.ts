import { describe, expect, it } from 'vitest'

import type { PageComponent } from '@/puck/schema'
import { sectionSummary } from '@/puck/sectionSummary'

const section = (type: string, props: object) =>
  ({ type, props: { id: `${type}-1`, ...props } }) as PageComponent

describe('sectionSummary', () => {
  it('lista os primeiros itens e avisa quando tem mais', () => {
    const items = ['Café especial', 'Entrega rápida', 'Torra fresca'].map((title) => ({
      title,
      text: 'Texto',
    }))
    expect(sectionSummary(section('Features', { title: 'Destaques', items }))).toBe(
      'Café especial, Entrega rápida…',
    )
    expect(
      sectionSummary(section('Features', { title: 'Destaques', items: items.slice(0, 2) })),
    ).toBe('Café especial, Entrega rápida')
  })

  it('não repete o mesmo nome em depoimentos', () => {
    const items = [
      { quote: 'Bom', name: 'Nome do cliente' },
      { quote: 'Ótimo', name: 'Nome do cliente' },
    ]
    expect(sectionSummary(section('Testimonials', { title: 'O que dizem', items }))).toBe(
      'Nome do cliente',
    )
  })

  it('itens sem texto: usa o título da seção', () => {
    const items = [{ question: '  ', answer: 'Sim.' }]
    expect(sectionSummary(section('Faq', { title: 'Perguntas', items }))).toBe('Perguntas')
  })

  it('seção de texto: o título e, sem ele, o texto', () => {
    expect(sectionSummary(section('Hero', { title: 'Bem-vindo', text: 'Frase' }))).toBe('Bem-vindo')
    expect(sectionSummary(section('CallToAction', { title: '', text: 'Frase' }))).toBe('Frase')
    expect(sectionSummary(section('Video', { title: '', caption: 'Legenda' }))).toBe('Legenda')
  })

  it('texto simples sem título não mostra as marcações', () => {
    const body = '<p>Escreva <strong>aqui</strong></p>'
    expect(sectionSummary(section('RichText', { title: '', body }))).toBe('Escreva aqui')
  })

  it('galeria sem título conta as fotos', () => {
    const images = [{ id: 1 }, { id: 2 }]
    expect(sectionSummary(section('Gallery', { title: '', images }))).toBe('2 fotos')
    expect(sectionSummary(section('Gallery', { title: '', images: images.slice(1) }))).toBe(
      '1 foto',
    )
    expect(sectionSummary(section('Gallery', { title: 'Fotos', images }))).toBe('Fotos')
  })

  it('colunas: junta o texto das peças', () => {
    const summary = sectionSummary(
      section('Columns', {
        layout: 'thirds',
        column1: [{ type: 'ColumnText', props: { id: 'a', title: 'Primeira', text: '' } }],
        column2: [{ type: 'ColumnButton', props: { id: 'b', button: { label: 'Comprar' } } }],
        column3: [{ type: 'ColumnImage', props: { id: 'c', image: null, caption: 'Foto' } }],
      }),
    )
    expect(summary).toBe('Primeira, Comprar…')
  })

  it('colunas: o modelo de duas ignora a terceira, que não aparece na página', () => {
    const text = (id: string, title: string) => [
      { type: 'ColumnText', props: { id, title, text: '' } },
    ]
    const props = {
      column1: text('a', 'Primeira'),
      column2: text('b', 'Segunda'),
      column3: text('c', 'Terceira'),
    }
    expect(sectionSummary(section('Columns', { layout: 'half', ...props }))).toBe(
      'Primeira, Segunda',
    )
    expect(sectionSummary(section('Columns', { layout: 'thirds', ...props }))).toBe(
      'Primeira, Segunda…',
    )
  })
})
