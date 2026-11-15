import { FieldTab } from '@puckeditor/core'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({ toast: {} }))

import { VisualChoiceField } from '@/components/editor/VisualChoiceField'
import { editorConfig } from '@/puck/editor-config'
import { FIELD_TABS, tabbedFields, tabOf } from '@/puck/fieldTabs'

// Pacote de componentes (avaliação de 2026-11-14), entrega 1: Puck 0.24 e painel em abas.

const components = editorConfig.components as Record<
  string,
  { fields?: Record<string, unknown>; renderFields?: unknown }
>

describe('A2: painel em abas', () => {
  it('a tabela de abas tem todos os campos de cada seção, e só eles', () => {
    for (const [type, component] of Object.entries(components)) {
      const fields = Object.keys(component.fields ?? {}).sort()
      const table = Object.keys((FIELD_TABS as Record<string, object>)[type] ?? {}).sort()
      expect({ type, fields: table }).toEqual({ type, fields })
    }
  })

  it('Animação fica na aba Animação e Fundo na Aparência, em toda seção que tem', () => {
    for (const [type, component] of Object.entries(components)) {
      const fields = component.fields ?? {}
      if ('anim' in fields) expect(tabOf(type, 'anim')).toBe('animacao')
      if ('style' in fields) expect(tabOf(type, 'style')).toBe('aparencia')
      if ('menuLabel' in fields) expect(tabOf(type, 'menuLabel')).toBe('conteudo')
    }
  })

  it('campo fora da tabela cai em Conteúdo (nunca some)', () => {
    expect(tabOf('Hero', 'campoNovo')).toBe('conteudo')
    expect(tabOf('SecaoNova', 'title')).toBe('conteudo')
  })

  it('toda seção usa as abas', () => {
    for (const component of Object.values(components)) {
      expect(typeof component.renderFields).toBe('function')
    }
  })

  it('separa os campos nas abas, na ordem Conteúdo, Aparência, Animação', () => {
    const render = tabbedFields('Hero')
    const out = render({
      fields: {
        anim: <i key="a">anim</i>,
        style: <i key="s">style</i>,
        title: <i key="t">title</i>,
        align: <i key="al">align</i>,
      },
    }) as React.ReactElement<{ children: React.ReactElement<{ label: string; value: string }>[] }>
    const tabs = React.Children.toArray(out.props.children) as React.ReactElement<{
      label: string
      value: string
      children: React.ReactElement[]
    }>[]
    expect(tabs.every((tab) => tab.type === FieldTab)).toBe(true)
    expect(tabs.map((tab) => tab.props.label)).toEqual(['Conteúdo', 'Aparência', 'Animação'])
    expect(tabs[1].props.children.map((child) => String(child.key))).toEqual(['style', 'align'])
  })

  it('peça com campos de uma aba só fica sem fileira de abas', () => {
    const render = tabbedFields('ColumnText')
    const html = renderToStaticMarkup(
      <>{render({ fields: { title: <i key="t">título</i>, text: <i key="x">texto</i> } })}</>,
    )
    expect(html).toBe('<i>título</i><i>texto</i>')
  })
})

describe('G6: miniaturas da Animação numa fileira', () => {
  const options = ['site', 'none', 'esmaecer'].map((value) => ({
    value,
    label: value,
    hint: 'dica',
    thumb: <svg />,
  }))

  it('com `strip`, a escolha vira fileira que desliza, sem a grade', () => {
    const html = renderToStaticMarkup(
      <VisualChoiceField name="anim" onChange={() => {}} options={options} strip value="none" />,
    )
    expect(html).toContain('ed-thumbs ed-thumbs--strip')
    expect(html).not.toContain('ed-thumbs--3')
  })

  it('sem `strip`, continua a grade de sempre', () => {
    const html = renderToStaticMarkup(
      <VisualChoiceField columns={3} name="s" onChange={() => {}} options={options} value="none" />,
    )
    expect(html).toContain('ed-thumbs ed-thumbs--3')
    expect(html).not.toContain('strip')
  })
})
