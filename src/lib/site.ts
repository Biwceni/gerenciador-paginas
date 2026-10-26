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
