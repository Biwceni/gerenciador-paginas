import type {
  CollectionAfterDeleteHook,
  CollectionAfterOperationHook,
  PayloadRequest,
} from 'payload'

// Rascunho sem página (B9 v2). Uma versão cuja página foi apagada fica com `parent` vazio. Lida com
// `draft: true`, o Payload a devolve como se fosse a página mais recente, com o número vazio: ela
// aparecia em Páginas, nos seletores, na contagem e no Painel, e "Editar" levava a /editor/null.

type Listed = { id?: unknown }

/** Tira das listas de páginas o que não é página (sem número). Vale para o painel e para a API. */
export const hideOrphanVersions: CollectionAfterOperationHook = ({ operation, result }) => {
  if (operation !== 'find' || !result || !('docs' in result)) return result
  const docs = result.docs as Listed[]
  const real = docs.filter((doc) => typeof doc.id === 'number' || typeof doc.id === 'string')
  if (real.length === docs.length) return result
  return {
    ...result,
    docs: real,
    totalDocs: Math.max(0, result.totalDocs - (docs.length - real.length)),
  }
}

/**
 * Depois de apagar uma página, confere se sobrou alguma versão dela e apaga (o vínculo do banco já
 * é "em cascata"; isto cobre o banco que ainda não rodou a migração).
 */
export const deleteLeftoverVersions: CollectionAfterDeleteHook = async ({ id, req }) => {
  await req.payload.db.deleteVersions({
    collection: 'pages',
    where: { parent: { equals: id } },
    req,
  })
}

export type OrphanDraft = {
  id: string
  title: string
  updatedAt: string
  /** Uma linha por seção (o título dela, ou o tipo), para "Ver o conteúdo". */
  sections: string[]
}

type Section = { type?: string; props?: Record<string, unknown> }

/** O título de uma seção, para ler sem abrir: o primeiro texto curto que ela tem. */
function sectionLine(section: Section): string {
  const props = section.props ?? {}
  for (const key of ['title', 'heading', 'label', 'text']) {
    const value = props[key]
    if (typeof value === 'string' && value.trim()) {
      const line = value.replace(/\s+/g, ' ').trim()
      return `${section.type ?? 'Seção'} · ${line.length > 80 ? `${line.slice(0, 79)}…` : line}`
    }
  }
  return section.type ?? 'Seção'
}

/** Versões sem página, uma por página perdida (a mais recente de cada), da mais nova à mais velha. */
export async function findOrphanDrafts(req: PayloadRequest): Promise<OrphanDraft[]> {
  const { docs } = await req.payload.db.findVersions({
    collection: 'pages',
    where: { parent: { exists: false } },
    sort: '-updatedAt',
    limit: 50,
    pagination: false,
    req,
  })
  return docs
    .filter((doc) => (doc as { latest?: boolean }).latest !== false)
    .map((doc) => {
      const version = doc.version as {
        title?: string
        content?: { data?: { content?: Section[] } }
      }
      return {
        id: String(doc.id),
        title: version.title?.trim() || 'Página sem nome',
        updatedAt: String(doc.updatedAt),
        sections: (version.content?.data?.content ?? []).slice(0, 30).map(sectionLine),
      }
    })
}
