import { readFileSync } from 'node:fs'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({ toast: {} }))

import { columnCount, parseColumnZone } from '@/components/editor/columnMove'
import { hiddenColumnNotice } from '@/components/editor/zoneLimits'
import { Columns } from '@/puck/components/sections'
import { editorConfig } from '@/puck/editor-config'
import { tabOf } from '@/puck/fieldTabs'
import type { ContentMetadata } from '@/puck/references'
import { CONTENT_VERSION, parsePageContent, visibleColumns } from '@/puck/schema'

// Colunas no estilo Elementor (decisões de 2026-11-15): C6 ordem no celular, C7 alinhamento,
// C8 quatro colunas, C2 levar a peça para outra coluna.

const css = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')

const metadata: ContentMetadata = {
  photos: {},
  forms: {},
  pageHrefs: {},
  pageAnchors: {},
  anchors: {},
  whatsappHref: null,
  site: { name: 'Site', logo: null, contact: {}, motion: 'nenhum' },
  editing: false,
}

const piece = (id: string) => ({ type: 'ColumnText', props: { id, title: id, text: '' } })
const page = (content: unknown[]) =>
  parsePageContent({ version: CONTENT_VERSION, data: { content } })

describe('esquema das Colunas', () => {
  it('página de antes (sem a 4ª coluna, a ordem e o alinhamento) continua valendo', () => {
    const parsed = page([
      {
        type: 'Columns',
        props: {
          id: 'Columns-1',
          menuLabel: '',
          layout: 'half',
          column1: [piece('a')],
          column2: [],
          column3: [],
          style: 'light',
        },
      },
    ])
    expect(parsed.success).toBe(true)
    expect(parsed.data!.data.content[0].props).toMatchObject({
      column4: [],
      mobileOrder: 'first',
      align: 'start',
    })
  })

  it('"Quatro iguais" mostra as quatro colunas; "Duas iguais" só duas', () => {
    const props = {
      layout: 'fourths' as const,
      column1: [],
      column2: [],
      column3: [],
      column4: [piece('d')],
    }
    expect(visibleColumns(props as never)).toHaveLength(4)
    expect(visibleColumns({ ...props, layout: 'half' } as never)).toHaveLength(2)
    expect(columnCount('fourths')).toBe(4)
    expect(columnCount('nada')).toBe(2)
  })
})

describe('desenho das Colunas', () => {
  const render = (props: Record<string, unknown>) =>
    renderToStaticMarkup(
      <Columns
        anim="site"
        columns={[
          <p key="1">um</p>,
          <p key="2">dois</p>,
          <p key="3">três</p>,
          <p key="4">quatro</p>,
        ]}
        id="Columns-1"
        layout="half"
        menuLabel=""
        metadata={metadata}
        style="light"
        {...(props as object)}
      />,
    )

  it('quatro iguais desenha as quatro colunas', () => {
    const html = render({ layout: 'fourths' })
    expect(html).toContain('columns--fourths')
    expect(html.match(/columns__column/g)).toHaveLength(4)
  })

  it('a ordem do celular e o alinhamento viram classes; o padrão não põe nada', () => {
    expect(render({ mobileOrder: 'last', align: 'center' })).toMatch(
      /columns--mobile-last columns--align-center/,
    )
    const plain = render({})
    expect(plain).not.toContain('columns--mobile-last')
    expect(plain).not.toContain('columns--align')
  })

  it('o CSS tem as quatro colunas, duas por linha no tablet e a última primeiro no celular', () => {
    expect(css).toMatch(/\.columns--fourths \{\s*grid-template-columns: repeat\(4, 1fr\)/)
    expect(css).toMatch(
      /max-width: 1023px\) \{\s*\.columns--fourths \{\s*grid-template-columns: repeat\(2, 1fr\)/,
    )
    expect(css).toMatch(
      /\.columns--mobile-last \{\s*display: flex;\s*flex-direction: column-reverse/,
    )
    expect(css).toMatch(/\.columns--align-center \{\s*align-items: center/)
  })
})

describe('painel das Colunas', () => {
  it('as opções novas ficam na Aparência e "Quatro iguais" está no Modelo', () => {
    expect(tabOf('Columns', 'mobileOrder')).toBe('aparencia')
    expect(tabOf('Columns', 'align')).toBe('aparencia')
    // O campo desenha as opções (VisualChoiceField): confere pelo HTML dele.
    const layout = editorConfig.components.Columns.fields!.layout as {
      render: (props: object) => React.ReactElement
    }
    const html = renderToStaticMarkup(
      layout.render({
        field: { label: 'Modelo' },
        name: 'layout',
        onChange: () => {},
        value: 'half',
      }),
    )
    expect(html).toContain('Quatro iguais')
    expect(editorConfig.components.Columns.defaultProps).toMatchObject({
      mobileOrder: 'first',
      align: 'start',
    })
  })

  it('acha a seção e a coluna de uma área de peças', () => {
    expect(parseColumnZone('Columns-abc:column3')).toEqual({ sectionId: 'Columns-abc', n: 3 })
    expect(parseColumnZone('root:default-zone')).toBeNull()
    expect(parseColumnZone(undefined)).toBeNull()
  })
})

describe('aviso ao trocar para menos colunas', () => {
  const data = (layout: string, third: number, fourth: number) => ({
    root: { props: {} },
    content: [
      {
        type: 'Columns',
        props: {
          id: 'Columns-1',
          layout,
          column1: [piece('a')],
          column2: [piece('b')],
          column3: Array.from({ length: third }, (_, n) => piece(`c${n}`)),
          column4: Array.from({ length: fourth }, (_, n) => piece(`d${n}`)),
        },
      },
    ],
  })
  it('de quatro para duas, conta as peças da 3ª e da 4ª', () => {
    expect(hiddenColumnNotice(data('half', 1, 2) as never, data('fourths', 1, 2) as never)).toBe(
      'As 3 peças da Coluna 3 e da Coluna 4 ficam guardadas, sem aparecer na página. Elas voltam se você escolher um modelo com 4 colunas de novo.',
    )
  })
  it('de quatro para três, só a 4ª', () => {
    expect(
      hiddenColumnNotice(data('thirds', 1, 1) as never, data('fourths', 1, 1) as never),
    ).toMatch(/^A peça da Coluna 4 fica guardada/)
  })
  it('para mais colunas, nada', () => {
    expect(
      hiddenColumnNotice(data('fourths', 1, 1) as never, data('half', 1, 1) as never),
    ).toBeNull()
  })
})
