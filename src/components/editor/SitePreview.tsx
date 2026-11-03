'use client'

import React, { createContext, useContext } from 'react'

import { EmptyPage } from './EmptyPage'

/** Topo e rodapé do site, já desenhados pelo servidor (normal e de página de campanha). */
export type SiteChrome = {
  header: React.ReactNode
  headerCampaign: React.ReactNode
  footer: React.ReactNode
  footerCampaign: React.ReactNode
  /** Endereços do painel para mudar o topo e o rodapé. */
  headerAdminHref: string
  footerAdminHref: string
}

type Preview = SiteChrome & { campaign: boolean }

const SitePreviewContext = createContext<Preview | null>(null)

export const SitePreviewProvider = SitePreviewContext.Provider

/**
 * Parte do site que não muda nesta página: aparece igual ao site (sem desbotar) e, ao passar o mouse
 * ou chegar pela tecla Tab, diz onde se muda.
 */
function Locked({ children, href, tip }: { children: React.ReactNode; href: string; tip: string }) {
  return (
    <div className="editor-locked">
      <div aria-hidden="true" inert>
        {children}
      </div>
      <a className="editor-locked__tip" href={href} rel="noopener" target="_blank">
        {tip}
      </a>
    </div>
  )
}

/** Página inteira na prévia do editor: topo, as seções (área do Puck) e rodapé. */
export function SitePreviewRoot({ children }: { children?: React.ReactNode }) {
  const preview = useContext(SitePreviewContext)
  if (!preview) return <main>{children}</main>

  return (
    <>
      <Locked
        href={preview.headerAdminHref}
        tip="O topo e o rodapé você muda em Menu e rodapé. Clique para abrir."
      >
        {preview.campaign ? preview.headerCampaign : preview.header}
      </Locked>
      <main id="conteudo">
        {children}
        <EmptyPage />
      </main>
      <Locked
        href={preview.footerAdminHref}
        tip="O topo e o rodapé você muda em Menu e rodapé. Clique para abrir."
      >
        {preview.campaign ? preview.footerCampaign : preview.footer}
      </Locked>
    </>
  )
}
