'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { siteCSS } from '@/components/editor/EditorFrame'
import { applySiteTheme } from '@/components/site/theme'
import { safeStyleText } from '@/lib/theme'

type Props = {
  title: string
  /** Variáveis de cor e fonte das configurações (as mesmas do `body` do site). */
  theme: Record<string, string>
  fontFaces: string | null
  /**
   * Folhas de estilo de fora, só para a prévia (fontes do Google ainda não publicadas). O site
   * nunca carrega do Google: as fontes são copiadas para o nosso Storage ao publicar.
   */
  stylesheets?: string[]
  /**
   * Largura da janela simulada, em pixels: o CSS do site muda de layout pela largura da janela.
   * Se não couber, a prévia inteira é diminuída (o computador vira uma miniatura).
   */
  width: number
  /**
   * Altura máxima da janela simulada, em pixels do site: mostra só o começo da página, como a
   * primeira tela do navegador (e as fotos mais abaixo nem chegam a baixar).
   */
  maxHeight?: number
  children: React.ReactNode
}

/**
 * Pedaço do site desenhado dentro de um iframe, com só o CSS do site, as cores e as fontes (como a
 * prévia do editor). No iframe, a largura dele vale como a da janela, e celular e computador ficam
 * certos. Os links não funcionam aqui: é só para ver.
 */
export function SiteFrame({
  title,
  theme,
  fontFaces,
  stylesheets,
  width,
  maxHeight,
  children,
}: Props) {
  const box = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLIFrameElement>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [height, setHeight] = useState(240)
  const [available, setAvailable] = useState(width)

  useEffect(() => {
    const frame = ref.current?.contentDocument
    if (!frame) return
    frame.open()
    frame.write('<!doctype html><html lang="pt-BR"><head></head><body class="site"></body></html>')
    frame.close()
    const add = (css: string) => {
      const style = frame.createElement('style')
      style.textContent = css
      frame.head.appendChild(style)
    }
    add(siteCSS())
    // Sem a altura mínima da tela: a prévia mede o conteúdo, e ele pode encolher.
    add('body{margin:0;pointer-events:none}body.site{min-height:0}')
    if (fontFaces) add(safeStyleText(fontFaces))
    setBody(frame.body)

    const observer = new ResizeObserver(() => setHeight(frame.body.offsetHeight))
    observer.observe(frame.body)
    return () => observer.disconnect()
  }, [fontFaces])

  useEffect(() => {
    if (!body) return
    applySiteTheme(body, theme)
  }, [body, theme])

  // Em texto, para o efeito só rodar quando a lista mudar de verdade.
  const sheets = (stylesheets ?? []).join(' ')
  useEffect(() => {
    if (!body || !sheets) return
    const frame = body.ownerDocument
    const links = sheets.split(' ').map((href) => {
      const link = frame.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      return frame.head.appendChild(link)
    })
    return () => links.forEach((link) => link.remove())
  }, [body, sheets])

  useEffect(() => {
    const element = box.current
    if (!element) return
    const observer = new ResizeObserver(() => setAvailable(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const scale = Math.min(1, available / width)
  const shown = maxHeight ? Math.min(height, maxHeight) : height

  return (
    <div className="gp-siteframe" ref={box}>
      <div style={{ width: width * scale, height: shown * scale, overflow: 'hidden' }}>
        <iframe
          ref={ref}
          style={{ width, height: shown, transform: `scale(${scale})`, transformOrigin: '0 0' }}
          tabIndex={-1}
          title={title}
        />
      </div>
      {body && createPortal(children, body)}
    </div>
  )
}
