import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
} from 'payload'
import { APIError, ValidationError } from 'payload'

import { checkSubmission, CONSENT_TEXT, HONEYPOT_FIELD, toFormDefinition } from '../lib/forms'
import { relationID } from '../lib/relations'
import { collectReferences } from '../puck/references'
import { parsePageContent } from '../puck/schema'
import { FALLBACK_SITE_NAME, getServerURL, PRODUCT_NAME } from '../lib/site'

// Limite de mensagens no site todo. Cada uma manda um e-mail, e a cota do Resend é a mesma da
// recuperação de senha e do convite: uma enxurrada de envios não pode esgotá-la.
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 20

type SubmissionData = {
  form?: unknown
  submissionData?: { field?: unknown; value?: unknown }[] | null
  consent?: boolean | null
  consentText?: string | null
}

/**
 * Antes de guardar uma mensagem enviada pelo site (o visitante pode mandar qualquer coisa pela
 * API): descarta robôs, exige a caixa de "Concordo" (LGPD) e confere os campos com o formulário.
 * Só o que o formulário pede é guardado.
 */
export const checkFormSubmission: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const submission = data as SubmissionData

  const trap = submission.submissionData?.find((item) => item?.field === HONEYPOT_FIELD)
  if (typeof trap?.value === 'string' && trap.value.trim()) {
    throw new APIError('Não deu para enviar a mensagem.', 400, null, true)
  }

  const { totalDocs: recent } = await req.payload.count({
    collection: 'form-submissions',
    where: { createdAt: { greater_than: new Date(Date.now() - RATE_WINDOW_MS).toISOString() } },
    overrideAccess: true,
    req,
  })
  if (recent >= RATE_LIMIT) {
    throw new APIError(
      'Chegaram muitas mensagens agora. Tente de novo em alguns minutos.',
      429,
      null,
      true,
    )
  }

  if (submission.consent !== true) {
    throw new ValidationError({
      collection: 'form-submissions',
      errors: [{ path: 'consent', message: 'Marque que concorda com o uso dos seus dados.' }],
      req,
    })
  }

  const formId = relationID(submission.form as number | { id: number } | null)
  const form = formId
    ? await req.payload.findByID({
        collection: 'forms',
        id: formId,
        depth: 0,
        disableErrors: true,
        overrideAccess: true,
        req,
      })
    : null
  if (!form) throw new APIError('Este formulário não existe mais.', 400, null, true)

  const result = checkSubmission(toFormDefinition(form), submission.submissionData)
  if (!result.ok) throw new APIError(result.message, 400, null, true)

  submission.submissionData = result.data
  submission.consentText = CONSENT_TEXT
  return submission
}

/**
 * Formulário que está numa seção de página (rascunho mais recente ou no ar) não pode ser excluído:
 * a seção ficaria sem campos e sem aviso no site.
 */
export const protectFormDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const formId = Number(id)
  const query = {
    collection: 'pages',
    select: { title: true, content: true },
    depth: 0,
    limit: 500,
    pagination: false,
    overrideAccess: true,
    req,
  } as const
  const [latest, live] = await Promise.all([
    req.payload.find({ ...query, draft: true }),
    req.payload.find({ ...query, draft: false }),
  ])
  const titles = new Map(latest.docs.map((doc) => [doc.id, doc.title]))
  const using = new Set<number>()
  for (const doc of [...latest.docs, ...live.docs]) {
    const content = parsePageContent(doc.content)
    if (content.success && collectReferences(content.data.data).formIds.includes(formId)) {
      using.add(doc.id)
    }
  }
  if (using.size) {
    const names = [...using].map((pageId) => `“${titles.get(pageId) ?? pageId}”`).join(', ')
    throw new APIError(
      `Este formulário está na página ${names}. Tire a seção de lá antes de excluir.`,
      400,
      null,
      true,
    )
  }
}

const escapeHTML = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

/**
 * Aviso de mensagem nova por e-mail, para o e-mail de contato das Configurações (ou, sem ele, para
 * os administradores). Se o e-mail falhar, a mensagem já está guardada na lista do painel.
 */
export const notifyNewMessage: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc
  try {
    const { payload } = req
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true, req })
    let to = site.contact?.email ? [site.contact.email] : []
    if (!to.length) {
      const admins = await payload.find({
        collection: 'users',
        where: { role: { equals: 'admin' } },
        select: { email: true },
        depth: 0,
        limit: 10,
        pagination: false,
        overrideAccess: true,
        req,
      })
      to = admins.docs.map((admin) => admin.email)
    }
    if (!to.length) return doc

    const formId = relationID(doc.form)
    const form = formId
      ? await payload.findByID({
          collection: 'forms',
          id: formId,
          depth: 0,
          disableErrors: true,
          overrideAccess: true,
          req,
        })
      : null
    const definition = form ? toFormDefinition(form) : null
    const label = (name: string) =>
      definition?.fields.find((field) => field.name === name)?.label ?? name
    const rows = ((doc.submissionData ?? []) as { field: string; value: string }[])
      .map(
        (item) =>
          `<tr><td style="padding: 6px 12px 6px 0; color: #5a6660; vertical-align: top;">${escapeHTML(label(item.field))}</td><td style="padding: 6px 0; white-space: pre-wrap;">${escapeHTML(item.value)}</td></tr>`,
      )
      .join('')
    const replyTo = (doc.submissionData as { field: string; value: string }[]).find(
      (item) => definition?.fields.find((field) => field.name === item.field)?.type === 'email',
    )?.value
    const siteName = site.name || FALLBACK_SITE_NAME
    const listURL = `${getServerURL()}/admin/collections/form-submissions/${doc.id}`

    await payload.sendEmail({
      to,
      replyTo,
      subject: `Mensagem nova pelo site ${siteName}${form?.title ? ` (${form.title})` : ''}`,
      html: `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.5;">
    <p>Chegou uma mensagem pelo formulário${form?.title ? ` “${escapeHTML(form.title)}”` : ''} do site.</p>
    <table style="border-collapse: collapse;">${rows}</table>
    <p>Ela também fica guardada no painel: <a href="${listURL}">ver a mensagem</a>.</p>
    ${replyTo ? '<p>Para responder, é só responder a este e-mail.</p>' : ''}
    <p style="color: #5a6660; font-size: 13px;">Enviado pelo ${PRODUCT_NAME}.</p>
  </body>
</html>`,
    })
  } catch (error) {
    req.payload.logger.error({ err: error }, 'Não deu para avisar da mensagem nova por e-mail')
  }
  return doc
}
