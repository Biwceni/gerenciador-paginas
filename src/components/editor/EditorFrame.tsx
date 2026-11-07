'use client'

import React, { createContext, useContext, useEffect } from 'react'

import { applySiteTheme } from '@/components/site/theme'
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
export function siteCSS(): string {
  const parts: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRule[]
    try {
      rules = Array.from(sheet.cssRules)
    } catch {
      // Folha de outro domínio: o navegador não deixa ler, e ela não é a do site.
      continue
    }
    parts.push(...siteRules(rules))
  }
  return parts.join('\n')
}

/** Quadros de animação do site: os nomes começam com `site-` (ficam fora do `.site`). */
const SITE_KEYFRAMES = /^site-/

/**
 * As regras do site de uma lista, com as condições em volta (`@media`, `@container`,
 * `@supports`, uma dentro da outra), e os quadros de animação do site.
 */
function siteRules(rules: CSSRule[]): string[] {
  return rules.flatMap((rule) => {
    if (isSiteRule(rule)) return [rule.cssText]
    if (rule instanceof CSSKeyframesRule)
      return SITE_KEYFRAMES.test(rule.name) ? [rule.cssText] : []
    const prelude =
      rule instanceof CSSMediaRule
        ? `@media ${rule.conditionText}`
        : rule instanceof CSSSupportsRule
          ? `@supports ${rule.conditionText}`
          : typeof CSSContainerRule !== 'undefined' && rule instanceof CSSContainerRule
            ? `@container ${rule.containerName} ${rule.conditionText}`
            : null
    if (!prelude || !('cssRules' in rule)) return []
    const inner = siteRules(Array.from((rule as CSSGroupingRule).cssRules))
    return inner.length ? [`${prelude}{${inner.join('')}}`] : []
  })
}

/** Moldura e barra da seção escolhida no verde do painel, como fora da prévia. */
const PUCK_COLORS = `:root {
  --puck-color-azure-03: #0f6b55;
  --puck-color-azure-04: #0f6b55;
  --puck-color-azure-05: #0f6b55;
  --puck-color-azure-06: #0f6b55;
  --puck-color-azure-08: #a9d2c5;
  --puck-color-azure-09: #cde5dd;
  --puck-color-azure-10: #e3f2ec;
  --puck-color-interactive: #0f6b55;
  --puck-color-focus-ring: #0f6b55;
}`

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
    // O iframe é do Puck (`#preview-frame`) e vem sem nome: o leitor de tela diria só "quadro".
    frame.defaultView?.frameElement?.setAttribute('title', 'Prévia da página')
    frame.documentElement.setAttribute('lang', 'pt-BR')
    frame.body.classList.add('site')
    applySiteTheme(frame.body, theme)

    const added: Element[] = []
    const addStyle = (css: string) => {
      const style = frame.createElement('style')
      style.textContent = css
      added.push(frame.head.appendChild(style))
    }
    addStyle(siteCSS())
    addStyle(PUCK_COLORS)
    if (fontFaces) addStyle(safeStyleText(fontFaces))
    return () => added.forEach((element) => element.remove())
  }, [frame, theme, fontFaces])

  return <>{children}</>
}
