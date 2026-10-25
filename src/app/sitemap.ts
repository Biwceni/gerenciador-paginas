import type { MetadataRoute } from 'next'

import { getPayloadClient, getSite, relationID } from '@/lib/content'
import { getServerURL, isIndexable } from '@/lib/site'
import { pageHref } from '@/puck/references'

// Só páginas publicadas. Renovado junto com o resto do site ao publicar.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexable()) return []

  const [payload, site] = await Promise.all([getPayloadClient(), getSite()])
  const homepageId = relationID(site.homepage)
  const { docs } = await payload.find({
    collection: 'pages',
    select: { slug: true, updatedAt: true },
    depth: 0,
    draft: false,
    pagination: false,
    overrideAccess: false,
  })

  const baseURL = getServerURL()
  return docs
    .map((page) => ({
      url: `${baseURL}${pageHref(page, homepageId)}`,
      lastModified: page.updatedAt,
    }))
    .sort((a, b) => a.url.length - b.url.length)
}
