'use client'

import { createUsePuck } from '@puckeditor/core'
import React, { createContext, useContext } from 'react'

import { mainHeadingID } from '@/puck/references'
import type { PuckPageData } from '@/puck/schema'

import { AddAtEnd, EmptyPage } from './EmptyPage'

const usePuck = createUsePuck()

/**
 * O título que a página ganha no site quando não começa com um Banner (B2, achado G2): na prévia,
 * igual ao site, travado, com a etiqueta que diz por que aparece e onde muda. Na página inicial ele
 * fica escondido no site, e aqui também não aparece.
 */
function PageTitle({ preview }: { preview: Preview }) {
  const hasMainHeading = usePuck((s) =>
    Boolean(mainHeadingID(s.appState.data as unknown as PuckPageData)),
  )
  const empty = usePuck((s) => s.appState.data.content.length === 0)
  if (hasMainHeading || empty || preview.isHome || !preview.pageTitle) return null
  return (
    <div className="editor-locked editor-page-title">
      <h1 aria-hidden="true" className="container page-title">
        {preview.pageTitle}
      </h1>
      <button
        className="editor-locked__tip"
        onClick={() => preview.openPageSettings?.()}
        type="button"
      >
        <span className="editor-locked__tag">
          Título da página: aparece porque a página não começa com um Banner. Mude em Página e
          Google
        </span>
      </button>
    </div>
  )
}

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

type Preview = SiteChrome & {
  campaign: boolean
  /** Nome da página: vira o título principal no site quando ela não começa com um Banner. */
  pageTitle?: string
  /** Página inicial: o título fica escondido no site (só para o Google e o leitor de tela). */
  isHome?: boolean
  openPageSettings?: () => void
}

const SitePreviewContext = createContext<Preview | null>(null)

export const SitePreviewProvider = SitePreviewContext.Provider

/** Para a lista de títulos (aba Ordem): saber se é a página inicial. */
export const SitePreviewContextForOutline = SitePreviewContext

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
      {/* A área inteira leva para Menu e rodapé, mas o aviso é uma etiqueta pequena no canto, e não
          um texto por cima do nome do site (achados 2.1 e 2.5). */}
      <a aria-label={tip} className="editor-locked__tip" href={href} rel="noopener" target="_blank">
        <span className="editor-locked__tag">Topo e rodapé: mude em Menu e rodapé ↗</span>
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
        tip="O topo e o rodapé você muda em Menu e rodapé. Abre em outra aba."
      >
        {preview.campaign ? preview.headerCampaign : preview.header}
      </Locked>
      <main id="conteudo">
        <PageTitle preview={preview} />
        {children}
        <EmptyPage />
        <AddAtEnd />
      </main>
      <Locked
        href={preview.footerAdminHref}
        tip="O topo e o rodapé você muda em Menu e rodapé. Abre em outra aba."
      >
        {preview.campaign ? preview.footerCampaign : preview.footer}
      </Locked>
    </>
  )
}
