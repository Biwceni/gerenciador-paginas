/** Nome mostrado para um rascunho que ainda não tem nome (o autosave cria rascunho sem título). */
export const UNTITLED_PAGE = 'Página sem nome'

/**
 * Nome da página para as listas do painel. O tipo diz `string`, mas um rascunho salvo sozinho pode
 * chegar com `title` nulo ou vazio: sem este cuidado, ordenar a lista derrubava a tela.
 */
export function pageTitle(title: string | null | undefined): string {
  return title?.trim() || UNTITLED_PAGE
}

/**
 * Nome para as listas de escolha (página inicial, privacidade, links do menu): quando duas páginas
 * têm o mesmo nome, cada uma ganha o endereço junto ("Início (/inicio-5)"), para dar para saber qual
 * é qual. Nome único fica como está.
 */
export function distinctPageTitles<T extends { id: number; title: string; slug?: string | null }>(
  pages: readonly T[],
): Map<number, string> {
  const count = new Map<string, number>()
  for (const page of pages) {
    const key = page.title.trim().toLowerCase()
    count.set(key, (count.get(key) ?? 0) + 1)
  }
  return new Map(
    pages.map((page) => [
      page.id,
      (count.get(page.title.trim().toLowerCase()) ?? 0) > 1 && page.slug
        ? `${page.title} (/${page.slug})`
        : page.title,
    ]),
  )
}
