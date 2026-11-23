import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BrandPanel, combosFor } from '@/components/editor/BrandPanel'
import { createDraftSaver } from '@/components/editor/draftSaver'
import { publishSiteDraft, readSiteLook } from '@/components/panel/api'
import { type SiteLook, sameLook } from '@/components/panel/settings'
import { brandCombos, brandPalette } from '@/lib/brand'
import { DEFAULT_COLORS, PERSONALITIES } from '@/lib/theme'

const LOOK: SiteLook = {
  personality: 'classico',
  colors: { ...DEFAULT_COLORS },
  fonts: { headings: 'Lora', body: 'Figtree' },
}

describe('Sua marca no editor (E8): comparar', () => {
  it('cor em maiúscula ou letra com espaço sobrando é a mesma marca', () => {
    expect(
      sameLook(LOOK, {
        ...LOOK,
        colors: { ...LOOK.colors, primary: LOOK.colors.primary.toUpperCase() },
        fonts: { headings: ' Lora ', body: 'Figtree' },
      }),
    ).toBe(true)
  })

  it('outra personalidade, cor ou letra é outra marca', () => {
    expect(sameLook(LOOK, { ...LOOK, personality: 'vitrine' })).toBe(false)
    expect(sameLook(LOOK, { ...LOOK, colors: { ...LOOK.colors, footer: '#000001' } })).toBe(false)
    expect(sameLook(LOOK, { ...LOOK, fonts: { headings: 'Lora', body: 'Inter' } })).toBe(false)
  })
})

describe('Sua marca no editor (E8): combinações de cores', () => {
  const logo = [
    { color: '#c2185b', share: 0.4 },
    { color: '#1e88e5', share: 0.3 },
    { color: '#212121', share: 0.3 },
  ]

  it('sem logo, três combinações tiradas das cores de hoje', () => {
    expect(combosFor(DEFAULT_COLORS, null).map((combo) => combo.key)).toEqual([
      'noite',
      'claro',
      'forte',
    ])
  })

  it('cor principal trocada em Sua marca: acha a combinação da cor do logo escolhida', () => {
    const chosen = brandCombos(brandPalette('#1e88e5', logo))[1].colors
    const combos = combosFor(chosen, logo)
    expect(
      combos.find((combo) =>
        sameLook({ ...LOOK, colors: combo.colors }, { ...LOOK, colors: chosen }),
      ),
    ).toBeDefined()
  })
})

describe('Sua marca no editor (E8): painel', () => {
  const render = (look: SiteLook, pending = false) =>
    renderToStaticMarkup(
      <BrandPanel
        brandHref="/admin/sua-marca"
        business="confeitaria"
        logoURL={null}
        look={look}
        onChange={() => {}}
        onClose={() => {}}
        pending={pending}
        siteName="Doces da Ana"
      />,
    )

  it('diz que é a mesma Sua marca e que vale para todas as páginas', () => {
    const html = render(LOOK)
    expect(html).toContain('É a mesma Sua marca do painel.')
    expect(html).toContain('Vale para todas as páginas do site.')
    expect(html).toContain('Igual ao que está no ar.')
    expect(render(LOOK, true)).toContain('Em rascunho: o site muda quando você publicar.')
  })

  it('os visuais (F2: nomes novos), com o de agora marcado', () => {
    const html = render({ ...LOOK, personality: 'vitrine' })
    expect(html.match(/<b>(Simples|Sóbrio|Impacto|Acolhedor|Revista)<\/b>/g)).toHaveLength(
      PERSONALITIES.length,
    )
    expect(html).toMatch(/aria-pressed="true"[^>]*><span class="ed-brandpanel__text"><b>Impacto/)
  })

  it('cores e letras fora das sugestões: "Como estava" fica na lista, marcado', () => {
    const html = render({ ...LOOK, fonts: { headings: 'Bebas Neue', body: 'Inter' } })
    expect(html.match(/Como estava/g)).toHaveLength(2)
    expect(html).toContain('Bebas Neue e Inter')
  })

  it('letras sugeridas do ramo e o link para Sua marca completa, em outra aba', () => {
    const html = render(LOOK)
    expect(html).toContain('Cormorant Garamond e Montserrat')
    expect(html).toMatch(/href="\/admin\/sua-marca"[^>]*target="_blank"/)
    expect(html).toContain('Abrir Sua marca completa')
  })
})

describe('Sua marca no editor (E8): pedidos', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lê o rascunho e o que está no ar', async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url)
        const personality = url.includes('draft=true') ? 'vitrine' : 'classico'
        return new Response(JSON.stringify({ name: 'X', personality }), { status: 200 })
      }),
    )
    const { draft, live } = await readSiteLook('/api')
    expect(urls.sort()).toEqual([
      '/api/globals/site?depth=0&draft=false',
      '/api/globals/site?depth=0&draft=true',
    ])
    expect(draft.personality).toBe('vitrine')
    expect(live.personality).toBe('classico')
  })

  it('"Publicar também Sua marca" publica o rascunho inteiro, como o Publicar de Sua marca', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init })
        const body =
          init?.method === 'POST'
            ? { result: {} }
            : { name: 'Doces da Ana', personality: 'aconchego', contact: { email: 'a@b.co' } }
        return new Response(JSON.stringify(body), { status: 200 })
      }),
    )
    await publishSiteDraft('/api')
    expect(calls[0].url).toBe('/api/globals/site?depth=0&draft=true')
    expect(calls[1].url).toBe('/api/globals/site')
    expect(JSON.parse(String(calls[1].init?.body))).toMatchObject({
      _status: 'published',
      name: 'Doces da Ana',
      personality: 'aconchego',
      contact: { email: 'a@b.co' },
    })
  })
})

describe('fila de Sua marca: reset', () => {
  afterEach(() => vi.useRealTimers())

  it('mudou noutra tela: a troca que esperava a pausa é esquecida', async () => {
    vi.useFakeTimers()
    const save = vi.fn(async () => {})
    const saver = createDraftSaver({ initial: 'a', save, onSaved: vi.fn(), onFailed: vi.fn() })
    saver.change('b')
    saver.reset('c')
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).not.toHaveBeenCalled()
  })

  it('depois do reset, uma falha volta para o valor novo', async () => {
    vi.useFakeTimers()
    const onFailed = vi.fn()
    const saver = createDraftSaver({
      initial: 'a',
      save: async () => {
        throw new Error('rede')
      },
      onSaved: vi.fn(),
      onFailed,
    })
    saver.reset('c')
    saver.change('d')
    await vi.advanceTimersByTimeAsync(400)
    expect(onFailed).toHaveBeenCalledExactlyOnceWith('c')
  })
})
