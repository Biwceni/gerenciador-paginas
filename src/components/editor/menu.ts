'use client'

import type { Header } from '@/payload-types'

import { getHeader, publishHeaderItems } from './api'

// "Colocar no menu" a partir do editor: ao publicar a página, ou numa seção com nome no menu.

export const MENU_LIMIT = 8

export type MenuItems = NonNullable<Header['items']>
type MenuLink = MenuItems[number]['link']

export type MenuState =
  | { kind: 'loading' }
  | { kind: 'in-menu' }
  | { kind: 'can-add'; items: MenuItems }
  /** Menu cheio: para entrar, um link sai (A6). */
  | { kind: 'full'; items: MenuItems }
  | { kind: 'cannot-add'; reason: string }

const linkedPage = (link: MenuLink) => (typeof link?.page === 'object' ? link.page?.id : link?.page)

/** O menu publicado já tem um item igual a este? */
export const linksTo =
  (pageId: number, sectionId?: string) =>
  (item: MenuItems[number]): boolean =>
    sectionId
      ? item.link?.kind === 'section' &&
        linkedPage(item.link) === pageId &&
        item.link.section === sectionId
      : item.link?.kind === 'page' && linkedPage(item.link) === pageId

/**
 * Lê o menu publicado e diz se dá para acrescentar um item. Se o Cabeçalho tiver qualquer mudança
 * ainda não publicada, não acrescenta: ao publicar, o Payload completa os campos não enviados com
 * o rascunho mais recente, e a mudança iria para o ar junto, sem a pessoa ver.
 */
export async function readMenu(
  apiRoute: string,
  isLinked: (item: MenuItems[number]) => boolean,
): Promise<Exclude<MenuState, { kind: 'loading' }>> {
  try {
    const [published, draft] = await Promise.all([
      getHeader(apiRoute, false),
      getHeader(apiRoute, true),
    ])
    const items = published.items ?? []
    if (items.some(isLinked)) return { kind: 'in-menu' }
    if (draft._status === 'draft') {
      return {
        kind: 'cannot-add',
        // Achado 1.10: antes a frase juntava o motivo e o que fazer, e parecia outro problema.
        reason:
          'Ela não entra por aqui porque o menu tem outras mudanças guardadas, ainda não publicadas. Coloque a página em Menu e rodapé e publique o menu lá.',
      }
    }
    return items.length >= MENU_LIMIT ? { kind: 'full', items } : { kind: 'can-add', items }
  } catch {
    return { kind: 'cannot-add', reason: 'Não deu para ler o menu.' }
  }
}

/** Publica o menu com o item novo no fim. */
export function addMenuItem(apiRoute: string, items: MenuItems, item: MenuItems[number]) {
  return publishHeaderItems(apiRoute, [...items, item])
}

/**
 * Menu cheio (A6): o link escolhido sai do menu (a página continua no ar) e o novo entra no fim.
 */
export function swapMenuItem(
  apiRoute: string,
  items: MenuItems,
  leaving: number,
  item: MenuItems[number],
) {
  return publishHeaderItems(apiRoute, [...items.filter((_, index) => index !== leaving), item])
}

/** Texto de um link do menu: o nome da página, cortado no limite do campo. */
export const menuLabel = (title: string) => title.trim().slice(0, 30)

export type MenuRename =
  /** Nenhum link do menu leva para a página, ou todos já dizem o nome novo. */
  | { kind: 'nothing' }
  | { kind: 'ask'; items: MenuItems; labels: string[] }
  /** O menu tem mudança guardada e não publicada: a troca fica para a tela Menu e rodapé. */
  | { kind: 'draft' }

/**
 * Renomeou a página (A6): os links do menu que levam para ela e ainda dizem outra coisa. Só os
 * links para a página inteira (os de seção têm o nome da seção).
 */
export async function menuRename(
  apiRoute: string,
  pageId: number,
  title: string,
): Promise<MenuRename> {
  const [published, draft] = await Promise.all([
    getHeader(apiRoute, false),
    getHeader(apiRoute, true),
  ])
  const items = published.items ?? []
  const label = menuLabel(title)
  const labels = items
    .filter((item) => linksTo(pageId)(item) && item.label !== label)
    .map((item) => item.label)
  if (!labels.length) return { kind: 'nothing' }
  if (draft._status === 'draft') return { kind: 'draft' }
  return { kind: 'ask', items, labels }
}

/** Troca o texto dos links da página pelo nome novo e publica o menu. */
export function renameMenuLinks(apiRoute: string, items: MenuItems, pageId: number, title: string) {
  const label = menuLabel(title)
  return publishHeaderItems(
    apiRoute,
    items.map((item) => (linksTo(pageId)(item) ? { ...item, label } : item)),
  )
}
