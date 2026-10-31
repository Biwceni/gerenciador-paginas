// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PanelBar } from '@/components/site/PanelBar'
import { clearPanelLogin, hasPanelCookie, markPanelLogin } from '@/lib/auth'

const respond = (user: unknown) => vi.fn(async () => Response.json({ user }))
const showBar = (pageId?: number) =>
  render(
    React.createElement(PanelBar, {
      adminRoute: '/admin',
      apiRoute: '/api',
      pageId: pageId ?? null,
    }),
  )

describe('cookie de quem entrou no painel', () => {
  it('reconhece só o cookie certo', () => {
    expect(hasPanelCookie('')).toBe(false)
    expect(hasPanelCookie('outro=1')).toBe(false)
    expect(hasPanelCookie('a=1; gp-painel=1; b=2')).toBe(true)
  })

  it('não leva nenhum dado e some ao sair', () => {
    markPanelLogin()
    expect(document.cookie).toBe('gp-painel=1')
    clearPanelLogin()
    expect(document.cookie).toBe('')
  })
})

describe('barra do site', () => {
  beforeEach(() => clearPanelLogin())
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('visitante comum não faz nenhuma chamada e não vê a barra', async () => {
    const fetch = respond({ id: 1 })
    vi.stubGlobal('fetch', fetch)
    showBar(7)
    await new Promise((resolve) => setTimeout(resolve))
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('com o cookie e o login, mostra os dois atalhos', async () => {
    markPanelLogin()
    const fetch = respond({ id: 1 })
    vi.stubGlobal('fetch', fetch)
    showBar(7)
    const edit = await screen.findByRole('link', { name: 'Editar esta página' })
    expect(edit.getAttribute('href')).toBe('/admin/editor/7')
    expect(screen.getByRole('link', { name: /Voltar ao painel/ }).getAttribute('href')).toBe(
      '/admin',
    )
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]).toEqual(['/api/users/me', { credentials: 'include' }])
  })

  it('sem a página, só o caminho de volta', async () => {
    markPanelLogin()
    vi.stubGlobal('fetch', respond({ id: 1 }))
    showBar()
    await screen.findByRole('link', { name: /Voltar ao painel/ })
    expect(screen.queryByRole('link', { name: 'Editar esta página' })).toBeNull()
  })

  it('cookie sem login (sessão vencida) não mostra a barra e apaga o cookie', async () => {
    markPanelLogin()
    vi.stubGlobal('fetch', respond(null))
    showBar(7)
    await waitFor(() => expect(hasPanelCookie(document.cookie)).toBe(false))
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('sem conexão, não mostra a barra e guarda o cookie para a próxima', async () => {
    markPanelLogin()
    const fetch = vi.fn(async () => {
      throw new Error('sem rede')
    })
    vi.stubGlobal('fetch', fetch)
    showBar(7)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve))
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(hasPanelCookie(document.cookie)).toBe(true)
  })
})
