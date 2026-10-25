import type { MetadataRoute } from 'next'

import { getServerURL, isIndexable } from '@/lib/site'

// Prévias da Vercel e o computador ficam fora do Google, para não competirem com o site de verdade.
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: `${getServerURL()}/sitemap.xml`,
  }
}
