import type { PayloadRequest } from 'payload'
import { commitTransaction, initTransaction, killTransaction } from 'payload'

import type { Page, Site, Template } from '../payload-types'
import { collectReferences } from '../puck/references'
import { emptyPageContent, parsePageContent, type PuckPageData } from '../puck/schema'
import { relationID } from './relations'
import { slugify, uniqueSlug } from './slug'
import { isTemplatePhotoURL, remapTemplateContent, type TemplateIds } from './templates'

// Aplicar um modelo (fase 4): copia as fotos para a biblioteca, cria os formulários e as páginas e,
// no modelo de site, troca as configurações, o menu e o rodapé. Chamado pelos endpoints em
// `src/endpoints/applyTemplate.ts`, sempre com o usuário da requisição (`overrideAccess: false`),
// menos onde o comentário diz o contrário.

const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}
const PHOTO_LIMIT = 10_000_000

async function downloadPhoto(url: string) {
  // O endereço já é conferido ao salvar o modelo; aqui de novo, e sem seguir redirecionamento,
  // para o servidor nunca buscar nada fora dos bancos de fotos.
  if (!isTemplatePhotoURL(url)) throw new Error('Endereço de foto fora do Pexels e do Unsplash')
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`O banco de fotos respondeu ${response.status}`)
  const mimetype = response.headers.get('content-type')?.split(';')[0].trim() ?? ''
  if (!PHOTO_TYPES[mimetype]) throw new Error(`Tipo de arquivo inesperado: ${mimetype}`)
  const data = Buffer.from(await response.arrayBuffer())
  if (data.length > PHOTO_LIMIT) throw new Error('Foto maior que 10 MB')
  return { data, mimetype, size: data.length }
}

/**
 * Copia para a biblioteca as fotos do modelo que as páginas usam, uma vez cada: a foto já copiada
 * antes (mesmo endereço) é reaproveitada. Foto que não deu para copiar fica de fora (id 0): o
 * lugar dela fica vazio na página, o resto do modelo segue e `missing` conta quantas faltaram,
 * para a tela avisar.
 */
export async function copyTemplatePhotos(
  req: PayloadRequest,
  template: Pick<Template, 'pages' | 'photos'>,
): Promise<{ ids: number[]; missing: number }> {
  const used = new Set(
    (template.pages ?? []).flatMap((page) => collectReferences(templateContent(page)).mediaIds),
  )
  const list = (template.photos ?? []).map((photo, index) => (used.has(index + 1) ? photo : null))
  const urls = list.flatMap((photo) => (photo ? [photo.url] : []))
  if (!urls.length) return { ids: list.map(() => 0), missing: 0 }

  const { docs } = await req.payload.find({
    collection: 'media',
    where: { sourceUrl: { in: urls } },
    depth: 0,
    pagination: false,
    overrideAccess: false,
    req,
  })
  const copied = new Map(docs.map((doc) => [doc.sourceUrl, doc.id]))

  const fail = (error: unknown, url: string) => {
    req.payload.logger.error({ err: error, url }, 'Não deu para copiar a foto do modelo')
    return null
  }
  // Baixa em paralelo; grava uma de cada vez (gravações juntas no mesmo `req` dividiriam a
  // mesma transação, e a primeira a terminar fecharia a das outras).
  const files = await Promise.all(
    list.map((photo) =>
      !photo || copied.has(photo.url)
        ? null
        : downloadPhoto(photo.url).catch((e) => fail(e, photo.url)),
    ),
  )
  const ids: number[] = []
  for (const [index, photo] of list.entries()) {
    const file = files[index]
    if (photo && file && !copied.has(photo.url)) {
      try {
        const doc = await req.payload.create({
          collection: 'media',
          data: { alt: photo.alt, sourceUrl: photo.url },
          file: { ...file, name: `${slugify(photo.alt) || 'foto'}.${PHOTO_TYPES[file.mimetype]}` },
          // O `sourceUrl` só é escrito pelo servidor (o campo é fechado para a API).
          overrideAccess: true,
          req,
        })
        copied.set(photo.url, doc.id)
      } catch (error) {
        fail(error, photo.url)
      }
    }
    ids.push((photo && copied.get(photo.url)) || 0)
  }
  return { ids, missing: list.filter((photo, index) => photo && !ids[index]).length }
}

