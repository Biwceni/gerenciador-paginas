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
    if (items.length >= MENU_LIMIT) {
      return { kind: 'cannot-add', reason: `O menu já tem ${MENU_LIMIT} itens.` }
    }
    if (draft._status === 'draft') {
      return {
        kind: 'cannot-add',
        reason: 'O menu tem mudanças ainda não publicadas. Coloque em Menu e rodapé.',
      }
    }
    return { kind: 'can-add', items }
  } catch {
    return { kind: 'cannot-add', reason: 'Não deu para ler o menu.' }
  }
}

/** Publica o menu com o item novo no fim. */
export function addMenuItem(apiRoute: string, items: MenuItems, item: MenuItems[number]) {
  return publishHeaderItems(apiRoute, [...items, item])
}
