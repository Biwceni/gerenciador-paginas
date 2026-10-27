import type { CollectionBeforeDeleteHook, Payload, TypedUser } from 'payload'
import { APIError } from 'payload'

import { relationID } from '../lib/relations'
import { collectReferences } from '../puck/references'
import { parsePageContent } from '../puck/schema'

/** Onde uma foto aparece: páginas (pelo id e nome) e as Configurações do site. */
export type PhotoUse = { kind: 'page'; id: number; title: string } | { kind: 'settings' }

type Access = { overrideAccess: true } | { overrideAccess: false; user: TypedUser }

/**
 * Para cada foto, onde ela é usada: nas seções e na foto do Google das páginas (rascunho mais
 * recente e versão no ar) e no logo e na foto de compartilhar das Configurações. Versões antigas
 * não contam: voltar para uma delas mostra a seção sem a foto excluída.
 */
export async function photoUsage(
  payload: Payload,
  access: Access,
): Promise<Map<number, PhotoUse[]>> {
  const pageQuery = {
    collection: 'pages',
    select: { title: true, content: true, seo: true },
    depth: 0,
    limit: 500,
    pagination: false,
    ...access,
  } as const
  const [latest, live, siteLive, siteDraft] = await Promise.all([
    payload.find({ ...pageQuery, draft: true }),
    payload.find({ ...pageQuery, draft: false }),
    payload.findGlobal({ slug: 'site', depth: 0, draft: false, ...access }),
    payload.findGlobal({ slug: 'site', depth: 0, draft: true, ...access }),
  ])

  const usage = new Map<number, PhotoUse[]>()
  const add = (mediaId: number | null, use: PhotoUse) => {
    if (!mediaId) return
    const uses = usage.get(mediaId) ?? []
    const same = uses.some((item) =>
      item.kind === 'page' && use.kind === 'page' ? item.id === use.id : item.kind === use.kind,
    )
    if (!same) usage.set(mediaId, [...uses, use])
  }

  const titles = new Map(latest.docs.map((doc) => [doc.id, doc.title]))
  for (const doc of [...latest.docs, ...live.docs]) {
    const use: PhotoUse = { kind: 'page', id: doc.id, title: titles.get(doc.id) ?? doc.title }
    const content = parsePageContent(doc.content)
    if (content.success) {
      collectReferences(content.data.data).mediaIds.forEach((mediaId) => add(mediaId, use))
    }
    add(relationID(doc.seo?.image), use)
  }
  for (const site of [siteLive, siteDraft]) {
    add(relationID(site.logo), { kind: 'settings' })
    add(relationID(site.shareImage), { kind: 'settings' })
  }
  return usage
}

/** "Início, Sobre nós e as Configurações" */
export function describeUses(uses: PhotoUse[]): string {
  const names = uses.map((use) => (use.kind === 'page' ? use.title : 'as Configurações'))
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : (names[0] ?? '')
}

/**
 * Excluir foto em uso deixaria seções sem foto no site. A regra fica no servidor, como a das
 * páginas: primeiro tire a foto de onde ela aparece.
 */
export const protectPhotoDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const uses = (await photoUsage(req.payload, { overrideAccess: true })).get(Number(id))
  if (uses?.length) {
    throw new APIError(
      `Esta foto está em uso em ${describeUses(uses)}. Tire a foto de lá antes de excluir.`,
      400,
      null,
      true,
    )
  }
}
