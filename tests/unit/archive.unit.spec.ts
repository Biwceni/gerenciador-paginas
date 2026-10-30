import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { archiveRules, headerPageIds } from '@/hooks/protectPage'
import { NOT_ARCHIVED, personInitials, personLabel, sortPagesForList } from '@/lib/panel'
import { pageSummary } from '@/puck/summary'

// Regras do servidor com o Payload simulado: testá-las no banco mexeria no site no ar.

type HookArgs = Parameters<typeof archiveRules>[0]

const page = (id: number, title: string, home = false) => ({ id, title, home })

describe('ordem da lista de páginas', () => {
  it('põe a inicial no topo, depois o menu na ordem dele e o resto em ordem alfabética', () => {
    const pages = [
      page(1, 'Zebra'),
      page(2, 'Contato'),
      page(3, 'Início', true),
      page(4, 'Ábaco'),
      page(5, 'Sobre'),
      page(6, 'banana'),
    ]
    const sorted = sortPagesForList(pages, [5, 3, 2])
    expect(sorted.map((item) => item.title)).toEqual([
      'Início',
      'Sobre',
      'Contato',
      'Ábaco',
      'banana',
      'Zebra',
    ])
    // Não muda a lista recebida.
    expect(pages[0].title).toBe('Zebra')
  })

  it('lê o menu na ordem dos itens, com o botão do topo no fim e sem repetir', () => {
    const ids = headerPageIds({
      items: [
        { label: 'Sobre', link: { kind: 'page', page: 7 } },
        { label: 'WhatsApp', link: { kind: 'whatsapp' } },
        { label: 'Cafés', link: { kind: 'section', page: { id: 3 } as never, section: 'x' } },
        { label: 'De novo', link: { kind: 'page', page: 7 } },
      ],
      button: { label: 'Fale', link: { kind: 'page', page: 9 } },
    })
    expect(ids).toEqual([7, 3, 9])
  })
})

describe('arquivar', () => {
  // Página inicial 5; menu com a página 8.
  const req = {
    payloadAPI: 'REST',
    query: {},
    payload: {
      findGlobal: async ({ slug }: { slug: string }) =>
        slug === 'site'
          ? { homepage: 5 }
          : { items: [{ label: 'Menu', link: { kind: 'page', page: 8 } }] },
    },
  } as unknown as PayloadRequest

  const run = (data: Record<string, unknown>, id: number, original: object = {}) =>
    archiveRules({
      context: {},
      data,
      operation: 'update',
      originalDoc: { id, archived: false, ...original },
      req,
    } as unknown as HookArgs)

  it('recusa a página inicial e as do menu', async () => {
    await expect(run({ archived: true, _status: 'draft' }, 5)).rejects.toThrow(
      'A página inicial não pode ser arquivada',
    )
    await expect(run({ archived: true, _status: 'draft' }, 8)).rejects.toThrow(
      'Esta página está no menu do site',
    )
  })

  it('aceita as outras, e restaurar sempre', async () => {
    await expect(run({ archived: true, _status: 'draft' }, 7)).resolves.toMatchObject({
      archived: true,
    })
    await expect(
      run({ archived: false, _status: 'draft' }, 5, { archived: true }),
    ).resolves.toBeTruthy()
  })

  it('publicar tira do arquivo: página no ar nunca fica arquivada', async () => {
    await expect(run({ archived: true, _status: 'published' }, 7)).resolves.toMatchObject({
      archived: false,
    })
    await expect(run({ _status: 'published' }, 7, { archived: true })).resolves.toMatchObject({
      archived: false,
    })
  })

  it('deixa as arquivadas fora dos destinos de link', () => {
    expect(NOT_ARCHIVED).toEqual({ archived: { not_equals: true } })
    expect(pageSummary({ id: 1, title: 'A', slug: 'a', archived: true }, false).archived).toBe(true)
    expect(pageSummary({ id: 1, title: 'A', slug: 'a' }, true).archived).toBe(false)
  })
})

describe('pessoa no pé do menu', () => {
  it('mostra iniciais, nome e papel, sem foto', () => {
    expect(personInitials({ name: 'Fábio Ormeni' })).toBe('FO')
    expect(personInitials({ name: 'Ana' })).toBe('AN')
    expect(personInitials({ email: 'maria.silva@cafe.com' })).toBe('MS')
    expect(personLabel({ name: 'Fábio', role: 'admin' })).toBe('Fábio · administrador')
    expect(personLabel({ email: 'ana@cafe.com', role: 'editor' })).toBe('ana · editor')
  })
})
