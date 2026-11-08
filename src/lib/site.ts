// Nome provisório do produto, usado no painel e nos e-mails.
export const PRODUCT_NAME = 'Gerenciador de Páginas'

/**
 * Endereço público do site. Sem ele, links de e-mail e `og:image` apontam para
 * localhost (problema da POC). Na Vercel, cai para o domínio de produção ou da prévia.
 */
export function getServerURL(): string {
  if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/** Só o site em produção aparece no Google; prévias e o computador ficam de fora. */
export const isIndexable = (): boolean => process.env.VERCEL_ENV === 'production'

// Nome usado no site enquanto as configurações não foram publicadas.
export const FALLBACK_SITE_NAME = 'Meu site'

/** "Café Grão Mineiro" → "CG": aparece no lugar do logo enquanto não houver um. */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((word) => word.length > 2)
  return (
    words
      .slice(0, 2)
      .map((word) => word[0])
      .join('') || name.slice(0, 2)
  ).toUpperCase()
}

/**
 * Favicon do painel (/admin): a marca do produto, em anil, como SVG dentro do próprio endereço
 * (nenhum arquivo a mais para servir). No navegador em modo escuro, o anil claro do tema escuro.
 */
const PRODUCT_FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34">' +
  '<style>.a{fill:#2f43c9}.i{stroke:#fff}@media (prefers-color-scheme:dark){.a{fill:#8e9cff}.i{stroke:#0d1030}}</style>' +
  '<rect class="a" x="3" y="7" width="20" height="24" rx="4" opacity=".35"/>' +
  '<rect class="a" x="9" y="3" width="22" height="26" rx="4"/>' +
  '<path class="i" d="M14 12h12M14 17h12M14 22h7" fill="none" stroke-width="2.2" stroke-linecap="round"/>' +
  '</svg>'

export const PRODUCT_FAVICON = `data:image/svg+xml,${encodeURIComponent(PRODUCT_FAVICON_SVG)}`
