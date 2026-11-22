import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Payload,
  PayloadRequest,
} from 'payload'

import {
  deleteStored,
  FILE_KEEP_DAYS,
  hashToken,
  PENDING_KEEP_HOURS,
  storedSize,
} from '../lib/formFileStorage'
import { fileSizeText } from '../lib/forms'

/** O que o `checkFormSubmission` deixa para depois de a mensagem ganhar o id. */
export const FILES_CONTEXT = 'gpFormFiles'

/**
 * Confere os arquivos de um envio: cada um é do mesmo formulário e do mesmo campo, está pendente,
 * a senha bate e o arquivo chegou inteiro ao bucket. Devolve o texto que vai na mensagem
 * ("foto.jpg (1,2 MB)") por campo, ou a frase do problema.
 */
export async function verifyFormFiles(
  req: PayloadRequest,
  formId: number,
  files: { field: string; id: number; token: string }[],
): Promise<
  { ok: true; labels: Map<string, string>; ids: number[] } | { ok: false; message: string }
> {
  const labels = new Map<string, string>()
  const ids: number[] = []
  for (const file of files) {
    const doc = await req.payload.findByID({
      collection: 'form-files',
      id: file.id,
      depth: 0,
      disableErrors: true,
      overrideAccess: true,
      showHiddenFields: true,
      req,
    })
    const formOfDoc = typeof doc?.form === 'object' ? doc?.form?.id : doc?.form
    if (
      !doc ||
      formOfDoc !== formId ||
      doc.field !== file.field ||
      doc.status !== 'pending' ||
      doc.tokenHash !== hashToken(file.token)
    ) {
      return { ok: false, message: 'Envie o arquivo de novo: o envio anterior não vale mais.' }
    }
    const size = await storedSize(doc.key)
    if (size !== doc.size) {
      return { ok: false, message: 'O arquivo não terminou de chegar. Envie de novo.' }
    }
    labels.set(file.field, `${doc.filename} (${fileSizeText(doc.size)})`)
    ids.push(doc.id)
  }
  return { ok: true, labels, ids }
}

/** Depois de guardar a mensagem: os arquivos dela deixam de ser pendentes. */
export const attachFormFiles: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc
  const ids = (req.context?.[FILES_CONTEXT] as number[] | undefined) ?? []
  for (const id of ids) {
    await req.payload.update({
      collection: 'form-files',
      id,
      data: { status: 'attached', submission: doc.id },
      overrideAccess: true,
      req,
    })
  }
  return doc
}

/** Mensagem apagada: os arquivos dela também. */
export const deleteSubmissionFiles: CollectionAfterDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'form-files',
    where: { submission: { equals: id } },
    overrideAccess: true,
    req,
  })
}

/** Registro apagado: o arquivo sai do bucket. */
export const deleteStoredFile: CollectionAfterDeleteHook = async ({ doc, req }) => {
  try {
    if (doc?.key) await deleteStored(doc.key)
  } catch (error) {
    req.payload.logger.error({ err: error }, 'Não deu para apagar o arquivo do formulário')
  }
}

/**
 * Limpeza: arquivos com mais de 90 dias e envios pendentes com mais de um dia. Apaga no máximo
 * `limit` de cada vez (a tarefa diária pega o resto). Devolve quantos saíram.
 */
export async function cleanupFormFiles(
  payload: Payload,
  req?: PayloadRequest,
  limit = 200,
): Promise<number> {
  const now = Date.now()
  const old = new Date(now - FILE_KEEP_DAYS * 86_400_000).toISOString()
  const stale = new Date(now - PENDING_KEEP_HOURS * 3_600_000).toISOString()
  const expired = await payload.find({
    collection: 'form-files',
    where: {
      or: [
        { createdAt: { less_than: old } },
        { and: [{ status: { equals: 'pending' } }, { createdAt: { less_than: stale } }] },
      ],
    },
    select: { status: true },
    depth: 0,
    limit,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (!expired.docs.length) return 0
  const result = await payload.delete({
    collection: 'form-files',
    where: { id: { in: expired.docs.map((doc) => doc.id) } },
    overrideAccess: true,
    req,
  })
  return result.docs.length
}
