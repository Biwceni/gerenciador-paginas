'use client'

import { toast } from '@payloadcms/ui'
import { Render } from '@puckeditor/core'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { PanelIcon } from '@/components/panel/PanelIcon'
import { startReveal } from '@/components/site/SiteReveal'
import { applySiteTheme } from '@/components/site/theme'
import { WhatsAppFloat } from '@/components/site/WhatsAppFloat'
import { safeStyleText } from '@/lib/theme'
import { sectionAnchors } from '@/puck/anchors'
import { renderConfig } from '@/puck/config'
import type { ContentMetadata } from '@/puck/references'
import type { PuckPageData } from '@/puck/schema'

import { siteCSS } from './EditorFrame'
import { MOBILE_WIDTH } from './puck'
import type { SiteChrome } from './SitePreview'

/** Largura do celular na prévia, a mesma do botão Celular do editor. */
const PHONE_WIDTH = 390

type Device = 'desktop' | 'phone'

type Props = {
  data: PuckPageData
  /** O `metadata` do editor: aqui ele vira o do site (sem `editing`, com as âncoras). */
  metadata: ContentMetadata
  chrome: SiteChrome
  campaign: boolean
  pageTitle: string
  isHome: boolean
  theme: Record<string, string>
  fontFaces: string | null
  onClose: () => void
  /** Outro título na barra: "Ver como fica" de uma seção guardada (E2). */
  note?: { label: string; title: string; hint: string }
}

/**
 * "Ver como visitante" (E5): a página como vai ficar no site, com o rascunho de agora, em tela
 * cheia. Os botões funcionam (os da página rolam até a seção; os de fora abrem em outra aba), a
 * animação toca e nada é publicado. O formulário não envia daqui.
 */
