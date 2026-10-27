import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import React from 'react'

// Fontes do painel (as do protótipo). O `next/font` baixa os arquivos no build e serve do próprio
// site: o painel não chama o Google.
const body = Figtree({ subsets: ['latin'], display: 'swap' })
const display = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap' })

/** Provedor do painel: só publica as fontes como variáveis do tema, em todas as telas. */
export function PanelFonts({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <style>{`:root{--font-body:${body.style.fontFamily};--gp-font-display:${display.style.fontFamily}}`}</style>
      {children}
    </>
  )
}
