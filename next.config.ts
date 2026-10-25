import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// Só o bucket deste ambiente (dev ou produção): `*.supabase.co` deixaria qualquer projeto
// Supabase usar a otimização de imagens do site.
const storagePublicURL = process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL) : null

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Sem includeSubDomains por enquanto: no domínio principal do cliente, ele obrigaria HTTPS em
  // todos os subdomínios dele por 2 anos. Decidir na fase 5, já sabendo qual é o domínio.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  // SAMEORIGIN e não DENY: a prévia do editor (Puck, fase 2) roda em iframe do mesmo domínio.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
]

const nextConfig: NextConfig = {
  // Não gerar AGENTS.md: o repositório guarda só código e o README.
  agentRules: false,
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
      {
        pathname: '/media/**',
      },
    ],
    remotePatterns: storagePublicURL
      ? [
          {
            protocol: 'https',
            hostname: storagePublicURL.hostname,
            pathname: `${storagePublicURL.pathname.replace(/\/$/, '')}/**`,
          },
        ]
      : [],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
