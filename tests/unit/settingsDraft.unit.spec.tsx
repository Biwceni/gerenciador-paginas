import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setHomepage } from '@/components/panel/api'
import { SaveStatus } from '@/components/panel/SaveStatus'
import { toSettingsState, toSiteData, validateSettings } from '@/components/panel/settings'
import { formPageName } from '@/lib/forms'
import { previewFontFaces } from '@/lib/theme'

// Um jeito só de salvar e publicar (crítica de design, C27 e C28).

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('trocar a página inicial em Páginas', () => {
  it('recusa quando as Configurações têm rascunho, sem publicar nada', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ _status: 'draft' })))
    vi.stubGlobal('fetch', fetch)
    await expect(setHomepage('/api', 7)).rejects.toThrow(/mudanças ainda não publicadas/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('publica quando não há rascunho', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ _status: 'published' })))
    vi.stubGlobal('fetch', fetch)
    await setHomepage('/api', 7)
    expect(fetch).toHaveBeenCalledTimes(2)
    const [, init] = fetch.mock.calls[1] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ homepage: 7, _status: 'published' })
  })
})

describe('estado das Configurações', () => {
  it('lê e grava o global sem perder nada (é o que o "Descartar" publica de novo)', () => {
    const site = {
      name: 'Café',
      tagline: null,
      logo: { id: 3 },
      homepage: 5,
      privacyPage: null,
      colors: { primary: '#123456' },
      fonts: { headings: 'Lora', body: null },
      contact: { whatsapp: '(31) 99999-0000', email: 'a@b.com' },
      social: { instagram: '@cafe' },
      seoDescription: 'Descrição',
      shareImage: 9,
    }
    const data = toSiteData(toSettingsState(site as never))
    expect(data).toMatchObject({
      name: 'Café',
      tagline: null,
      logo: 3,
      homepage: 5,
      fonts: { headings: 'Lora', body: null },
      contact: { whatsapp: '(31) 99999-0000', email: 'a@b.com', phone: null },
      social: { instagram: '@cafe', facebook: null },
      shareImage: 9,
    })
    expect(data.colors.primary).toBe('#123456')
  })

  it('aponta o campo com problema', () => {
    const state = toSettingsState({ name: '', contact: { email: 'sem-arroba' } } as never)
    expect(Object.keys(validateSettings(state)).sort()).toEqual(['email', 'name'])
  })
})

describe('fontes das prévias do painel', () => {
  it('usa as fontes copiadas quando o rascunho não mudou as letras', () => {
    expect(
      previewFontFaces({ fonts: { headings: 'Lora', body: '' }, fontKey: 'Lora|', fontFaces: 'x' }),
    ).toBe('x')
  })

  it('busca no Google a fonte do rascunho que ainda não foi publicada', () => {
    const css = previewFontFaces({
      fonts: { headings: 'Playfair Display', body: '' },
      fontKey: 'Lora|',
      fontFaces: 'x',
    })
    expect(css).toContain('family=Playfair+Display')
    expect(css).toContain('x')
  })
})

describe('aviso de salvo', () => {
  const text = (element: React.ReactElement) => renderToStaticMarkup(element)

  it('telas que publicam', () => {
    expect(text(<SaveStatus mode="publish" state="saving" />)).toContain('Salvando…')
    expect(text(<SaveStatus mode="publish" pending state="saved" />)).toContain(
      'Guardado, falta publicar',
    )
    expect(text(<SaveStatus mode="publish" state="saved" />)).toContain('Tudo no ar')
    const error = text(<SaveStatus mode="publish" onRetry={() => {}} state="error" />)
    expect(error).toContain('Não deu para salvar')
    expect(error).toContain('Tentar de novo')
  })

  it('telas que só salvam', () => {
    expect(text(<SaveStatus mode="save" state="saved" />)).toContain('Tudo salvo')
    expect(text(<SaveStatus mode="save" state="saved" />)).not.toContain('no ar')
  })
})

describe('páginas que usam um formulário', () => {
  it('marca a arquivada e a em rascunho', () => {
    expect(formPageName({ id: 1, title: 'Em breve', state: 'archived' })).toBe(
      'Em breve (arquivada)',
    )
    expect(formPageName({ id: 2, title: 'Promoção', state: 'draft' })).toBe('Promoção (rascunho)')
    expect(formPageName({ id: 3, title: 'Contato', state: 'live' })).toBe('Contato')
  })
})
