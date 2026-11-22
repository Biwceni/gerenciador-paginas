// Limites do menu com grupos, da linha de cima e das colunas do rodapé (M1).

/** Itens no topo, contando cada grupo como um. */
export const MENU_LIMIT = 8
/** Links dentro de um grupo do menu. */
export const MENU_GROUP_LIMIT = 8
/** Colunas de links próprias do rodapé. */
export const FOOTER_COLUMN_LIMIT = 4
/** Links em cada coluna do rodapé. */
export const FOOTER_LINK_LIMIT = 8
/** Texto do link curto da linha de cima. */
export const TOPBAR_LABEL_MAX = 30

type WithChildren<T> = T & { children?: T[] | null }

/** Todos os links do menu, os do topo e os de dentro dos grupos, na ordem do menu. */
export function flatMenu<T extends object>(
  items: readonly WithChildren<T>[] | null | undefined,
): T[] {
  return (items ?? []).flatMap((item) => [item, ...(item.children ?? [])])
}

/** O item é um grupo: tem links dentro. */
export const isGroup = (item: { children?: readonly unknown[] | null }) =>
  Boolean(item.children?.length)
