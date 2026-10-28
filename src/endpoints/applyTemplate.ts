import type { Endpoint, PayloadRequest } from 'payload'
import { APIError, ValidationError } from 'payload'

import { applyPageTemplate, applySiteTemplate } from '../lib/applyTemplate'
import { normalizeWhatsApp } from '../lib/links'
import { validateSlug } from '../lib/slug'

const fail = (message: string, status = 400) => Response.json({ errors: [{ message }] }, { status })

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

async function readBody(req: PayloadRequest) {
  return ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
}

async function findTemplate(req: PayloadRequest, kind: 'site' | 'page') {
  const id = Number(req.routeParams?.id)
  if (!Number.isInteger(id)) return null
  const template = await req.payload
    .findByID({ collection: 'templates', id, depth: 0, overrideAccess: false, req })
    .catch(() => null)
  return template?.kind === kind ? template : null
}

/** Erro do Payload com mensagem para a pessoa (validação, regra do servidor) ou genérico. */
function failFrom(req: PayloadRequest, error: unknown, what: string) {
  if (error instanceof ValidationError) {
    const issue = error.data?.errors?.[0]
    return fail(issue?.message ?? error.message)
  }
  if (error instanceof APIError && error.isPublic) return fail(error.message, error.status)
  req.payload.logger.error({ err: error }, what)
  return fail('Não deu para terminar agora. Tente de novo em alguns minutos.', 500)
}

/**
 * `POST /api/templates/:id/aplicar`: monta o site com um modelo de site (início guiado). Só
 * administrador, porque troca a página inicial, o menu, o rodapé e as cores do site todo.
 */
export const applyTemplateEndpoint: Endpoint = {
  path: '/:id/aplicar',
  method: 'post',
  handler: async (req) => {
    if (req.user?.role !== 'admin') return fail('Só administradores podem montar o site.', 403)
    const body = await readBody(req)
    const name = text(body.name, 80)
    const tagline = text(body.tagline, 200)
    const whatsapp = text(body.whatsapp, 30)
    if (!name) return fail('Escreva o nome do site.')
    if (whatsapp && !normalizeWhatsApp(whatsapp)) {
      return fail('Digite o WhatsApp com DDD. Ex.: (31) 99999-0000.')
    }

    const template = await findTemplate(req, 'site')
    if (!template) return fail('Modelo não encontrado.', 404)
    try {
      const result = await applySiteTemplate(req, template, { name, tagline, whatsapp })
      return Response.json(result)
    } catch (error) {
      return failFrom(req, error, 'Não deu para montar o site com o modelo')
    }
  },
}

/** `POST /api/templates/:id/pagina`: página nova (rascunho) a partir de um modelo de página. */
export const templatePageEndpoint: Endpoint = {
  path: '/:id/pagina',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return fail('Entre no painel para criar páginas.', 401)
    const body = await readBody(req)
    const title = text(body.title, 80)
    const slug = text(body.slug, 80)
    if (!title) return fail('Escreva o nome da página.')
    const slugCheck = validateSlug(slug)
    if (slugCheck !== true) return fail(slugCheck)

    const template = await findTemplate(req, 'page')
    if (!template) return fail('Modelo não encontrado.', 404)
    try {
      const doc = await applyPageTemplate(req, template, { title, slug })
      return Response.json({ doc: { id: doc.id } })
    } catch (error) {
      return failFrom(req, error, 'Não deu para criar a página com o modelo')
    }
  },
}
