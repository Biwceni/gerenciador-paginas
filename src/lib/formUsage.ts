import type { Payload, PayloadRequest, TypedUser } from 'payload'

import { collectReferences } from '../puck/references'
import { parsePageContent } from '../puck/schema'

export type FormUsage = Map<number, { id: number; title: string }[]>

type Who =
  { overrideAccess: true; req: PayloadRequest } | { overrideAccess: false; user: TypedUser }

/**
 * Em que páginas cada formulário aparece, na versão mais recente (rascunho) ou na que está no ar: a
 * seção pode estar só numa das duas.
 */
export async function loadFormUsage(payload: Payload, who: Who): Promise<FormUsage> {
  const query = {
    collection: 'pages',
    select: { title: true, content: true },
    depth: 0,
    limit: 500,
    pagination: false,
    ...who,
  } as const
  const [latest, live] = await Promise.all([
    payload.find({ ...query, draft: true }),
    payload.find({ ...query, draft: false }),
  ])
  const titles = new Map(latest.docs.map((doc) => [doc.id, doc.title]))
  const usage: FormUsage = new Map()
  for (const doc of [...latest.docs, ...live.docs]) {
    const content = parsePageContent(doc.content)
    if (!content.success) continue
    for (const formId of collectReferences(content.data.data).formIds) {
      const pages = usage.get(formId) ?? []
      if (!pages.some((page) => page.id === doc.id)) {
        pages.push({ id: doc.id, title: titles.get(doc.id) ?? doc.title })
      }
      usage.set(formId, pages)
    }
  }
  return usage
}
