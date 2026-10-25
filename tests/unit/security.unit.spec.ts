import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { prepareSiteFonts } from '@/globals/Site'
import { linkKind } from '@/lib/links'
import { safeStyleText } from '@/lib/theme'

const attack = '</style><script>fetch("/api/users")</script>'
const serverCSS = '@font-face{font-family:"Lora";src:url(https://s/f.woff2) format("woff2")}'
const req = {} as PayloadRequest

// O gancho recebe só o que usa; o resto dos argumentos do Payload não importa aqui.
const runHook = (data: Record<string, unknown>, originalDoc: Record<string, unknown>) =>
  prepareSiteFonts({ data, originalDoc, req } as unknown as Parameters<typeof prepareSiteFonts>[0])

describe('CSS das fontes', () => {
  it('nunca deixa sair "<" para dentro de <style>', () => {
    expect(safeStyleText(attack)).not.toContain('<')
    expect(safeStyleText(serverCSS)).toBe(serverCSS)
    expect(safeStyleText(null)).toBe('')
  })

  const previous = { fontFaces: serverCSS, fontKey: 'Lora|Figtree' }

  it('descarta o CSS enviado num rascunho', async () => {
    const result = await runHook({ _status: 'draft', fontFaces: attack, fontKey: 'x' }, previous)
    expect(result).toMatchObject(previous)
  })

  it('descarta o CSS enviado ao publicar sem trocar de fonte', async () => {
    const result = await runHook(
      {
        _status: 'published',
        fonts: { headings: 'Lora', body: 'Figtree' },
        fontFaces: attack,
        fontKey: 'Lora|Figtree',
      },
      previous,
    )
    expect(result).toMatchObject(previous)
  })

  it('sem CSS anterior, não aceita o enviado', async () => {
    const result = await runHook({ _status: 'draft', fontFaces: attack }, {})
    expect(result).toMatchObject({ fontFaces: null, fontKey: null })
  })
})

describe('links desenhados no site', () => {
  it('separa páginas do site, links de fora e endereços perigosos', () => {
    expect(linkKind('/')).toBe('internal')
    expect(linkKind('/sobre')).toBe('internal')
    expect(linkKind('https://wa.me/5531999990000')).toBe('external')
    expect(linkKind('mailto:contato@exemplo.com.br')).toBe('external')
    expect(linkKind('tel:+5531999990000')).toBe('external')
    expect(linkKind('//outro-site.com')).toBeNull()
    expect(linkKind('javascript:alert(1)')).toBeNull()
    expect(linkKind('')).toBeNull()
  })
})
