'use client'

import React, { createContext, useContext, useEffect } from 'react'

import { applySiteTheme } from '@/components/site/theme'
import { safeStyleText } from '@/lib/theme'

import { usePuck } from './puck'

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
            ? // O texto da condição já traz o nome do contêiner ("site (max-width: 720px)").
              `@container ${rule.conditionText}`
            : null
    if (!prelude || !('cssRules' in rule)) return []
    const inner = siteRules(Array.from((rule as CSSGroupingRule).cssRules))
    return inner.length ? [`${prelude}{${inner.join('')}}`] : []
  })
}

/**
 * Moldura e barra da seção escolhida no anil do produto (entrega 5), como fora da prévia: contorno
 * de 2 px na seção escolhida e o mesmo contorno a 50% ao passar o mouse, sem pintar a seção.
 */
/**
 * Halo claro de 1 px por dentro do contorno da seção (escolhida ou com o mouse em cima): sobre um
 * banner com foto ou uma seção escura, o anil sozinho fica abaixo de 3:1. O contorno do Puck tem
 * 2 px por dentro da borda, então a sombra de 3 px deixa à mostra só 1 px, logo depois dele.
 */
export const SELECTION_HALO = `[class*='DraggableComponent--isSelected'] > [class*='DraggableComponent-overlayWrapper'] > [class*='DraggableComponent-overlay_'],
[class*='DraggableComponent--hover'] > [class*='DraggableComponent-overlayWrapper'] > [class*='DraggableComponent-overlay_'] {
  box-shadow: inset 0 0 0 3px rgb(255 255 255 / 85%);
}`

export const PUCK_COLORS = `:root {
  --puck-color-azure-03: #2f43c9;
  --puck-color-azure-04: #2f43c9;
  --puck-color-azure-05: #2f43c9;
  --puck-color-azure-06: #2f43c9;
  --puck-color-azure-08: #2f43c9;
  --puck-color-azure-09: #c9cff6;
  --puck-color-azure-10: #e5e8fb;
  --puck-color-interactive: #2f43c9;
  --puck-color-focus-ring: #2f43c9;
  --puck-slot-component-border-width: 2px;
  --puck-slot-component-color-overlay: transparent;
  --puck-slot-component-color-overlay-border: rgb(47 67 201 / 50%);
  --puck-slot-component-color-border-selected: #2f43c9;
}
${SELECTION_HALO}
/* Tela de toque (celular e tablet): os botões da barrinha com 44 px (achados 1.3 e 1.8). */
@media (pointer: coarse) {
  [class*='_ActionBarAction_'] { min-width: 44px; min-height: 44px; justify-content: center; }
}`

/** Espaço acima da seção escolhida, da altura da barrinha (maior no celular, com toque de 44 px). */
export function barSpace(id: string): string {
  const target = `[data-puck-component="${id.replace(/["\\]/g, '')}"]`
  return `${target} { margin-top: 48px; scroll-margin-top: 56px; }
@media (max-width: 637px), (pointer: coarse) { ${target} { margin-top: 56px; scroll-margin-top: 64px; } }`
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

  // A barrinha da seção (ou da peça) escolhida fica acima dela, no espaço que a prévia abre ali:
  // assim ela não cobre o menu do site nem o título da seção de cima (achados 1.4, 2.6 e 8.3).
  const selectedId = usePuck((s) => s.selectedItem?.props.id as string | undefined)
  useEffect(() => {
    if (!frame || !selectedId) return
    const style = frame.createElement('style')
    style.textContent = barSpace(selectedId)
    frame.head.appendChild(style)
    return () => style.remove()
  }, [frame, selectedId])

  return <>{children}</>
}
