import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  PayloadRequest,
} from 'payload'
import { APIError } from 'payload'

import type { Header } from '../payload-types'
import { isStaleVersion, PAGE_VERSION_HEADER } from '../lib/editor'
import { relationID } from '../lib/relations'
import { archivedSlug, isArchivedSlug, slugBeforeArchive } from '../lib/slug'

type HeaderLink = NonNullable<Header['items']>[number]['link']

/** Páginas que um cabeçalho cita (itens do menu e botão do topo), na ordem do menu. */
export function headerPageIds(header: Pick<Header, 'items' | 'button'>): number[] {
  const ids: number[] = []
  const add = (link: HeaderLink | undefined) => {
    const id = ['page', 'section'].includes(link?.kind ?? '') ? relationID(link?.page) : null
    if (id && !ids.includes(id)) ids.push(id)
  }
  header.items?.forEach((item) => add(item.link))
  add(header.button?.link)
  return ids
}

/**
 * Páginas citadas pelo menu e pelo botão do topo, no rascunho mais recente e no que está no ar.
 * A ordem é a do menu como está na tela "Menu e rodapé" (o rascunho), seguida das que só estão no
 * menu publicado.
 */
export async function menuPageOrder(req: PayloadRequest): Promise<number[]> {
  const versions = await Promise.all(
    [true, false].map((draft) =>
      req.payload.findGlobal({ slug: 'header', depth: 0, draft, overrideAccess: true, req }),
    ),
  )
  return [...new Set(versions.flatMap(headerPageIds))]
}

/** Páginas citadas pelo menu e pelo botão do topo, no que está no ar e no rascunho. */
export async function pagesInMenu(req: PayloadRequest): Promise<Set<number>> {
  return new Set(await menuPageOrder(req))
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
 *
 * O Payload converte `req.query` antes dos ganchos: o `draft` chega como booleano. Aceita também o
 * texto, caso a conversão mude.
 */
export const protectHomepageUnpublish: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || req.payloadAPI === 'local') return data
  const savingDraft = req.query?.draft === true || req.query?.draft === 'true'
  if (data._status !== 'draft' || savingDraft) return data
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

/**
 * O Payload não recusa um salvamento sobre uma versão mais nova: o editor de outra aba, ou de outra
 * pessoa, apagaria o que foi salvo aqui. O editor manda a data da versão em que está trabalhando, e
 * o `originalDoc` é sempre a versão mais recente, rascunho incluído (a mesma data que o Payload
 * devolve ao salvar). Quem não manda a data (o painel padrão, os scripts) segue como antes.
 */
export const rejectStaleSave: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const base = req.headers?.get(PAGE_VERSION_HEADER)
  if (operation === 'update' && base && isStaleVersion(base, originalDoc?.updatedAt)) {
    throw new APIError(
      'Esta página mudou em outra aba ou por outra pessoa. Recarregue para continuar.',
      409,
      null,
      true,
    )
  }
  return data
}

/** O link leva para a página (inteira ou uma seção dela). */
const linksToPage = (link: HeaderLink | undefined, pageId: number) =>
  ['page', 'section'].includes(link?.kind ?? '') && relationID(link?.page) === pageId

/** O cabeçalho sem os links para a página: itens do menu e, se for o caso, o botão do topo. */
export function headerWithoutPage(
  header: Pick<Header, 'notice' | 'items' | 'button'>,
  pageId: number,
): Pick<Header, 'notice' | 'items' | 'button'> | null {
  const items = header.items ?? []
  const kept = items.filter((item) => !linksToPage(item.link, pageId))
  const button = linksToPage(header.button?.link, pageId)
  if (kept.length === items.length && !button) return null
  return {
    notice: header.notice,
    items: kept,
    button: button ? { label: null, link: { kind: 'page', page: null } } : header.button,
  }
}

/**
 * Tira a página do menu e do botão do topo (A6: arquivar num passo só). Publica o menu do ar sem
 * ela e, se havia um rascunho do menu ainda não publicado, guarda de novo esse rascunho sem ela:
 * a mudança guardada não vai para o ar e nem se perde.
 */
export async function removePageFromHeader(req: PayloadRequest, pageId: number): Promise<void> {
  const [published, draft] = await Promise.all(
    [false, true].map((isDraft) =>
      req.payload.findGlobal({
        slug: 'header',
        depth: 0,
        draft: isDraft,
        overrideAccess: true,
        req,
      }),
    ),
  )
  const pendingDraft = draft._status === 'draft'
  const live = headerWithoutPage(published, pageId)
  if (live) {
    await req.payload.updateGlobal({
      slug: 'header',
      data: { ...live, _status: 'published' },
      overrideAccess: true,
      req,
    })
  }
  if (!pendingDraft) return
  const nextDraft = headerWithoutPage(draft, pageId) ?? (live ? draft : null)
  if (!nextDraft) return
  await req.payload.updateGlobal({
    slug: 'header',
    data: {
      notice: nextDraft.notice,
      items: nextDraft.items,
      button: nextDraft.button,
      _status: 'draft',
    },
    draft: true,
    overrideAccess: true,
    req,
  })
}

/**
 * Arquivar (fase v2): a página sai do site e da lista, guardada em "Arquivadas". As regras ficam
 * no servidor:
 * - página arquivada é sempre rascunho: publicar tira do arquivo;
 * - a página inicial não pode ser arquivada (o site ficaria sem início). O "Começar de novo com um
 *   modelo" troca a página inicial antes de arquivar as páginas antigas;
 * - A6: arquivar tira a página do menu e do botão do topo, e libera o endereço dela
 *   ("contato" vira "contato-arquivada-12"). Ao restaurar, ela volta para o endereço de antes se
 *   ninguém tiver pegado.
 */
export const archiveRules: CollectionBeforeChangeHook = async ({
  context,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (data._status === 'published') {
    data.archived = false
  }
  if (operation !== 'update') return data
  const pageId = Number(originalDoc?.id)
  const slug = typeof data.slug === 'string' ? data.slug : String(originalDoc?.slug ?? '')

  // Restaurar (ou publicar uma arquivada): o endereço de antes, se estiver livre.
  if (data.archived !== true && originalDoc?.archived === true && isArchivedSlug(slug)) {
    const before = slugBeforeArchive(slug)
    const { totalDocs } = await req.payload.count({
      collection: 'pages',
      where: { and: [{ slug: { equals: before } }, { id: { not_equals: pageId } }] },
      overrideAccess: true,
      req,
    })
    if (!totalDocs) data.slug = before
    return data
  }

  if (data.archived !== true || originalDoc?.archived === true) return data
  if (context.seedRecreate) return data
  if ((await homepageIDs(req)).has(pageId)) {
    throw new APIError(
      'A página inicial não pode ser arquivada. Escolha outra página inicial antes.',
      400,
      null,
      true,
    )
  }
  if ((await pagesInMenu(req)).has(pageId)) await removePageFromHeader(req, pageId)
  if (slug) data.slug = archivedSlug(slug, pageId)
  return data
}
