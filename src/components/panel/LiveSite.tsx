'use client'

import '@/app/(frontend)/styles.css'

import React from 'react'

import { SiteFrame } from './SiteFrame'

/** Largura e altura da "janela" da miniatura: a primeira tela de um computador. */
export const LIVE_SITE_WIDTH = 1280
export const LIVE_SITE_HEIGHT = 760

/**
 * Miniatura ao vivo do site publicado, no cartão "Seu site" do início do painel: o começo da
 * página inicial desenhado como nas prévias (o mesmo CSS, as mesmas cores e letras), diminuído por
 * `transform`. É só para ver: nada dentro dela recebe clique nem foco, e o leitor de tela pula
 * (os botões do cartão dizem o que dá para fazer).
 */
export function LiveSite({
  children,
  fontFaces,
  theme,
}: {
  children: React.ReactNode
  fontFaces: string | null
  theme: Record<string, string>
}) {
  return (
    <div aria-hidden="true" className="gp-sitecard__mini" inert>
      <SiteFrame
        fontFaces={fontFaces}
        maxHeight={LIVE_SITE_HEIGHT}
        theme={theme}
        title="Miniatura do site no ar"
        width={LIVE_SITE_WIDTH}
      >
        {children}
      </SiteFrame>
    </div>
  )
}
