import type { AdminViewServerProps } from 'payload'
import type { CSSProperties } from 'react'
import React from 'react'

import { themeStyle } from '@/components/site/theme'
import { blendColors } from '@/lib/colors'
import { PANEL_PATHS } from '@/lib/panel'
import { getServerURL } from '@/lib/site'
import { parsePageContent, type PuckPageData } from '@/puck/schema'

import { loadPageRows } from './data'
import { NewPageForm, type MiniSection } from './NewPageForm'
import { PanelTemplate, requireUser } from './PanelTemplate'

/**
 * Seções que o modelo cria, de cima para baixo: o cartão desenha cada uma. O banner baixo vira uma
 * faixa fina, para a miniatura mostrar logo o que vem depois (a vitrine, o cardápio...).
 */
const sectionsOf = (data: PuckPageData): MiniSection[] =>
  data.content.map((item) => ({
    type: item.type,
    band: item.type === 'Hero' && item.props.height === 'compact',
  }))

/**
 * Cores do site (o rascunho das Configurações, como o editor) para as miniaturas, nas mesmas
 * variáveis `--ed-site-*` que os desenhos das seções usam no editor.
 */
function siteColors(colors: Parameters<typeof themeStyle>[0]['colors']): CSSProperties {
  const theme = themeStyle({ colors }) as Record<string, string>
  return {
    '--ed-site-primary': theme['--color-primary'],
    '--ed-site-on-primary': theme['--color-on-primary'],
    '--ed-site-bg': theme['--color-background'],
    '--ed-site-surface': theme['--color-surface'],
    '--ed-site-text': theme['--color-text'],
    '--ed-site-deep': theme['--color-deep'],
    '--ed-site-on-deep': theme['--color-on-deep'],
    '--ed-site-line': blendColors(theme['--color-text'], theme['--color-background'], 0.22),
  } as CSSProperties
}

/**
 * Tela "Nova página" (`/admin/paginas/nova`): um modelo de página (fase 4), em branco ou cópia de
 * outra página. Segue o `vNewPage` do protótipo; as miniaturas dos modelos ficam nas cores do site.
 */
export async function NewPageView(props: AdminViewServerProps) {
  const { payload, user, adminRoute } = requireUser(props, PANEL_PATHS.newPage)
  const [pages, templates, site] = await Promise.all([
    loadPageRows(payload, user),
    payload.find({
      collection: 'templates',
      where: { kind: { equals: 'page' } },
      select: { key: true, name: true, description: true, pages: true },
      depth: 0,
      pagination: false,
      sort: 'order',
      overrideAccess: false,
      user,
    }),
    payload.findGlobal({ slug: 'site', depth: 0, draft: true, overrideAccess: false, user }),
  ])

  return (
    <PanelTemplate {...props}>
      <NewPageForm
        adminRoute={adminRoute}
        apiRoute={payload.config.routes.api}
        colors={siteColors(site.colors)}
        domain={new URL(getServerURL()).host}
        initialModel={
          typeof props.searchParams?.modelo === 'string' ? props.searchParams.modelo : null
        }
        models={templates.docs.flatMap((doc) => {
          const parsed = parsePageContent(doc.pages?.[0]?.content)
          if (!parsed.success) return []
          return [
            {
              id: doc.id,
              key: doc.key,
              title: doc.name,
              text: doc.description ?? '',
              sections: sectionsOf(parsed.data.data),
            },
          ]
        })}
        pages={pages
          .map(({ id, title, slug }) => ({ id, title, slug }))
          .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'pt-BR'))}
      />
    </PanelTemplate>
  )
}
