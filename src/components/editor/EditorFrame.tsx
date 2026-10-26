'use client'

import React, { createContext, useContext, useEffect } from 'react'

import { safeStyleText } from '@/lib/theme'

type FrameStyle = {
  /** Variáveis de cor e fonte das configurações (as mesmas do `body` do site). */
  theme: Record<string, string>
  /** CSS das fontes copiadas para o nosso Storage. */
  fontFaces: string | null
}

const FrameStyleContext = createContext<FrameStyle>({ theme: {}, fontFaces: null })

export const FrameStyleProvider = FrameStyleContext.Provider

const SITE_SELECTOR = /^\.site(?![\w-])/

/** Regra do CSS do site: todas começam em `.site` (aninhadas ou já "achatadas" pelo Next). */
function isSiteRule(rule: CSSRule): boolean {
  return (
    rule instanceof CSSStyleRule &&
    rule.selectorText.split(',').every((selector) => SITE_SELECTOR.test(selector.trim()))
  )
}

/**
 * CSS do site, tirado das folhas da página do editor. O Next pode juntar o CSS do site com o do
 * painel num arquivo só, então a cópia é regra por regra, e não do arquivo inteiro: as classes do
 * painel (algumas com o mesmo nome, como `.section-title`) não podem entrar na prévia.
 */
function siteCSS(): string {
  const parts: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRule[]
    try {
      rules = Array.from(sheet.cssRules)
    } catch {
      // Folha de outro domínio: o navegador não deixa ler, e ela não é a do site.
      continue
    }
    for (const rule of rules) {
      if (isSiteRule(rule)) parts.push(rule.cssText)
      else if (rule instanceof CSSMediaRule) {
        const inner = Array.from(rule.cssRules).filter(isSiteRule)
        if (inner.length) {
          parts.push(`@media ${rule.conditionText}{${inner.map((r) => r.cssText).join('')}}`)
        }
      }
    }
  }
  return parts.join('\n')
}

/**
 * Dentro do iframe da prévia. O Puck não copia os estilos do painel (`syncHostStyles: false`), que
 * mudariam o visual do site; aqui entram só o CSS do site, as cores e as fontes.
 */
export function EditorFrame({
  children,
  document: frame,
}: {
  children: React.ReactNode
  document?: Document
}) {
  const { theme, fontFaces } = useContext(FrameStyleContext)

  useEffect(() => {
    if (!frame) return
    frame.documentElement.setAttribute('lang', 'pt-BR')
    frame.body.classList.add('site')
    for (const [name, value] of Object.entries(theme)) frame.body.style.setProperty(name, value)

    const added: Element[] = []
    const addStyle = (css: string) => {
      const style = frame.createElement('style')
      style.textContent = css
      added.push(frame.head.appendChild(style))
    }
    addStyle(siteCSS())
    if (fontFaces) addStyle(safeStyleText(fontFaces))
    return () => added.forEach((element) => element.remove())
  }, [frame, theme, fontFaces])

  return <>{children}</>
}
