import { describe, expect, it } from 'vitest'

import { packSection, unpackSection, withNewIds } from '@/puck/sectionClipboard'

// Copiar e colar seção entre páginas (Elementor, E1): o que vai para o navegador e o que volta.

const columns = {
  type: 'Columns',
  props: {
    id: 'Columns-1',
    menuLabel: '',
    layout: 'half',
    column1: [{ type: 'ColumnText', props: { id: 'ColumnText-1', title: 'A', text: 'a' } }],
    column2: [{ type: 'ColumnTitle', props: { id: 'ColumnTitle-1', title: 'B' } }],
    column3: [],
    column4: [],
    mobileOrder: 'first',
    align: 'start',
    style: 'light',
    anim: 'site',
  },
}

describe('seção copiada', () => {
  it('volta igual depois de guardada', () => {
    const item = unpackSection(packSection(columns))
    expect(item?.type).toBe('Columns')
    expect((item?.props.column1 as { props: { title: string } }[])[0].props.title).toBe('A')
  })

  it('recusa texto de fora, outro formato e campo inválido', () => {
    expect(unpackSection(null)).toBeNull()
    expect(unpackSection('texto qualquer')).toBeNull()
    expect(
      unpackSection(JSON.stringify({ kind: 'outra-coisa', version: 2, item: columns })),
    ).toBeNull()
    expect(
      unpackSection(
        JSON.stringify({
          kind: 'gp-section',
          version: 2,
          item: { type: 'Hero', props: { id: 'x', title: 42 } },
        }),
      ),
    ).toBeNull()
    expect(
      unpackSection(
        JSON.stringify({ kind: 'gp-section', version: 2, item: { type: 'Nada', props: {} } }),
      ),
    ).toBeNull()
  })

  it('passa pela migração de uma versão antiga do conteúdo', () => {
    const old = {
      kind: 'gp-section',
      version: 1,
      item: {
        type: 'RichText',
        props: { id: 'RichText-1', title: 'Velha', body: '<p>x</p>', style: 'light' },
      },
    }
    const item = unpackSection(JSON.stringify(old))
    expect(item?.props.title).toBe('Velha')
    expect(item?.props.menuLabel).toBe('')
  })

  it('ganha identificação nova, também nas peças das Colunas', () => {
    let n = 0
    const fresh = withNewIds(columns, (type) => `${type}-novo${++n}`)
    expect(fresh.props.id).toBe('Columns-novo3')
    const pieces = [
      ...(fresh.props.column1 as { props: { id: string } }[]),
      ...(fresh.props.column2 as { props: { id: string } }[]),
    ]
    expect(pieces.map((piece) => piece.props.id)).toEqual(['ColumnText-novo1', 'ColumnTitle-novo2'])
    // A original não muda.
    expect(columns.props.id).toBe('Columns-1')
  })

  it('não mexe em listas que não são peças', () => {
    const contact = {
      type: 'Contact',
      props: { id: 'Contact-1', show: ['whatsapp', 'email'], title: 'Fale', text: '' },
    }
    const fresh = withNewIds(contact, () => 'Contact-novo')
    expect(fresh.props.show).toEqual(['whatsapp', 'email'])
  })
})
