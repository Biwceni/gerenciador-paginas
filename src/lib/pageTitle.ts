/** Nome mostrado para um rascunho que ainda não tem nome (o autosave cria rascunho sem título). */
export const UNTITLED_PAGE = 'Página sem nome'

/**
 * Nome da página para as listas do painel. O tipo diz `string`, mas um rascunho salvo sozinho pode
 * chegar com `title` nulo ou vazio: sem este cuidado, ordenar a lista derrubava a tela.
 */
export function pageTitle(title: string | null | undefined): string {
  return title?.trim() || UNTITLED_PAGE
}
