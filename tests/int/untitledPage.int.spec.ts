import { getPayload, type Payload, type TypedUser } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadFinishInput, loadPageRows } from '@/components/panel/data'
import { UNTITLED_PAGE } from '@/lib/pageTitle'
import { sortPagesForList } from '@/lib/panel'
import config from '@/payload.config'
import { emptyPageContent } from '@/puck/schema'

// Rascunho sem nome (redesign v3, entrega 0) no banco de TEST_DATABASE_URL. A tela padrão do Payload
// criava um a cada visita, e ordenar a lista com ele derrubava Meu site, Páginas e Nova página.

let payload: Payload
const created: number[] = []
// Só para as regras de acesso: não precisa existir no banco.
const admin = {
  id: 999998,
  email: 'sem-nome@teste.local',
  role: 'admin',
  collection: 'users',
} as unknown as TypedUser

describe('página sem nome', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const id of created) {
      await payload.delete({ collection: 'pages', id, overrideAccess: true }).catch(() => null)
    }
  })

  it('as listas do painel abrem e mostram "Página sem nome"', async () => {
    const named = await payload.create({
      collection: 'pages',
      data: { title: 'Com nome', content: emptyPageContent(), _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    created.push(named.id)
    const untitled = await payload.create({
      collection: 'pages',
      data: { title: null as unknown as string, content: emptyPageContent(), _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    created.push(untitled.id)

    // As leituras das três telas: Meu site e Páginas (lista ordenada) e Nova página (Copiar).
    const rows = await loadPageRows(payload, admin)
    const sorted = sortPagesForList(rows, [])
    expect(sorted.find((row) => row.id === untitled.id)?.title).toBe(UNTITLED_PAGE)
    expect(sorted.find((row) => row.id === named.id)?.title).toBe('Com nome')
    await expect(loadFinishInput(payload, admin, sorted)).resolves.toBeTruthy()

    const copyList = rows
      .map(({ id, title, slug }) => ({ id, title, slug }))
      .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'pt-BR'))
    expect(copyList.some((page) => page.id === untitled.id)).toBe(true)
  })
})
