// @vitest-environment node
import { createLocalReq, getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { toSettingsState, toSiteData } from '@/components/panel/settings'
import { applySiteTemplate } from '@/lib/applyTemplate'
import config from '@/payload.config'
import type { Template } from '@/payload-types'
import { templateSeeds } from '@/seed/templates/data'

// Configurações em rascunho, com "Publicar" (crítica de design, C27), no banco de TEST_DATABASE_URL.

let payload: Payload
// Só para as regras de acesso: não precisa existir no banco.
const admin = {
  id: 999998,
  email: 'rascunho@teste.local',
  role: 'admin',
  collection: 'users',
} as const

const PUBLISHED = '#1d4ed8'
const TRIED = '#b23a2b'

// Como o site lê: visitante, só o que está publicado.
const visitorSite = () =>
  payload.findGlobal({ slug: 'site', depth: 0, draft: false, overrideAccess: false })
const latest = () =>
  payload.findGlobal({ slug: 'site', depth: 0, draft: true, overrideAccess: true })

/** O que a tela Configurações grava a cada mudança: um rascunho com tudo o que está nela. */
async function saveDraft(colors: Record<string, string>) {
  const state = toSettingsState(await latest())
  await payload.updateGlobal({
    slug: 'site',
    data: { ...toSiteData({ ...state, colors: { ...state.colors, ...colors } }), _status: 'draft' },
    draft: true,
    overrideAccess: false,
    user: admin as never,
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})

afterAll(async () => {
  await payload.destroy()
})

beforeEach(async () => {
  await payload.updateGlobal({
    slug: 'site',
    data: { name: 'Café Teste', colors: { primary: PUBLISHED }, fonts: {}, _status: 'published' },
    overrideAccess: true,
  })
})

describe('Configurações em rascunho', () => {
  it('mudar a cor não muda o site até publicar', async () => {
    await saveDraft({ primary: TRIED })

    expect((await visitorSite()).colors?.primary).toBe(PUBLISHED)
    const draft = await latest()
    expect(draft._status).toBe('draft')
    expect(draft.colors?.primary).toBe(TRIED)

    // "Publicar configurações": tudo o que está na tela, publicado.
    await payload.updateGlobal({
      slug: 'site',
      data: { ...toSiteData(toSettingsState(draft)), _status: 'published' },
      overrideAccess: false,
      user: admin as never,
    })
    expect((await visitorSite()).colors?.primary).toBe(TRIED)
    expect((await latest())._status).toBe('published')
  })

  it('"Descartar mudanças" volta a ser igual ao que está no ar', async () => {
    await saveDraft({ primary: TRIED })

    // Como `discardSettings`: lê o publicado e publica de novo, igual.
    const live = await visitorSite()
    await payload.updateGlobal({
      slug: 'site',
      data: { ...toSiteData(toSettingsState(live)), _status: 'published' },
      overrideAccess: false,
      user: admin as never,
    })

    const now = await latest()
    expect(now._status).toBe('published')
    expect(now.colors?.primary).toBe(PUBLISHED)
    expect(now.name).toBe('Café Teste')
  })

  it('"Começar de novo com um modelo" não deixa rascunho velho', async () => {
    await saveDraft({ primary: TRIED })
    const seed = templateSeeds.find((item) => item.key === 'outro-classico')!
    expect(seed).toBeDefined()
    // Sem fotos, para não baixar nada no teste.
    const template = { ...seed, id: 1, photos: [] } as unknown as Template

    await applySiteTemplate(await createLocalReq({ user: admin as never }, payload), template, {
      name: 'Site Novo',
      tagline: '',
      whatsapp: '',
    })

    const now = await latest()
    expect(now._status).toBe('published')
    expect(now.name).toBe('Site Novo')
    expect(now.colors?.primary).toBe(seed.site?.colors?.primary)
    expect((await visitorSite()).colors?.primary).toBe(seed.site?.colors?.primary)
  })
})