export function VisitorPreview({
  data,
  metadata,
  chrome,
  campaign,
  pageTitle,
  isHome,
  theme,
  fontFaces,
  onClose,
  note,
}: Props) {
  const [device, setDevice] = useState<Device>(() =>
    typeof window !== 'undefined' && window.innerWidth < MOBILE_WIDTH ? 'phone' : 'desktop',
  )
  const [smallScreen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_WIDTH,
  )
  const frameRef = useRef<HTMLIFrameElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)

  // As âncoras desta página, para os botões que levam a uma seção dela (no site, o servidor faz o
  // mesmo com a versão publicada).
  const siteMetadata = useMemo<ContentMetadata>(() => {
    const anchors = sectionAnchors(data)
    const pageAnchors =
      metadata.pageId === undefined
        ? metadata.pageAnchors
        : { ...metadata.pageAnchors, [metadata.pageId]: anchors }
    return { ...metadata, anchors, pageAnchors, editing: false }
  }, [metadata, data])
  const ownPath =
    siteMetadata.pageId === undefined ? null : (siteMetadata.pageHrefs[siteMetadata.pageId] ?? null)

  // O documento do iframe: só o CSS do site, as cores, as fontes e a animação, como no site.
  useEffect(() => {
    const frame = frameRef.current?.contentDocument
    if (!frame) return
    frame.open()
    frame.write(
      '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body class="site" data-animate=""></body></html>',
    )
    frame.close()
    const add = (css: string) => {
      const style = frame.createElement('style')
      style.textContent = css
      frame.head.appendChild(style)
    }
    add(siteCSS())
    add('body{margin:0}')
    if (fontFaces) add(safeStyleText(fontFaces))
    setBody(frame.body)
  }, [fontFaces, device])

  useEffect(() => {
    if (body) applySiteTheme(body, theme)
  }, [body, theme])

  // A animação das seções, como no site, depois de desenhar.
  useEffect(() => {
    if (!body) return
    let stop = () => {}
    const timer = setTimeout(() => {
      stop = startReveal(body.ownerDocument)
    }, 60)
    return () => {
      clearTimeout(timer)
      stop()
    }
  }, [body])

  // Links: os da própria página rolam dentro da prévia; os outros abrem numa aba nova, para não
  // trocar a prévia por outra página. O formulário não envia daqui.
  useEffect(() => {
    if (!body) return
    const frame = body.ownerDocument
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!link) return
      const href = link.getAttribute('href') ?? ''
      // Na captura e sem seguir adiante: o link do Next (`SiteLink`) trocaria a tela do editor
      // pela página do site.
      event.preventDefault()
      event.stopPropagation()
      const url = new URL(href, window.location.origin)
      const samePage =
        href.startsWith('#') || (url.origin === window.location.origin && url.pathname === ownPath)
      if (samePage) {
        const id = decodeURIComponent(url.hash.slice(1))
        const target = id ? frame.getElementById(id) : null
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        else frame.defaultView?.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      window.open(url.toString(), '_blank', 'noopener')
    }
    const onSubmit = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      toast.info('Na prévia, o formulário não envia. No site, ele chega nas Mensagens.')
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    frame.addEventListener('click', onClick, true)
    frame.addEventListener('submit', onSubmit, true)
    frame.addEventListener('keydown', onKey)
    return () => {
      frame.removeEventListener('click', onClick, true)
      frame.removeEventListener('submit', onSubmit, true)
      frame.removeEventListener('keydown', onKey)
    }
  }, [body, onClose, ownPath])

  // Esc fecha; o foco vai para "Voltar a editar" e volta para onde estava ao fechar.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.documentElement.style.setProperty('overflow', 'hidden')
    // O editor por baixo fica fora do alcance do Tab e do leitor de tela enquanto a prévia está aberta.
    const editor = document.querySelector('.ed-root')
    editor?.setAttribute('inert', '')
    return () => {
      editor?.removeAttribute('inert')
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.removeProperty('overflow')
      previous?.focus()
    }
  }, [onClose])

  const mainHeading = Boolean(siteMetadata.mainHeadingId)

  return createPortal(
    <div
      aria-label={note?.label ?? 'Ver como visitante'}
      aria-modal="true"
      className="ed-visitor"
      role="dialog"
    >
      <div className="ed-visitor__bar">
        <div className="ed-visitor__note">
          <b>{note?.title ?? 'Prévia do rascunho'}</b>
          <span className="ed-visitor__hint">
            {note?.hint ?? 'Só você vê. Ainda não está no ar.'}
          </span>
        </div>
        {!smallScreen && (
          <div aria-label="Tamanho da tela" className="ed-visitor__devices" role="group">
            <button
              aria-pressed={device === 'desktop'}
              className="ed-btn ed-btn--sm"
              onClick={() => setDevice('desktop')}
              type="button"
            >
              <PanelIcon name="desktop" size={16} /> Computador
            </button>
            <button
              aria-pressed={device === 'phone'}
              className="ed-btn ed-btn--sm"
              onClick={() => setDevice('phone')}
              type="button"
            >
              <PanelIcon name="phone" size={16} /> Celular
            </button>
          </div>
        )}
        <button
          className="ed-btn ed-btn--primary ed-btn--sm"
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          <PanelIcon name="back" size={16} /> Voltar a editar
        </button>
      </div>
      <div className={`ed-visitor__stage ed-visitor__stage--${device}`}>
        {/* Uma chave por aparelho: o iframe começa de novo, com a animação e o menu do celular
            do jeito que o visitante vê ao abrir a página. */}
        <iframe
          className="ed-visitor__frame"
          key={device}
          ref={frameRef}
          style={device === 'phone' && !smallScreen ? { width: PHONE_WIDTH } : undefined}
          title="Página como o visitante vê"
        />
      </div>
      {body &&
        createPortal(
          <>
            {campaign ? chrome.headerCampaign : chrome.header}
            <main id="conteudo">
              {!mainHeading && (
                <h1 className={isHome || note ? 'visually-hidden' : 'container page-title'}>
                  {pageTitle}
                </h1>
              )}
              <Render config={renderConfig} data={data} metadata={siteMetadata} />
            </main>
            {campaign ? chrome.footerCampaign : chrome.footer}
            {siteMetadata.whatsappHref && <WhatsAppFloat href={siteMetadata.whatsappHref} />}
          </>,
          body,
        )}
    </div>,
    document.body,
  )
}
