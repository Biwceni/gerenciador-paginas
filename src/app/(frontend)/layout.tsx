import type { Metadata } from 'next'
import React from 'react'

import { themeStyle } from '@/components/site/theme'
import { getSite, populatedMedia } from '@/lib/content'
import { FALLBACK_SITE_NAME, getServerURL, isIndexable } from '@/lib/site'
import { safeStyleText } from '@/lib/theme'

import './styles.css'

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite()
  const name = site.name || FALLBACK_SITE_NAME
  const shareImage = populatedMedia(site.shareImage) ?? populatedMedia(site.logo)

  return {
    metadataBase: new URL(getServerURL()),
    title: { default: name, template: `%s | ${name}` },
    description: site.seoDescription || site.tagline || undefined,
    robots: isIndexable() ? undefined : { index: false, follow: false },
    openGraph: {
      siteName: name,
      locale: 'pt_BR',
      type: 'website',
      images: shareImage?.url
        ? [{ url: shareImage.url, alt: shareImage.alt ?? undefined }]
        : undefined,
    },
  }
}

// O cabeçalho e o rodapé ficam em cada página (`[[...slug]]` e `not-found`), porque dependem dela:
// item do menu marcado e página de campanha.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite()

  return (
    <html lang="pt-BR">
      <head>
        {/* CSS montado pelo servidor ao publicar as configurações, com as fontes no nosso Storage. */}
        {/* Sem fontes copiadas, o texto é vazio: um "" solto aqui quebraria a hidratação da página. */}
        {site.fontFaces ? (
          <style dangerouslySetInnerHTML={{ __html: safeStyleText(site.fontFaces) }} />
        ) : null}
      </head>
      <body className="site" style={themeStyle(site)}>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  )
}
