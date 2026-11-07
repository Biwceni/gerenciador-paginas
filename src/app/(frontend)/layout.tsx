import type { Metadata } from 'next'
import React from 'react'

import { sitePersonality, themeStyle } from '@/components/site/theme'
import { getSite, populatedMedia } from '@/lib/content'
import { fallbackFontFaces } from '@/lib/fontFallback'
import { preloadFontFiles } from '@/lib/fontPreload'
import { FALLBACK_SITE_NAME, getServerURL, isIndexable } from '@/lib/site'
import { FONT_NAME_PATTERN, safeStyleText } from '@/lib/theme'

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

  // As fontes do site começam a baixar junto com a página: o texto não muda de tamanho depois.
  const fontFiles = preloadFontFiles(site.fontFaces, site.fonts)
  // E a reserva de cada uma tem o mesmo tamanho dela: quando a fonte chega, nada muda de lugar.
  const fallbacks = site.fontFaces
    ? await fallbackFontFaces(
        [site.fonts?.headings || site.fonts?.body, site.fonts?.body].filter(
          (name): name is string => Boolean(name && FONT_NAME_PATTERN.test(name)),
        ),
      )
    : ''

  return (
    <html lang="pt-BR">
      <head>
        {fontFiles[0] && (
          <link crossOrigin="anonymous" href={fontFiles[0].origin} rel="preconnect" />
        )}
        {fontFiles.map((file) => (
          <link
            as="font"
            crossOrigin="anonymous"
            href={file.href}
            key={file.href}
            rel="preload"
            type="font/woff2"
          />
        ))}
        {/* CSS montado pelo servidor ao publicar as configurações, com as fontes no nosso Storage. */}
        {/* Sem fontes copiadas, o texto é vazio: um "" solto aqui quebraria a hidratação da página. */}
        {site.fontFaces ? (
          <style
            dangerouslySetInnerHTML={{
              __html: safeStyleText(`${site.fontFaces}
${fallbacks}`),
            }}
          />
        ) : null}
      </head>
      <body className="site" data-personality={sitePersonality(site)} style={themeStyle(site)}>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  )
}