async function createTemplateForms(req: PayloadRequest, template: Template): Promise<number[]> {
  const ids: number[] = []
  for (const form of template.forms ?? []) {
    const doc = await req.payload.create({
      collection: 'forms',
      data: {
        title: form.title,
        submitButtonLabel: form.submitButtonLabel,
        fields: (form.fields ?? []).map((field) => ({
          blockType: field.type,
          name: field.name,
          label: field.label,
          required: Boolean(field.required),
          width: 100,
        })),
      },
      overrideAccess: false,
      req,
    })
    ids.push(doc.id)
  }
  return ids
}

function templateContent(page: NonNullable<Template['pages']>[number]): PuckPageData {
  const result = parsePageContent(page.content)
  if (!result.success)
    throw new Error(`O modelo tem uma página num formato inválido: ${page.title}`)
  return result.data.data
}

/**
 * Põe o que a pessoa escreveu na abertura da página: no banner, o título (nome da página nova) e a
 * frase; na lista de links (página de links), o nome do site e a frase.
 */
function personalizeOpening(data: PuckPageData, change: { title?: string; text?: string }) {
  const opening = data.content.find((item) => item.type === 'Hero' || item.type === 'LinkList')
  if (opening?.type !== 'Hero' && opening?.type !== 'LinkList') return
  if (change.title) opening.props.title = change.title
  if (change.text) opening.props.text = change.text
}

type TemplateLink = {
  kind?: 'page' | 'section' | 'whatsapp' | 'url' | null
  page?: number | null
  section?: string | null
  url?: string | null
}

function headerLink(link: TemplateLink | null | undefined, pageIds: number[]) {
  const kind = link?.kind ?? 'whatsapp'
  if (kind === 'url') return { kind, url: link?.url ?? '' }
  if (kind === 'page' || kind === 'section') {
    const page = pageIds[(link?.page ?? 0) - 1]
    if (!page) return { kind: 'whatsapp' as const }
    return kind === 'section' ? { kind, page, section: link?.section ?? '' } : { kind, page }
  }
  return { kind: 'whatsapp' as const }
}

export type SiteAnswers = { name: string; tagline: string; whatsapp: string }

/**
 * Configurações do site depois de aplicar um modelo. Do modelo vêm só as cores e as letras: a
 * frase, o endereço e o horário de exemplo nunca viram dado real (em branco, ficam em branco, e o
 * painel lembra a pessoa de preencher). O resto vem do que está no ar, e o WhatsApp respondido
 * troca o de hoje. Vão todos os campos: o Payload completa o que faltar com o último rascunho, e
 * uma mudança não publicada das Configurações iria para o ar junto.
 */
export function templateSiteData(
  site: Pick<Site, 'logo' | 'social' | 'seoDescription' | 'shareImage' | 'contact'>,
  sample: Template['site'],
  answers: SiteAnswers,
  homepage: number,
) {
  return {
    logo: relationID(site.logo),
    social: site.social,
    seoDescription: site.seoDescription,
    shareImage: relationID(site.shareImage),
    name: answers.name,
    tagline: answers.tagline || null,
    homepage,
    colors: sample?.colors,
    fonts: sample?.fonts,
    contact: {
      ...site.contact,
      whatsapp: answers.whatsapp || site.contact?.whatsapp || null,
      address: site.contact?.address || null,
      hours: site.contact?.hours || null,
    },
    _status: 'published' as const,
  }
}

/**
 * Monta o site a partir de um modelo. No primeiro início guiado (nenhuma página fora de
 * "Arquivadas"), as páginas nascem como rascunho e o site só entra no ar quando a pessoa publicar a
 * inicial. No "Começar de novo", as páginas novas entram já no ar e as que já existiam vão para
 * "Arquivadas" (saem do ar, com o conteúdo guardado). Nos dois casos, configurações, menu e rodapé
 * são publicados com os valores do modelo. O contato de hoje fica, e o e-mail (para onde vão os
 * avisos de mensagem) nunca muda.
 */
