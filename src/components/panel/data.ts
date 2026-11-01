import type { Payload, TypedUser } from 'payload'
import { cache } from 'react'

import { exampleTexts, findExampleSections, isExamplePhoto } from '@/lib/examples'
import { type FormDefinition, toFormDefinition } from '@/lib/forms'
import {
  messageDate,
  messageEmail,
  type MessageField,
  messageFields,
  messageMailto,
  messagePreview,
  messageSender,
  messageWhatsApp,
  UNREAD,
} from '@/lib/messages'
import { type FinishInput, NOT_ARCHIVED, pageStatus, type PageStatus, timeAgo } from '@/lib/panel'
import { relationID } from '@/lib/relations'
import type { FormSubmission } from '@/payload-types'
import { pageHref, pagePhotoIds } from '@/puck/references'
import { parsePageContent } from '@/puck/schema'

export type PageRow = {
  id: number
  title: string
  slug: string
  path: string
  status: PageStatus
  home: boolean
  /** Guardada em "Arquivadas": fora do site, do menu e da contagem de páginas. */
  archived: boolean
  updatedAt: string
}

/**
 * Páginas como o painel mostra: rascunho mais recente (nome e data) e se a página está no ar, da
 * mais recente para a mais antiga. Inclui as arquivadas (`archived`).
 * Lido com o usuário logado (`overrideAccess: false`), como qualquer tela do painel.
 */
export async function loadPageRows(payload: Payload, user: TypedUser): Promise<PageRow[]> {
  const access = { overrideAccess: false, user } as const
  const [latest, live, site] = await Promise.all([
    payload.find({
      collection: 'pages',
      select: { title: true, slug: true, _status: true, archived: true, updatedAt: true },
      depth: 0,
      draft: true,
      limit: 500,
      pagination: false,
      sort: '-updatedAt',
      ...access,
    }),
    payload.find({
      collection: 'pages',
      where: { _status: { equals: 'published' } },
      select: { title: true },
      depth: 0,
      draft: false,
      limit: 500,
      pagination: false,
      ...access,
    }),
    payload.findGlobal({ slug: 'site', depth: 0, draft: false, ...access }),
  ])
  const liveIds = new Set(live.docs.map((doc) => doc.id))
  const homepageId = relationID(site.homepage)

  return latest.docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    path: pageHref(doc, homepageId),
    status: pageStatus(doc._status, liveIds.has(doc.id)),
    home: doc.id === homepageId,
    archived: Boolean(doc.archived),
    updatedAt: doc.updatedAt,
  }))
}

/** Textos dos modelos gravados, para achar o que ainda é exemplo. */
export async function loadExampleTexts(payload: Payload, user: TypedUser): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'templates',
    select: { pages: true },
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user,
  })
  return exampleTexts(docs)
}

/**
 * O que o cartão "Para terminar seu site" precisa. Vale o que a pessoa está editando (o rascunho
 * mais recente de cada página fora de "Arquivadas") e as configurações que estão no ar. `pageOrder`
 * é a ordem da tela Páginas: a primeira com texto de exemplo é a que o botão abre.
 */
export async function loadFinishInput(
  payload: Payload,
  user: TypedUser,
  pageOrder: PageRow[],
): Promise<FinishInput> {
  const access = { overrideAccess: false, user } as const
  const [latest, photos, site, texts] = await Promise.all([
    payload.find({
      collection: 'pages',
      where: NOT_ARCHIVED,
      select: { content: true, seo: true },
      depth: 0,
      draft: true,
      limit: 500,
      pagination: false,
      ...access,
    }),
    payload.find({
      collection: 'media',
      select: { sourceUrl: true },
      depth: 0,
      limit: 1000,
      pagination: false,
      ...access,
    }),
    payload.findGlobal({ slug: 'site', depth: 0, draft: false, ...access }),
    loadExampleTexts(payload, user),
  ])

  const examplePhotos = new Set(photos.docs.filter(isExamplePhoto).map((photo) => photo.id))
  const withTexts = new Set<number>()
  let examplePhotoPages = 0
  for (const doc of latest.docs) {
    const content = parsePageContent(doc.content)
    const used = pagePhotoIds(content.success ? content.data.data : null, doc.seo?.image)
    if (used.some((id) => examplePhotos.has(id))) examplePhotoPages++
    if (content.success && findExampleSections(content.data.data, texts).length) {
      withTexts.add(doc.id)
    }
  }

  const home = pageOrder.find((page) => page.home)
  return {
    tagline: site.tagline,
    whatsapp: site.contact?.whatsapp,
    email: site.contact?.email,
    examplePages: pageOrder
      .filter((page) => withTexts.has(page.id))
      .map(({ id, title }) => ({ id, title })),
    examplePhotoPages,
    home: home ? { id: home.id, live: home.status !== 'draft' } : null,
  }
}

export type PendingGlobal = { slug: 'site' | 'header' | 'footer'; label: string }

const GLOBAL_LABELS: Record<PendingGlobal['slug'], string> = {
  site: 'Configurações',
  header: 'Menu do topo',
  footer: 'Rodapé',
}

/** Configurações, topo e rodapé com mudança salva e ainda não publicada. */
export async function loadPendingGlobals(
  payload: Payload,
  user: TypedUser,
): Promise<PendingGlobal[]> {
  const slugs = Object.keys(GLOBAL_LABELS) as PendingGlobal['slug'][]
  const drafts = await Promise.all(
    slugs.map((slug) =>
      payload.findGlobal({ slug, depth: 0, draft: true, overrideAccess: false, user }),
    ),
  )
  return slugs
    .filter((_, index) => drafts[index]._status === 'draft')
    .map((slug) => ({ slug, label: GLOBAL_LABELS[slug] }))
}

