import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

// Readaptação da barbearia (23/11): o que quebrava só no iPhone (WebKit) e os dois pontos do layout
// que valem em qualquer aparelho. O teste de verdade é no WebKit (Playwright); aqui, a regra existe.
const siteCss = readFileSync(path.resolve(process.cwd(), 'src/app/(frontend)/styles.css'), 'utf8')

describe('site igual no iPhone e no Android', () => {
  it('a foto do banner estica na coluna (no WebKit ficava com 0 de largura)', () => {
    expect(siteCss).toMatch(/\.site \.hero__photo \{\s*justify-self: stretch;/)
  })

  it('as listas do formulário e do Ordenar desenham a própria seta, sem o visual claro do iPhone', () => {
    expect(siteCss).toMatch(/\.site-form select \{\s*appearance: none;\s*-webkit-appearance: none;/)
    expect(siteCss).toMatch(/\.site \.products-tools select \{[^}]*appearance: none;/)
  })

  it('Foto grande mostra o texto inteiro e fica um por linha no celular', () => {
    expect(siteCss).not.toMatch(/\.features--cover p \{[^}]*line-clamp/)
    expect(siteCss).toMatch(
      /@container site \(max-width: 560px\) \{\s*\.site \.features--cover \{\s*grid-template-columns: minmax\(0, 1fr\);/,
    )
  })

  it('a chamada do fim some quando a página já tem um formulário', () => {
    expect(siteCss).toMatch(/\.site main:has\(\.site-form\) \+ \.site-cta \{\s*display: none;/)
  })
})
