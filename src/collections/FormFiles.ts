import type { CollectionConfig, PayloadHandler } from 'payload'

import { authenticated } from '../access/authenticated'
import { cleanupFormFiles, deleteStoredFile } from '../hooks/formFiles'
import { checkFile, toFormDefinition } from '../lib/forms'
import {
  downloadURL,
  fileKey,
  hashToken,
  newToken,
  readLocal,
  storageEnabled,
  uploadTarget,
  writeLocal,
} from '../lib/formFileStorage'

// Envios começados no site todo em 10 minutos: acima disso, o próximo espera.
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 40

const error = (message: string, status = 400) =>
  Response.json({ errors: [{ message }] }, { status })

/**
 * `POST /api/form-files/enviar`: o visitante escolheu um arquivo. Confere o formulário, o tipo e o
 * tamanho, guarda o registro (pendente) e devolve o link de envio direto e a senha do envio, que
 * vai junto com a mensagem para provar que o arquivo é dele.
 */
const start: PayloadHandler = async (req) => {
  const { payload } = req
  const body = ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
  const formId = Number(body.form)
  const field = typeof body.field === 'string' ? body.field : ''
  const name = typeof body.name === 'string' ? body.name.slice(0, 200) : ''
  const type = typeof body.type === 'string' ? body.type.slice(0, 120) : ''
  const size = Number(body.size)
  if (!Number.isInteger(formId) || !field || !name || !Number.isFinite(size)) {
    return error('Não deu para enviar o arquivo. Tente de novo.')
  }
  const form = await payload.findByID({
    collection: 'forms',
    id: formId,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
    req,
  })
  const definition = form ? toFormDefinition(form) : null
  const target = definition?.fields.find((item) => item.name === field && item.type === 'file')
  if (!target) return error('Este formulário não recebe arquivo aqui.')
  const check = checkFile({ name, type, size }, target.accept ?? 'photo')
  if (check !== true) return error(check)

  const { totalDocs: recent } = await payload.count({
    collection: 'form-files',
    where: { createdAt: { greater_than: new Date(Date.now() - RATE_WINDOW_MS).toISOString() } },
    overrideAccess: true,
    req,
  })
  if (recent >= RATE_LIMIT) {
    return error('Chegaram muitos arquivos agora. Tente de novo em alguns minutos.', 429)
  }

  const token = newToken()
  const key = fileKey(formId, name)
  const mimeType = type || 'application/octet-stream'
  const doc = await payload.create({
    collection: 'form-files',
    data: {
      form: formId,
      field,
      filename: name,
      mimeType,
      size,
      key,
      tokenHash: hashToken(token),
      status: 'pending',
    },
    overrideAccess: true,
    req,
  })
  const upload = await uploadTarget(
    key,
    mimeType,
    size,
    `/api/form-files/${doc.id}/local?senha=${encodeURIComponent(token)}`,
  )
  return Response.json({ id: doc.id, token, ...upload })
}

/** `PUT /api/form-files/:id/local`: só no computador, sem o Storage. Guarda o arquivo na pasta. */
const putLocal: PayloadHandler = async (req) => {
  if (storageEnabled()) return error('Não encontrado.', 404)
  const id = Number(req.routeParams?.id)
  const token = req.searchParams.get('senha') ?? ''
  const doc = Number.isInteger(id)
    ? await req.payload.findByID({
        collection: 'form-files',
        id,
        depth: 0,
        disableErrors: true,
        overrideAccess: true,
        showHiddenFields: true,
        req,
      })
    : null
  if (!doc || doc.status !== 'pending' || doc.tokenHash !== hashToken(token)) {
    return error('Envio não encontrado.', 404)
  }
  const body = Buffer.from((await req.arrayBuffer?.()) ?? new ArrayBuffer(0))
  if (body.length !== doc.size) return error('O arquivo chegou pela metade. Tente de novo.')
  await writeLocal(doc.key, body)
  return new Response(null, { status: 200 })
}

/**
 * `GET /api/form-files/:id/baixar`: só para quem está logado no painel. Leva a um link de 5
 * minutos do bucket privado (no computador, entrega o arquivo da pasta). Sem login: 401.
 */
const download: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return error('Entre no painel para abrir o arquivo.', 401)
  const id = Number(req.routeParams?.id)
  const doc = Number.isInteger(id)
    ? await payload.findByID({
        collection: 'form-files',
        id,
        depth: 0,
        disableErrors: true,
        overrideAccess: false,
        showHiddenFields: true,
        user,
        req,
      })
    : null
  if (!doc || doc.status !== 'attached') {
    return error('Este arquivo não existe mais. Os arquivos são apagados depois de 90 dias.', 404)
  }
  if (storageEnabled()) {
    return Response.redirect(await downloadURL(doc.key, doc.filename), 302)
  }
  try {
    const body = await readLocal(doc.key)
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return error('Este arquivo não existe mais.', 404)
  }
}

/**
 * `GET /api/form-files/limpeza`: apaga os arquivos com mais de 90 dias (e os envios que nunca
 * viraram mensagem). Chamado todo dia pela tarefa agendada da Vercel (com o `CRON_SECRET`) ou por
 * um administrador logado. A cada mensagem nova, a mesma limpeza também roda.
 */
const cleanup: PayloadHandler = async (req) => {
  const secret = process.env.CRON_SECRET
  const fromCron = Boolean(secret) && req.headers.get('authorization') === `Bearer ${secret}`
  const isAdmin = (req.user as { role?: string } | null)?.role === 'admin'
  if (!fromCron && !isAdmin) return error('Sem permissão.', 401)
  const deleted = await cleanupFormFiles(req.payload, req)
  return Response.json({ deleted })
}

/**
 * D2: arquivos enviados pelos formulários do site. O arquivo fica no bucket privado; aqui, só o
 * registro (quem enviou por qual formulário, nome, tipo e tamanho). Só o painel lê e apaga.
 */
export const FormFiles: CollectionConfig = {
  slug: 'form-files',
  labels: { singular: 'Arquivo de formulário', plural: 'Arquivos de formulários' },
  access: {
    read: authenticated,
    create: () => false,
    update: () => false,
    delete: authenticated,
  },
  admin: { hidden: true, useAsTitle: 'filename' },
  endpoints: [
    { path: '/enviar', method: 'post', handler: start },
    { path: '/limpeza', method: 'get', handler: cleanup },
    { path: '/:id/local', method: 'put', handler: putLocal },
    { path: '/:id/baixar', method: 'get', handler: download },
  ],
  hooks: {
    afterDelete: [deleteStoredFile],
  },
  fields: [
    { name: 'form', type: 'relationship', relationTo: 'forms', label: 'Formulário' },
    { name: 'field', type: 'text', label: 'Campo', required: true },
    { name: 'filename', type: 'text', label: 'Nome do arquivo', required: true },
    { name: 'mimeType', type: 'text', label: 'Tipo' },
    { name: 'size', type: 'number', label: 'Tamanho (bytes)', required: true },
    { name: 'key', type: 'text', required: true, admin: { hidden: true } },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      hidden: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { value: 'pending', label: 'Enviando' },
        { value: 'attached', label: 'Na mensagem' },
      ],
    },
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'form-submissions',
      label: 'Mensagem',
    },
  ],
}
