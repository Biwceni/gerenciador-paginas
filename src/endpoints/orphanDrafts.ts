import type { Endpoint, PayloadRequest } from 'payload'
import { APIError, ValidationError } from 'payload'

import { findOrphanDrafts } from '../hooks/orphanVersions'
import { uniqueSlug } from '../lib/slug'

// Rascunho que ficou sem página (B9 v2): o aviso de Páginas lista, recupera como página nova (em
// rascunho, nunca no ar) ou apaga de vez. Tudo conferido aqui: quem não pode apagar páginas não vê.

const fail = (message: string, status = 400) => Response.json({ errors: [{ message }] }, { status })

/** Quem pode criar e apagar páginas (a mesma regra da coleção). */
export async function canFixOrphans(req: PayloadRequest) {
  if (!req.user) return false
  const access = req.payload.collections.pages.config.access
  const [canCreate, canDelete] = await Promise.all([
    access.create?.({ req }),
    access.delete?.({ req }),
  ])
  return Boolean(canCreate) && Boolean(canDelete)
}

async function findOrphan(req: PayloadRequest) {
  const id = Number(req.routeParams?.id)
  if (!Number.isInteger(id)) return null
  const { docs } = await req.payload.db.findVersions({
    collection: 'pages',
    where: { and: [{ id: { equals: id } }, { parent: { exists: false } }] },
    limit: 1,
    req,
  })
  return docs[0] ?? null
}

function failFrom(req: PayloadRequest, error: unknown) {
  if (error instanceof ValidationError)
    return fail(error.data?.errors?.[0]?.message ?? error.message)
  if (error instanceof APIError && error.isPublic) return fail(error.message, error.status)
  req.payload.logger.error({ err: error }, 'Rascunho sem página')
  return fail('Não deu para terminar agora. Tente de novo.', 500)
}

/** `GET /api/pages/rascunhos-sem-pagina`: os rascunhos sem página, do mais novo ao mais velho. */
export const listOrphanDrafts: Endpoint = {
  path: '/rascunhos-sem-pagina',
  method: 'get',
  handler: async (req) => {
    if (!(await canFixOrphans(req))) return Response.json({ docs: [] })
    return Response.json({ docs: await findOrphanDrafts(req) })
  },
}

/**
 * `POST /api/pages/rascunhos-sem-pagina/:id/recuperar`: cria uma página nova, em rascunho, com o
 * conteúdo do rascunho perdido. O endereço ganha "-2" se já for de outra página.
 */
export const recoverOrphanDraft: Endpoint = {
  path: '/rascunhos-sem-pagina/:id/recuperar',
  method: 'post',
  handler: async (req) => {
    if (!(await canFixOrphans(req))) return fail('Você não pode criar páginas.', 403)
    const orphan = await findOrphan(req)
    if (!orphan) return fail('Este rascunho não existe mais.', 404)
    const version = orphan.version as {
      title?: string
      slug?: string
      content?: unknown
      seo?: unknown
      campaign?: boolean
    }
    try {
      const { docs } = await req.payload.find({
        collection: 'pages',
        draft: true,
        select: { slug: true },
        depth: 0,
        limit: 1000,
        pagination: false,
        overrideAccess: false,
        req,
      })
      const title = (version.title?.trim() || 'Página recuperada').slice(0, 80)
      const doc = await req.payload.create({
        collection: 'pages',
        draft: true,
        data: {
          title,
          slug: uniqueSlug(
            version.slug || title,
            docs.map((page) => page.slug ?? ''),
          ),
          content: version.content as never,
          seo: version.seo as never,
          campaign: Boolean(version.campaign),
          _status: 'draft',
        },
        overrideAccess: false,
        req,
      })
      await req.payload.db.deleteVersions({
        collection: 'pages',
        where: { id: { equals: orphan.id } },
        req,
      })
      return Response.json({ doc: { id: doc.id, title: doc.title } })
    } catch (error) {
      return failFrom(req, error)
    }
  },
}

/** `DELETE /api/pages/rascunhos-sem-pagina/:id`: apaga de vez (a tela pede confirmação antes). */
export const deleteOrphanDraft: Endpoint = {
  path: '/rascunhos-sem-pagina/:id',
  method: 'delete',
  handler: async (req) => {
    if (!(await canFixOrphans(req))) return fail('Você não pode apagar páginas.', 403)
    const orphan = await findOrphan(req)
    if (!orphan) return Response.json({ ok: true })
    try {
      await req.payload.db.deleteVersions({
        collection: 'pages',
        where: { id: { equals: orphan.id } },
        req,
      })
      return Response.json({ ok: true })
    } catch (error) {
      return failFrom(req, error)
    }
  },
}
