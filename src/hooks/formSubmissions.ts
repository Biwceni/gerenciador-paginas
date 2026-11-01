import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
} from 'payload'
import { APIError, ValidationError } from 'payload'

import {
  assignFieldNames,
  checkSubmission,
  CONSENT_TEXT,
  EMAIL,
  formNotifyEmail,
  HONEYPOT_FIELD,
  notifyTarget,
  toFormDefinition,
} from '../lib/forms'
import { loadFormUsage } from '../lib/formUsage'
import { panelHref } from '../lib/panel'
import { relationID } from '../lib/relations'
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
 * Antes de guardar um formulário: nome técnico que nasce uma vez só (`assignFieldNames`), largura
 * sempre 100 e e-mail do aviso conferido.
 */
export const prepareForm: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  if (!data) return data
  if (Array.isArray(data.fields)) {
    data.fields = assignFieldNames(data.fields, originalDoc?.fields).map((field) => ({
      ...field,
      width: 100,
    }))
  }
  const email = formNotifyEmail(data)
  if (email && !EMAIL.test(email)) {
    throw new ValidationError({
      collection: 'forms',
      errors: [{ path: 'emails', message: 'Confira o e-mail do aviso. Ex.: maria@seunegocio.com' }],
      req,
    })
  }
  return data
}

/**
 * Formulário que está numa seção de página (rascunho mais recente ou no ar) não pode ser excluído:
 * a seção ficaria sem campos e sem aviso no site. Com mensagens guardadas, também não: elas apontam
 * para o formulário e perderiam os rótulos.
 */
export const protectFormDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const formId = Number(id)
  const usage = await loadFormUsage(req.payload, { overrideAccess: true, req })
  const using = usage.get(formId)
  if (using?.length) {
    const names = using.map((page) => `“${page.title}”`).join(', ')
    throw new APIError(
      `Este formulário está na página ${names}. Tire a seção de lá antes de excluir.`,
      400,
      null,
      true,
    )
  }
  const { totalDocs } = await req.payload.count({
    collection: 'form-submissions',
    where: { form: { equals: formId } },
    overrideAccess: true,
    req,
  })
  if (totalDocs) {
    throw new APIError(
      `Este formulário tem ${totalDocs === 1 ? '1 mensagem guardada' : `${totalDocs} mensagens guardadas`}. Exclua em Mensagens antes.`,
      400,
      null,
      true,
    )
  }
}

const escapeHTML = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

/**
 * Aviso de mensagem nova por e-mail: para o e-mail do formulário ou, vazio, para o das
 * Configurações (sem nenhum dos dois, para os administradores). Se o e-mail falhar, a mensagem já
 * está guardada na lista do painel.
 */
export const notifyNewMessage: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc
  try {
    const { payload } = req
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true, req })
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
    const target = notifyTarget(form, site.contact?.email)
    let to = target ? [target] : []
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
    const listURL = `${getServerURL()}${panelHref(payload.config.routes.admin, 'messages')}?mensagem=${doc.id}`

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
