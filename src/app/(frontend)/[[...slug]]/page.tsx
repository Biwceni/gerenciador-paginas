import { Render } from '@puckeditor/core/rsc'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import React, { cache } from 'react'

import { PanelBar } from '@/components/site/PanelBar'
import { footerSocial } from '@/components/site/SiteChrome'
import { Photo } from '@/components/site/Photo'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteLink } from '@/components/site/SiteLink'
import { WhatsAppFloat } from '@/components/site/WhatsAppFloat'
import {
  getHomepage,
  getPageBySlug,
  getPayloadClient,
  getSite,
  populatedMedia,
  readPageContent,
  relationID,
  siteInfo,
  siteLinks,
} from '@/lib/content'
import { pageTitle } from '@/lib/pageTitle'
import { SHARE_IMAGE_SIZE, shareImagePath } from '@/lib/shareImage'
import { FALLBACK_SITE_NAME, getServerURL } from '@/lib/site'
import { breadcrumbJsonLd, jsonLdText, localBusinessJsonLd } from '@/lib/structuredData'
import type { Page } from '@/payload-types'
import { renderConfig } from '@/puck/config'
import { resolveReferences } from '@/puck/references'
import { extractDescription, googleTitle, homeGoogleTitle } from '@/puck/seo'

// Páginas são estáticas e renovadas ao publicar (hooks em `src/hooks/revalidate.ts`).
// Página publicada depois do build é gerada no primeiro acesso.
export const dynamicParams = true

type Params = { slug?: string[] }

export async function generateStaticParams(): Promise<Params[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    select: { slug: true },
    depth: 0,
    draft: false,
    pagination: false,
    overrideAccess: false,
  })
  return [{ slug: [] }, ...docs.map((doc) => ({ slug: [doc.slug] }))]
}

/** `/` mostra a página inicial das configurações; `/endereco`, a página com esse endereço. */
const findPage = cache(
  async (segments: string[]): Promise<{ page: Page | null; isHome: boolean }> => {
    if (segments.length === 0) return { page: await getHomepage(), isHome: true }
    if (segments.length > 1) notFound()

    const page = await getPageBySlug(decodeURIComponent(segments[0]))
    if (!page) notFound()
    // A página inicial tem um endereço só, para o Google não ver duas páginas iguais.
    if (page.id === relationID((await getSite()).homepage)) redirect('/')
    return { page, isHome: false }
  },
)

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug = [] } = await params
  const [{ page, isHome }, site] = await Promise.all([findPage(slug), getSite()])
  const name = site.name || FALLBACK_SITE_NAME
  const titleSite = { name, tagline: site.tagline }
  // O aviso "em construção" fica fora do Google até a inicial ir ao ar.
  if (!page) {
    return {
      title: { absolute: homeGoogleTitle(titleSite) },
      robots: { index: false, follow: false },
    }
  }

  const data = readPageContent(page)
  const description =
    page.seo?.description ||
    extractDescription(data) ||
    site.seoDescription ||
    site.tagline ||
    undefined
  // A foto escolhida (da página ou do site) ou, sem nenhuma, a imagem feita na hora com a foto do
  // banner, o título e o logo (`/og/<id>`).
  const chosen = populatedMedia(page.seo?.image) ?? populatedMedia(site.shareImage)
  const image = chosen?.url
    ? { url: chosen.url, alt: chosen.alt ?? undefined }
    : {
        url: shareImagePath(page.id, page.updatedAt, site.updatedAt),
        alt: pageTitle(page.title),
        ...SHARE_IMAGE_SIZE,
      }
  const path = isHome ? '/' : `/${page.slug}`
  const fullTitle = googleTitle({ title: page.title, seoTitle: page.seo?.title }, titleSite, isHome)

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: name,
      locale: 'pt_BR',
      type: 'website',
      images: [image],
    },
  }
}

export default async function SitePage({ params }: { params: Promise<Params> }) {
  const { slug = [] } = await params
  const { page, isHome } = await findPage(slug)
  const [payload, site] = await Promise.all([getPayloadClient(), getSite()])
  const { admin: adminRoute, api: apiRoute } = payload.config.routes

  // Sem página inicial publicada, o endereço principal mostra um aviso em vez de erro 404. Só o
  // nome e o contato: o menu ainda leva a lugar nenhum.
  if (!page) {
    const name = site.name || FALLBACK_SITE_NAME
    const logo = populatedMedia(site.logo)
    const { whatsappHref, homepageId } = siteLinks(site)
    return (
      <>
        <PanelBar adminRoute={adminRoute} apiRoute={apiRoute} pageId={homepageId} />
        <main className="site-soon" id="conteudo">
          {logo && <Photo className="site-soon__logo" media={logo} sizes="160px" />}
          <h1>{name}</h1>
          <p>Site em construção. Volte em breve.</p>
          {whatsappHref && (
            <SiteLink className="button" href={whatsappHref}>
              Falar no WhatsApp
            </SiteLink>
          )}
        </main>
      </>
    )
  }

  const data = readPageContent(page)
  const metadata = await resolveReferences(
    payload,
    data,
    { ...siteLinks(site), info: siteInfo(site) },
    page.id,
  )
  const campaign = Boolean(page.campaign)

  // Dados para o Google: o negócio na página inicial e, nas outras, o caminho a partir do Início
  // (o Google pede pelo menos dois itens, então a inicial fica sem).
  const name = site.name || FALLBACK_SITE_NAME
  const homeURL = new URL('/', getServerURL()).toString()
  const structuredData = isHome
    ? localBusinessJsonLd({
        site,
        name,
        url: homeURL,
        logo: populatedMedia(site.logo),
        image: populatedMedia(site.shareImage),
        sameAs: footerSocial(site).map((social) => social.url),
      })
    : breadcrumbJsonLd({
        homeName: name,
        homeURL,
        page: { title: page.title, url: new URL(`/${page.slug}`, homeURL).toString() },
      })

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: jsonLdText(structuredData) }}
        type="application/ld+json"
      />
      <PanelBar adminRoute={adminRoute} apiRoute={apiRoute} pageId={page.id} />
      <SiteHeader campaign={campaign} currentPageId={page.id} />
      <main id="conteudo">
        {!metadata.mainHeadingId && (
          <h1 className={isHome ? 'visually-hidden' : 'container page-title'}>{page.title}</h1>
        )}
        <Render config={renderConfig} data={data} metadata={metadata} />
      </main>
      <SiteFooter campaign={campaign} />
      {metadata.whatsappHref && <WhatsAppFloat href={metadata.whatsappHref} />}
    </>
  )
}
