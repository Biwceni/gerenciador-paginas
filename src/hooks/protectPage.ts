import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  PayloadRequest,
} from 'payload'
import { APIError } from 'payload'

import type { Header } from '../payload-types'
import { relationID } from '../lib/relations'

type HeaderLink = NonNullable<Header['items']>[number]['link']

/** Páginas citadas pelo menu e pelo botão do topo, no que está no ar e no rascunho. */
export async function pagesInMenu(req: PayloadRequest): Promise<Set<number>> {
  const versions = await Promise.all(
    [false, true].map((draft) =>
      req.payload.findGlobal({ slug: 'header', depth: 0, draft, overrideAccess: true, req }),
    ),
  )
  const ids = new Set<number>()
  const add = (link: HeaderLink | undefined) => {
    const id = ['page', 'section'].includes(link?.kind ?? '') ? relationID(link?.page) : null
    if (id) ids.add(id)
  }
  for (const header of versions) {
    header.items?.forEach((item) => add(item.link))
    add(header.button?.link)
  }
  return ids
}

/** Página inicial nas configurações, no que está no ar ou no rascunho. */
export async function homepageIDs(req: PayloadRequest): Promise<Set<number>> {
  const versions = await Promise.all(
    [false, true].map((draft) =>
      req.payload.findGlobal({ slug: 'site', depth: 0, draft, overrideAccess: true, req }),
    ),
  )
  return new Set(versions.map((site) => relationID(site.homepage)).filter((id) => id !== null))
}

/**
 * Excluir não tem volta, então a regra fica no servidor: a página inicial e as páginas do menu
 * não podem ser excluídas (o site ficaria sem início ou com um item de menu quebrado).
 * Só o `seed -- recriar`, que refaz as configurações e o menu, passa por cima (o `context` só
 * existe na API local, não chega pela API REST).
 */
export const protectPageDelete: CollectionBeforeDeleteHook = async ({ context, id, req }) => {
  if (context.seedRecreate) return
  const pageId = Number(id)
  if ((await homepageIDs(req)).has(pageId)) {
    throw new APIError(
      'A página inicial não pode ser excluída. Escolha outra página inicial antes.',
      400,
      null,
      true,
    )
  }
  if ((await pagesInMenu(req)).has(pageId)) {
    throw new APIError(
      'Esta página está no menu do site. Tire ela do menu antes de excluir.',
      400,
      null,
      true,
    )
  }
}

/**
 * A página inicial não pode sair do ar: o endereço principal do site daria "não encontrada".
 * O Payload não diz ao gancho se é um rascunho sendo salvo, então vale o que a requisição pediu:
 * pela API REST, salvar rascunho vem com `?draft=true` (editor, salvamento automático, painel) e
 * "tirar do ar" vem sem ele. A API local (código do servidor, como o seed) fica de fora; pelo
 * GraphQL, que não usamos, salvar rascunho da página inicial também é recusado.
 */
export const protectHomepageUnpublish: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || req.payloadAPI === 'local') return data
  if (data._status !== 'draft' || req.query?.draft === 'true') return data
  const pageId = Number(originalDoc?.id)
  if ((await homepageIDs(req)).has(pageId)) {
    throw new APIError(
      'A página inicial não pode sair do ar. Escolha outra página inicial antes.',
      400,
      null,
      true,
    )
  }
  return data
}
