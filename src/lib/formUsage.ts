import type { Payload, PayloadRequest, TypedUser } from 'payload'

import { collectReferences } from '../puck/references'
import { parsePageContent } from '../puck/schema'
import type { FormPage } from './forms'
import { pageTitle } from './pageTitle'

export { type FormPage, formPageName } from './forms'

export type FormUsage = Map<number, FormPage[]>

type Who =
  { overrideAccess: true; req: PayloadRequest } | { overrideAccess: false; user: TypedUser }

/**
 * Em que páginas cada formulário aparece, na versão mais recente (rascunho) ou na que está no ar: a
 * seção pode estar só numa das duas.
 */
export async function loadFormUsage(payload: Payload, who: Who): Promise<FormUsage> {
  const query = {
    collection: 'pages',
    select: { title: true, content: true, archived: true, _status: true },
    depth: 0,
    limit: 500,
    pagination: false,
    ...who,
  } as const
  const [latest, live] = await Promise.all([
    payload.find({ ...query, draft: true }),
    payload.find({ ...query, draft: false }),
  ])
  const titles = new Map(latest.docs.map((doc) => [doc.id, pageTitle(doc.title)]))
  const archived = new Set(latest.docs.filter((doc) => doc.archived).map((doc) => doc.id))
  const liveIds = new Set(
    live.docs.filter((doc) => doc._status === 'published').map((doc) => doc.id),
  )
  const state = (id: number): FormPage['state'] =>
    archived.has(id) ? 'archived' : liveIds.has(id) ? 'live' : 'draft'
  const usage: FormUsage = new Map()
  for (const doc of [...latest.docs, ...live.docs]) {
    const content = parsePageContent(doc.content)
    if (!content.success) continue
    for (const formId of collectReferences(content.data.data).formIds) {
      const pages = usage.get(formId) ?? []
      if (!pages.some((page) => page.id === doc.id)) {
        pages.push({
          id: doc.id,
          title: titles.get(doc.id) ?? pageTitle(doc.title),
          state: state(doc.id),
        })
      }
      usage.set(formId, pages)
    }
  }
  return usage
}
