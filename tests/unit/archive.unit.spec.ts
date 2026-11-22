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
  // Página inicial 5; menu com a página 8 (e um rascunho do menu guardado, com ela também).
  const updates: Record<string, unknown>[] = []
  const req = {
    payloadAPI: 'REST',
    query: {},
    payload: {
      findGlobal: async ({ slug, draft }: { slug: string; draft?: boolean }) =>
        slug === 'site'
          ? { homepage: 5 }
          : {
              _status: draft ? 'draft' : 'published',
              notice: { text: null },
              items: [
                { label: 'Menu', link: { kind: 'page', page: 8 } },
                { label: 'Outro', link: { kind: 'page', page: 9 } },
                ...(draft ? [{ label: 'Novo', link: { kind: 'page', page: 10 } }] : []),
              ],
              button: { label: 'Fale', link: { kind: 'page', page: 8 } },
            },
      updateGlobal: async (args: Record<string, unknown>) => {
        updates.push(args)
        return {}
      },
      count: async ({ where }: { where: { and: [{ slug: { equals: string } }] } }) => ({
        totalDocs: where.and[0].slug.equals === 'ocupado' ? 1 : 0,
      }),
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

  it('recusa a página inicial', async () => {
    await expect(run({ archived: true, _status: 'draft' }, 5)).rejects.toThrow(
      'A página inicial não pode ser arquivada',
    )
  })

  it('A6: página do menu sai do menu e do botão do topo, no ar e no rascunho guardado', async () => {
    updates.length = 0
    const data = await run({ archived: true, _status: 'draft', slug: 'contato' }, 8)
    expect(data).toMatchObject({ archived: true, slug: 'contato-arquivada-8' })
    const [live, draft] = updates as { data: Record<string, unknown>; draft?: boolean }[]
    expect(live.data).toMatchObject({
      _status: 'published',
      items: [{ label: 'Outro', link: { kind: 'page', page: 9 } }],
      button: { label: null },
    })
    expect(live.draft).toBeUndefined()
    // O rascunho do menu continua guardado (com o item novo), só sem a página arquivada.
    expect(draft.draft).toBe(true)
    expect(draft.data).toMatchObject({
      _status: 'draft',
      items: [
        { label: 'Outro', link: { kind: 'page', page: 9 } },
        { label: 'Novo', link: { kind: 'page', page: 10 } },
      ],
    })
  })

  it('A6: arquivar libera o endereço, e restaurar volta para ele se estiver livre', async () => {
    await expect(
      run({ archived: true, _status: 'draft', slug: 'sobre' }, 7),
    ).resolves.toMatchObject({ archived: true, slug: 'sobre-arquivada-7' })
    await expect(
      run({ archived: false, _status: 'draft', slug: 'sobre-arquivada-7' }, 7, { archived: true }),
    ).resolves.toMatchObject({ slug: 'sobre' })
    await expect(
      run({ archived: false, _status: 'draft', slug: 'ocupado-arquivada-7' }, 7, {
        archived: true,
      }),
    ).resolves.toMatchObject({ slug: 'ocupado-arquivada-7' })
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
    expect(personInitials({ name: 'Ana' })).toBe('A')
    // Sem acento e em maiúscula (antes, "Fábio" virava "FÁ").
    expect(personInitials({ name: 'Fábio' })).toBe('F')
    expect(personInitials({ name: 'érica são joão' })).toBe('EJ')
    expect(personInitials({ name: 'Ítalo Çarvalho' })).toBe('IC')
    expect(personInitials({ email: 'maria.silva@cafe.com' })).toBe('MS')
    expect(personLabel({ name: 'Fábio', role: 'admin' })).toBe('Fábio · administrador')
    expect(personLabel({ email: 'ana@cafe.com', role: 'editor' })).toBe('ana · editor')
  })
})
