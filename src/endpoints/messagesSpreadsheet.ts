import type { Endpoint, PayloadHandler } from 'payload'

import { toFormDefinition } from '../lib/forms'
import { messageFields, messagesCsv } from '../lib/messages'
import { relationID } from '../lib/relations'

const LIMIT = 10000

/**
 * `GET /api/form-submissions/planilha?formulario=<id>`: baixa as mensagens do filtro atual em CSV.
 * Só para quem está logado; tudo é lido com o usuário (`overrideAccess: false`).
 */
const download: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) {
    return Response.json({ errors: [{ message: 'Entre no painel para baixar.' }] }, { status: 401 })
  }
  const access = { overrideAccess: false, user } as const
  const formId = Number(req.searchParams.get('formulario'))

  const [messages, forms] = await Promise.all([
    payload.find({
      collection: 'form-submissions',
      where: Number.isInteger(formId) && formId > 0 ? { form: { equals: formId } } : {},
      depth: 0,
      limit: LIMIT,
      pagination: false,
      sort: '-createdAt',
      ...access,
    }),
    payload.find({ collection: 'forms', depth: 0, pagination: false, limit: 500, ...access }),
  ])
  const pageIds = [...new Set(messages.docs.flatMap((doc) => relationID(doc.page) ?? []))]
  const pages = pageIds.length
    ? await payload.find({
        collection: 'pages',
        where: { id: { in: pageIds } },
        select: { title: true },
        depth: 0,
        draft: true,
        limit: pageIds.length,
        pagination: false,
        ...access,
      })
    : null
  const pageTitles = new Map(pages?.docs.map((page) => [page.id, page.title]))
  const definitions = new Map(forms.docs.map((form) => [form.id, toFormDefinition(form)]))

  const csv = messagesCsv(
    messages.docs.map((doc) => {
      const form = definitions.get(relationID(doc.form) ?? 0)
      return {
        createdAt: doc.createdAt,
        formTitle: form?.title ?? '',
        pageTitle: pageTitles.get(relationID(doc.page) ?? 0) ?? '',
        fields: messageFields(form, doc.submissionData),
        consentText: doc.consentText ?? '',
      }
    }),
  )
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="mensagens.csv"',
      'Cache-Control': 'no-store',
    },
  })
}

export const spreadsheetEndpoint: Endpoint = { path: '/planilha', method: 'get', handler: download }
