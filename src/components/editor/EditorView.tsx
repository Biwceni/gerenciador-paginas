import type { AdminViewServerProps } from 'payload'

import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { themeStyle } from '@/components/site/theme'
import { siteInfo, siteLinks } from '@/lib/content'
import { editorPath } from '@/lib/editor'
import { sectionAnchors } from '@/puck/anchors'
import { parsePageContent } from '@/puck/schema'

import type { EditorPageSummary } from './context'
import { Editor } from './Editor'

/**
 * Editor visual de uma página: /admin/editor/<id>. Tela inteira do painel, sem o menu do Payload.
 * Tudo é lido com o usuário logado (`overrideAccess: false`), como qualquer outra tela.
 */
export async function EditorView({ initPageResult, params }: AdminViewServerProps) {
  const { req } = initPageResult
  const { payload, user } = req
  const adminRoute = payload.config.routes.admin
  const segments = (params?.segments as string[] | undefined) ?? []
  const id = Number(segments[1])

  if (!user) {
    redirect(
      `${adminRoute}/login?redirect=${encodeURIComponent(editorPath(adminRoute, segments[1] ?? ''))}`,
    )
  }
  if (!Number.isInteger(id) || id <= 0) notFound()

  const access = { overrideAccess: false, user } as const
  const [draft, livePages, pages, photos, site] = await Promise.all([
    payload.findByID({
      collection: 'pages',
      id,
      depth: 1,
      draft: true,
      disableErrors: true,
      ...access,
    }),
    // As que estão no ar: marcam os rascunhos no seletor de links e dizem se esta já foi publicada.
    payload.find({
      collection: 'pages',
      where: { _status: { equals: 'published' } },
      select: { title: true },
      depth: 0,
      draft: false,
      limit: 200,
      pagination: false,
      ...access,
    }),
    payload.find({
      collection: 'pages',
      select: { title: true, slug: true, _status: true, content: true },
      depth: 0,
      draft: true,
      limit: 200,
      pagination: false,
      sort: 'title',
      ...access,
    }),
    payload.find({
      collection: 'media',
      depth: 0,
      limit: 500,
      pagination: false,
      sort: '-createdAt',
      ...access,
    }),
    payload.findGlobal({ slug: 'site', depth: 1, draft: false, ...access }),
  ])
  if (!draft) notFound()

  const content = parsePageContent(draft.content)
  if (!content.success) {
    return (
      <div style={{ padding: 40, maxWidth: 640 }}>
        <h1>Não deu para abrir o editor</h1>
        <p>O conteúdo desta página está num formato que o editor não reconhece.</p>
      </div>
    )
  }

  const liveIds = new Set(livePages.docs.map((doc) => doc.id))
  const live = liveIds.has(id)

  const summaries: EditorPageSummary[] = pages.docs.map((doc) => {
    const parsed = parsePageContent(doc.content)
    const anchors = parsed.success ? sectionAnchors(parsed.data.data) : {}
    const labels = parsed.success
      ? Object.fromEntries(
          parsed.data.data.content.map((item) => [
            item.props.id,
            'menuLabel' in item.props ? item.props.menuLabel : '',
          ]),
        )
      : {}
    return {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      published: liveIds.has(doc.id),
      sections: Object.keys(anchors).map((sectionId) => ({
        id: sectionId,
        label: labels[sectionId] || sectionId,
      })),
    }
  })

  const links = siteLinks(site)

  return (
    <Editor
      adminRoute={adminRoute}
      // Topo e rodapé publicados, desenhados aqui no servidor pelos mesmos componentes do site.
      chrome={{
        header: <SiteHeader currentPageId={id} />,
        headerCampaign: <SiteHeader campaign currentPageId={id} />,
        footer: <SiteFooter />,
        footerCampaign: <SiteFooter campaign />,
        headerAdminHref: `${adminRoute}/globals/header`,
        footerAdminHref: `${adminRoute}/globals/footer`,
      }}
      apiRoute={payload.config.routes.api}
      fontFaces={site.fontFaces ?? null}
      homepageId={links.homepageId}
      initialData={content.data.data}
      page={{
        id,
        title: draft.title,
        slug: draft.slug,
        campaign: draft.campaign,
        seo: draft.seo,
        live,
        hasChanges: draft._status === 'draft',
      }}
      pages={summaries}
      photos={photos.docs}
      site={siteInfo(site)}
      theme={themeStyle(site) as Record<string, string>}
      whatsappHref={links.whatsappHref}
    />
  )
}
