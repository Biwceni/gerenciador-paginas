import { Familjen_Grotesk, Onest } from 'next/font/google'
import React from 'react'

// Letras do painel (redesign v3, entrega 5): Onest no texto e Familjen Grotesk nos títulos. O
// `next/font` baixa os arquivos no build e serve do próprio site: o painel não chama o Google.
const body = Onest({ subsets: ['latin'], display: 'swap' })
const display = Familjen_Grotesk({ subsets: ['latin'], display: 'swap' })

/** Provedor do painel: só publica as fontes como variáveis do tema, em todas as telas. */
export function PanelFonts({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <style>{`:root{--font-body:${body.style.fontFamily};--gp-font-display:${display.style.fontFamily}}`}</style>
      {children}
    </>
  )
}