export async function applySiteTemplate(
  req: PayloadRequest,
  template: Template,
  answers: SiteAnswers,
): Promise<{ homepage: number; pages: number[]; missingPhotos: number }> {
  // Fora da transação: copiar foto leva tempo e o arquivo vai para o Storage de qualquer jeito.
  const { ids: photos, missing: missingPhotos } = await copyTemplatePhotos(req, template)

  const shouldCommit = await initTransaction(req)
  try {
    const forms = await createTemplateForms(req, template)
    const access = { overrideAccess: false, req } as const

    const { docs: existing } = await req.payload.find({
      collection: 'pages',
      depth: 0,
      draft: true,
      pagination: false,
      ...access,
    })
    const taken = existing.map((page) => page.slug)
    const firstSite = existing.every((page) => page.archived)

    // Primeiro cria todas (os links entre elas precisam dos ids), depois põe o conteúdo.
    const created: Page[] = []
    for (const page of template.pages ?? []) {
      const slug = uniqueSlug(page.slug, taken)
      taken.push(slug)
      created.push(
        await req.payload.create({
          collection: 'pages',
          data: {
            title: page.title,
            slug,
            campaign: Boolean(page.campaign),
            content: emptyPageContent(),
            _status: 'draft',
          },
          draft: true,
          ...access,
        }),
      )
    }
    const ids: TemplateIds = { pages: created.map((page) => page.id), photos, forms }
    for (const [index, page] of (template.pages ?? []).entries()) {
      const data = remapTemplateContent(templateContent(page), ids)
      if (index === 0) {
        const linkPage = data.content[0]?.type === 'LinkList'
        personalizeOpening(data, {
          title: linkPage ? answers.name : undefined,
          text: answers.tagline || undefined,
        })
      }
      await req.payload.update({
        collection: 'pages',
        id: ids.pages[index],
        data: {
          content: { version: emptyPageContent().version, data },
          _status: firstSite ? 'draft' : 'published',
        },
        draft: firstSite,
        ...access,
      })
    }

    const site = await req.payload.findGlobal({ slug: 'site', depth: 0, draft: false, ...access })
    await req.payload.updateGlobal({
      slug: 'site',
      data: templateSiteData(site, template.site, answers, ids.pages[0]),
      ...access,
    })

    const header = template.header
    await req.payload.updateGlobal({
      slug: 'header',
      data: {
        items: (header?.items ?? []).map((item) => ({
          label: item.label,
          link: headerLink(item.link, ids.pages),
        })),
        button: header?.button?.label
          ? { label: header.button.label, link: headerLink(header.button.link, ids.pages) }
          : { label: null, link: { kind: 'page', page: null } },
        _status: 'published',
      },
      ...access,
    })
    const footer = template.footer
    await req.payload.updateGlobal({
      slug: 'footer',
      data: {
        text: footer?.text ?? null,
        showMenu: footer?.showMenu !== false,
        showContact: footer?.showContact !== false,
        showSocial: footer?.showSocial !== false,
        _status: 'published',
      },
      ...access,
    })

    // A página inicial e o menu já são os novos, então as páginas antigas podem ir para
    // "Arquivadas" (as regras de `archiveRules` recusam arquivar a inicial e as do menu). Vai o
    // rascunho mais recente inteiro, para as mudanças não publicadas não se perderem (como o
    // "Arquivar" do painel).
    for (const page of existing.filter((doc) => !doc.archived)) {
      await req.payload.update({
        collection: 'pages',
        id: page.id,
        data: {
          title: page.title,
          slug: page.slug,
          campaign: page.campaign,
          content: page.content,
          seo: { ...page.seo, image: relationID(page.seo?.image) },
          archived: true,
          _status: 'draft',
        },
        ...access,
      })
    }

    if (shouldCommit) await commitTransaction(req)
    return { homepage: ids.pages[0], pages: ids.pages, missingPhotos }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}

/**
 * Página nova (rascunho) a partir de um modelo de página. O título da abertura vira o nome da
 * página; botões que levariam a outra página do modelo levam ao WhatsApp.
 */
export async function applyPageTemplate(
  req: PayloadRequest,
  template: Template,
  page: { title: string; slug: string },
): Promise<{ doc: Page; missingPhotos: number }> {
  const source = template.pages?.[0]
  if (!source) throw new Error('O modelo não tem página.')
  const { ids: photos, missing: missingPhotos } = await copyTemplatePhotos(req, template)

  const shouldCommit = await initTransaction(req)
  try {
    const forms = await createTemplateForms(req, template)
    const data = remapTemplateContent(templateContent(source), { pages: [], photos, forms })
    personalizeOpening(data, { title: page.title })
    const doc = await req.payload.create({
      collection: 'pages',
      data: {
        title: page.title,
        slug: page.slug,
        campaign: Boolean(source.campaign),
        content: { version: emptyPageContent().version, data },
        _status: 'draft',
      },
      draft: true,
      overrideAccess: false,
      req,
    })
    if (shouldCommit) await commitTransaction(req)
    return { doc, missingPhotos }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}
