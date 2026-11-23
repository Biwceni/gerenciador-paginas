import type { Endpoint, PayloadRequest } from 'payload'
import { APIError, ValidationError } from 'payload'

import { applyPageTemplate, applySiteTemplate, type SiteClear } from '../lib/applyTemplate'
import { normalizeWhatsApp } from '../lib/links'
import { relationID } from '../lib/relations'
import { restoreSiteBackup } from '../lib/siteBackup'
import { cleanShows } from '../lib/siteShows'
import { validateSlug } from '../lib/slug'
import { PERSONALITIES, type Personality } from '../lib/theme'
import { composeSiteTemplate } from '../seed/templates/compose'

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

/** O básico do Começar (nome, frase, WhatsApp e cidade) e o que sai do site anterior (A8). */
function readAnswers(body: Record<string, unknown>) {
  const answers = {
    name: text(body.name, 80),
    tagline: text(body.tagline, 200),
    whatsapp: text(body.whatsapp, 30),
    city: text(body.city, 60),
  }
  const error = !answers.name
    ? 'Escreva o nome do site.'
    : !answers.city
      ? 'Escreva a cidade.'
      : answers.whatsapp && !normalizeWhatsApp(answers.whatsapp)
        ? 'Digite o WhatsApp com DDD. Ex.: (31) 99999-0000.'
        : null
  const raw = (body.clear ?? {}) as Record<string, unknown>
  const clear: SiteClear = {
    logo: raw.logo === true,
    social: raw.social === true,
    contact: raw.contact === true,
    seo: raw.seo === true,
  }
  return { answers, clear, error }
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
    const { answers, clear, error } = readAnswers(await readBody(req))
    if (error) return fail(error)

    const template = await findTemplate(req, 'site')
    if (!template) return fail('Modelo não encontrado.', 404)
    try {
      const result = await applySiteTemplate(req, template, answers, { clear })
      return Response.json(result)
    } catch (err) {
      return failFrom(req, err, 'Não deu para montar o site com o modelo')
    }
  },
}

/**
 * `POST /api/templates/montar` (F1): monta o "Site da empresa" pelo que ele precisa mostrar, com o
 * visual escolhido. O logo que fica (A8) leva junto as cores e as letras de hoje, que costumam ter
 * saído dele em Sua marca.
 */
export const composeSiteEndpoint: Endpoint = {
  path: '/montar',
  method: 'post',
  handler: async (req) => {
    if (req.user?.role !== 'admin') return fail('Só administradores podem montar o site.', 403)
    const body = await readBody(req)
    const { answers, clear, error } = readAnswers(body)
    if (error) return fail(error)
    const shows = cleanShows(body.shows)
    const personality = (PERSONALITIES as readonly string[]).includes(String(body.personality))
      ? (body.personality as Personality)
      : 'classico'

    const template = composeSiteTemplate({ shows, personality })
    try {
      const site = await req.payload.findGlobal({
        slug: 'site',
        depth: 0,
        draft: false,
        overrideAccess: false,
        req,
      })
      if (relationID(site.logo) && !clear.logo && site.colors?.primary && template.site) {
        template.site = { ...template.site, colors: site.colors, fonts: site.fonts }
      }
      const result = await applySiteTemplate(req, template, answers, { clear, shows })
      return Response.json(result)
    } catch (err) {
      return failFrom(req, err, 'Não deu para montar o site')
    }
  },
}

/**
 * `POST /api/site-backups/:id/voltar` (A8): volta para um site guardado antes de uma troca. O site
 * de agora vira uma cópia nova, então dá para desfazer do mesmo jeito.
 */
export const restoreBackupEndpoint: Endpoint = {
  path: '/:id/voltar',
  method: 'post',
  handler: async (req) => {
    if (req.user?.role !== 'admin') return fail('Só administradores podem trocar o site.', 403)
    const id = Number(req.routeParams?.id)
    if (!Number.isInteger(id)) return fail('Cópia não encontrada.', 404)
    try {
      return Response.json(await restoreSiteBackup(req, id))
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('As páginas deste site')) {
        return fail(err.message)
      }
      return failFrom(req, err, 'Não deu para voltar para o site anterior')
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
      const { doc, missingPhotos } = await applyPageTemplate(req, template, { title, slug })
      return Response.json({ doc: { id: doc.id }, missingPhotos })
    } catch (error) {
      return failFrom(req, error, 'Não deu para criar a página com o modelo')
    }
  },
}