/** Número de não lidas: o menu e a barra de topo pedem na mesma tela, e a conta é uma só. */
export const countUnreadMessages = cache(async (payload: Payload, user: TypedUser) => {
  const { totalDocs } = await payload.count({
    collection: 'form-submissions',
    where: UNREAD,
    overrideAccess: false,
    user,
  })
  return totalDocs
})

export async function countMessagesByForm(
  payload: Payload,
  user: TypedUser,
  formIds: number[],
): Promise<Map<number, number>> {
  const counts = await Promise.all(
    formIds.map((id) =>
      payload.count({
        collection: 'form-submissions',
        where: { form: { equals: id } },
        overrideAccess: false,
        user,
      }),
    ),
  )
  return new Map(formIds.map((id, index) => [id, counts[index].totalDocs]))
}

export type InboxMessage = {
  id: number
  sender: string
  formTitle: string
  pageTitle: string
  preview: string
  /** "há 5 min". Vem pronto do servidor, para o navegador desenhar o mesmo texto. */
  ago: string
  date: string
  createdAt: string
  read: boolean
  fields: MessageField[]
  consentText: string
  whatsappHref: string | null
  emailHref: string | null
}

function toInboxMessage(
  doc: FormSubmission,
  forms: Map<number, FormDefinition>,
  pageTitles: Map<number, string>,
): InboxMessage {
  const form = forms.get(relationID(doc.form) ?? 0)
  const fields = messageFields(form, doc.submissionData)
  const sender = messageSender(fields)
  const email = messageEmail(fields)
  return {
    id: doc.id,
    sender,
    formTitle: form?.title ?? 'Formulário',
    pageTitle: pageTitles.get(relationID(doc.page) ?? 0) ?? '',
    preview: messagePreview(fields, sender),
    ago: timeAgo(doc.createdAt),
    date: messageDate(doc.createdAt),
    createdAt: doc.createdAt,
    read: doc.read !== false,
    fields,
    consentText: doc.consentText ?? '',
    whatsappHref: messageWhatsApp(fields, sender),
    emailHref: email ? messageMailto(email) : null,
  }
}

async function toInboxMessages(
  payload: Payload,
  user: TypedUser,
  docs: FormSubmission[],
  forms: Map<number, FormDefinition>,
): Promise<InboxMessage[]> {
  const pageIds = [...new Set(docs.flatMap((doc) => relationID(doc.page) ?? []))]
  const pages = pageIds.length
    ? await payload.find({
        collection: 'pages',
        where: { id: { in: pageIds } },
        select: { title: true },
        depth: 0,
        draft: true,
        limit: pageIds.length,
        pagination: false,
        overrideAccess: false,
        user,
      })
    : null
  const titles = new Map((pages?.docs ?? []).map((page) => [page.id, page.title]))
  return docs.map((doc) => toInboxMessage(doc, forms, titles))
}

async function loadFormDefinitions(payload: Payload, user: TypedUser) {
  const { docs } = await payload.find({
    collection: 'forms',
    select: { title: true, fields: true },
    depth: 0,
    limit: 200,
    pagination: false,
    sort: 'title',
    overrideAccess: false,
    user,
  })
  return new Map(docs.map((form) => [form.id, toFormDefinition(form)]))
}

const INBOX_LIMIT = 200

export type InboxData = {
  messages: InboxMessage[]
  /** Há mais mensagens do que a lista mostra. */
  more: boolean
  /** Total do site, sem o filtro. */
  total: number
  /** Só os formulários que já receberam mensagem. */
  filters: { id: number; title: string; count: number }[]
}

/**
 * Caixa de entrada, da mais nova para a mais antiga. A mensagem aberta (`openId`) vai junto mesmo
 * fora do filtro ou do limite, para o link do e-mail e o Ler do Painel sempre abrirem.
 */
export async function loadInbox(
  payload: Payload,
  user: TypedUser,
  { formId, openId }: { formId: number | null; openId: number | null },
): Promise<InboxData> {
  const access = { overrideAccess: false, user } as const
  const forms = await loadFormDefinitions(payload, user)
  const [list, counts, opened] = await Promise.all([
    payload.find({
      collection: 'form-submissions',
      where: formId ? { form: { equals: formId } } : {},
      depth: 0,
      limit: INBOX_LIMIT,
      sort: '-createdAt',
      ...access,
    }),
    countMessagesByForm(payload, user, [...forms.keys()]),
    openId
      ? payload.findByID({
          collection: 'form-submissions',
          id: openId,
          depth: 0,
          disableErrors: true,
          ...access,
        })
      : null,
  ])
  const docs = [...list.docs]
  if (opened && !docs.some((doc) => doc.id === opened.id)) docs.push(opened)
  return {
    messages: await toInboxMessages(payload, user, docs, forms),
    more: list.hasNextPage,
    total: [...counts.values()].reduce((sum, count) => sum + count, 0),
    filters: [...forms.values()].flatMap((form) => {
      const count = counts.get(form.id) ?? 0
      return count ? [{ id: form.id, title: form.title || 'Formulário', count }] : []
    }),
  }
}

const NEWEST_UNREAD = 3

/** As não lidas mais novas, para o cartão do Painel. */
export async function loadUnreadMessages(payload: Payload, user: TypedUser) {
  const { docs, totalDocs } = await payload.find({
    collection: 'form-submissions',
    where: UNREAD,
    depth: 0,
    limit: NEWEST_UNREAD,
    sort: '-createdAt',
    overrideAccess: false,
    user,
  })
  if (!docs.length) return { total: 0, messages: [] }
  const forms = await loadFormDefinitions(payload, user)
  return { total: totalDocs, messages: await toInboxMessages(payload, user, docs, forms) }
}
