// Endereços que já são do sistema: uma página com eles ficaria escondida atrás do painel ou da API.
export const RESERVED_SLUGS = ['admin', 'api', 'media', 'next'] as const

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** "Quem Somos & Nossa História" → "quem-somos-nossa-historia" */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

/**
 * Endereço livre a partir do nome: "promocao", ou "promocao-2" se já existir uma página (ou se for
 * um endereço do sistema).
 */
export function uniqueSlug(name: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  const base = slugify(name).slice(0, 76).replace(/-+$/, '') || 'pagina'
  const free = (slug: string) => !used.has(slug) && validateSlug(slug) === true
  if (free(base)) return base
  let n = 2
  while (!free(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/** Mensagem para o usuário, ou `true` quando o endereço serve. */
export function validateSlug(slug: string | null | undefined): string | true {
  if (!slug) return 'Escolha um endereço para a página.'
  if (!SLUG_PATTERN.test(slug)) {
    return 'Use só letras minúsculas sem acento, números e hífens. Ex.: quem-somos.'
  }
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return `O endereço "${slug}" é usado pelo sistema. Escolha outro.`
  }
  return true
}
