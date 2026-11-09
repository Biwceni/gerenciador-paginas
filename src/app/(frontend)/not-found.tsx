import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

// A aba diz o que aconteceu ("Página não encontrada | nome do site"), não só o nome do site.
export const metadata: Metadata = { title: 'Página não encontrada', robots: { index: false } }

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="not-found" id="conteudo">
        <div className="container">
          <h1>Página não encontrada</h1>
          <p>Este endereço não existe ou mudou. Veja as páginas no menu ou volte para o início.</p>
          <Link className="button" href="/">
            Ir para o início
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
