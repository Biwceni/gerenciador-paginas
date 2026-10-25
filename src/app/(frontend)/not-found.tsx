import Link from 'next/link'
import React from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="not-found" id="conteudo">
        <div className="container">
          <h1>Página não encontrada</h1>
          <p>O endereço não existe mais.</p>
          <Link className="button" href="/">
            Ir para o início
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
