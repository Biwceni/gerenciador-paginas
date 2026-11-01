import { describe, expect, it } from 'vitest'

import { insertIndex } from '@/puck/insertPosition'

const content = ['Hero-1', 'Columns-1', 'Faq-1'].map((id) => ({ props: { id } }))

describe('insertIndex', () => {
  it('sem seção selecionada, vai para o fim', () => {
    expect(insertIndex(content, null)).toBe(3)
    expect(insertIndex([], null)).toBe(0)
  })

  it('com seção selecionada, vai logo abaixo dela', () => {
    expect(insertIndex(content, { index: 0, zone: 'root:default-zone' })).toBe(1)
    expect(insertIndex(content, { index: 2, zone: 'root:default-zone' })).toBe(3)
  })

  it('com peça selecionada numa coluna, vai abaixo da seção Colunas', () => {
    expect(insertIndex(content, { index: 0, zone: 'Columns-1:column2' })).toBe(2)
  })

  it('seleção que não existe mais não passa do fim', () => {
    expect(insertIndex(content, { index: 9, zone: 'root:default-zone' })).toBe(3)
    expect(insertIndex(content, { index: 0, zone: 'Sumiu-1:column1' })).toBe(3)
  })
})
