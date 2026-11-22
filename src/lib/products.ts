import { slugify } from './slug'

/**
 * Regras da Vitrine que valem no site e no editor (B2, B3): ler o preço escrito à mão, ordenar,
 * juntar as categorias e buscar sem ligar para acento.
 */

/** Com quantos itens a busca e o "Ordenar" aparecem (B3). Com menos, rolar já resolve. */
export const PRODUCTS_SEARCH_FROM = 12

/** Nome do parâmetro do endereço com a categoria escolhida: `?categoria=vitaminas` (B3). */
export const CATEGORY_PARAM = 'categoria'

/**
 * O número de um preço escrito à mão: "R$ 1.200,90" vira 1200.9, "a partir de R$ 45" vira 45.
 * Sem número ("sob consulta", vazio): `null`, e o item vai para o fim na ordem por preço.
 */
export function parsePrice(price: string | null | undefined): number | null {
  const match = String(price ?? '').match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/)
  if (!match) return null
  const value = Number(match[0].replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

/** Letras sem acento e em minúsculas, para "vitamina" achar "Vitamínico" e "SAÚDE". */
export const plain = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Categoria no endereço: "Mamãe e bebê" vira `mamae-e-bebe`. */
export const categorySlug = (category: string) => slugify(category)

/**
 * As categorias da Vitrine, na ordem em que aparecem nos itens, sem repetir (a mesma categoria
 * escrita com outra caixa ou acento conta como uma só, com o nome da primeira vez).
 */
export function productCategories(categories: (string | null | undefined)[]): string[] {
  const seen = new Map<string, string>()
  for (const category of categories) {
    const name = String(category ?? '').trim()
    const key = categorySlug(name)
    if (key && !seen.has(key)) seen.set(key, name)
  }
  return [...seen.values()]
}

export const PRODUCT_SORT_LABELS = {
  manual: 'Em destaque',
  name: 'Nome (A a Z)',
  price: 'Menor preço',
  newest: 'Mais novos',
} as const

export type ProductSort = keyof typeof PRODUCT_SORT_LABELS

/**
 * A ordem dos itens (posições na lista do editor). "Mais novos": os últimos acrescentados primeiro,
 * já que o item novo entra no fim da lista. Itens sem preço vão para o fim na ordem por preço.
 */
export function sortedOrder(
  items: { name: string; price: number | null }[],
  sort: ProductSort,
): number[] {
  const indexes = items.map((_, index) => index)
  if (sort === 'newest') return indexes.reverse()
  if (sort === 'name') {
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
    return indexes.sort((a, b) => collator.compare(items[a].name, items[b].name) || a - b)
  }
  if (sort === 'price') {
    return indexes.sort((a, b) => {
      const pa = items[a].price
      const pb = items[b].price
      if (pa === null && pb === null) return a - b
      if (pa === null) return 1
      if (pb === null) return -1
      return pa - pb || a - b
    })
  }
  return indexes
}

/** O item bate com a busca: todas as palavras aparecem no nome, na frase, na categoria ou no selo. */
export function matchesSearch(haystack: string, query: string): boolean {
  const words = plain(query).split(/\s+/).filter(Boolean)
  const text = plain(haystack)
  return words.every((word) => text.includes(word))
}
