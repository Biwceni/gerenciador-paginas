import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'
import { APIError, ValidationError } from 'payload'

import { checkSubmission, CONSENT_TEXT, HONEYPOT_FIELD, toFormDefinition } from '../lib/forms'
import { relationID } from '../lib/relations'
import { FALLBACK_SITE_NAME, getServerURL, PRODUCT_NAME } from '../lib/site'

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
