import { Render } from '@puckeditor/core/rsc'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import React, { cache } from 'react'

import { PanelBar } from '@/components/site/PanelBar'
import { Photo } from '@/components/site/Photo'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteLink } from '@/components/site/SiteLink'
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
import { FALLBACK_SITE_NAME, initials } from '@/lib/site'
import type { Media, Page } from '@/payload-types'
import { renderConfig } from '@/puck/config'
import { resolveReferences } from '@/puck/references'
import { extractDescription, firstPhotoId, firstSentence } from '@/puck/seo'

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

const getMediaByID = cache(async (id: number): Promise<Media | null> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'media',
    where: { id: { equals: id } },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: false,
  })
  return docs[0] ?? null
})

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug = [] } = await params
  const [{ page, isHome }, site] = await Promise.all([findPage(slug), getSite()])
  const name = site.name || FALLBACK_SITE_NAME
  // Página inicial: "Nome do site | primeira frase da apresentação", como no protótipo.
  const tagline = firstSentence(site.tagline)
  const homeTitle = tagline ? `${name} | ${tagline}` : name
  if (!page) return { title: { absolute: homeTitle } }

  const data = readPageContent(page)
  const title = page.seo?.title || page.title
  const description =
    page.seo?.description ||
    extractDescription(data) ||
    site.seoDescription ||
    site.tagline ||
    undefined
  const photoId = firstPhotoId(data)
  const image =
    populatedMedia(page.seo?.image) ??
    (photoId ? await getMediaByID(photoId) : null) ??
    populatedMedia(site.shareImage) ??
    populatedMedia(site.logo)
  const path = isHome ? '/' : `/${page.slug}`
  const fullTitle = isHome ? page.seo?.title || homeTitle : `${title} | ${name}`

  return {
    title: isHome ? { absolute: fullTitle } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: name,
      locale: 'pt_BR',
      type: 'website',
      images: image?.url ? [{ url: image.url, alt: image.alt }] : undefined,
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
          {logo ? (
            <Photo className="site-soon__logo" media={logo} sizes="160px" />
          ) : (
            <span aria-hidden="true" className="site-header__initials site-soon__initials">
              {initials(name)}
            </span>
          )}
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

  return (
    <>
      <PanelBar adminRoute={adminRoute} apiRoute={apiRoute} pageId={page.id} />
      <SiteHeader campaign={campaign} currentPageId={page.id} />
      <main id="conteudo">
        {!metadata.mainHeadingId && (
          <h1 className={isHome ? 'visually-hidden' : 'container page-title'}>{page.title}</h1>
        )}
        <Render config={renderConfig} data={data} metadata={metadata} />
      </main>
      <SiteFooter campaign={campaign} />
    </>
  )
}
