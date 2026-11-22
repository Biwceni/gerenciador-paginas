import { createHash, randomBytes } from 'crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises'
import path from 'path'

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * D2: onde ficam os arquivos dos formulários. No Supabase, um bucket privado (sem leitura pública:
 * só as chaves do servidor alcançam), com envio direto do navegador por um link assinado de 10
 * minutos e download por um link assinado de 5 minutos, que só o painel pede. Sem as variáveis do
 * Storage (no computador), os arquivos ficam numa pasta fora do público, `.form-files`.
 */

export const FILES_BUCKET = process.env.S3_FILES_BUCKET || 'arquivos-formularios'
/** Os arquivos são apagados sozinhos depois deste tempo. */
export const FILE_KEEP_DAYS = 90
/** Envio começado e nunca anexado a uma mensagem: apagado depois de um dia. */
export const PENDING_KEEP_HOURS = 24

const LOCAL_DIR = path.resolve(process.cwd(), '.form-files')

export const storageEnabled = () =>
  Boolean(
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET,
  )

let client: S3Client | null = null
function s3(): S3Client {
  client ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  })
  return client
}

/** Senha do envio: vai para o navegador; o banco só guarda o resumo dela. */
export const newToken = () => randomBytes(24).toString('base64url')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Nome do arquivo sem caminho nem símbolos estranhos (o original fica guardado à parte). */
export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'arquivo'
  const clean = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-80)
  return clean || 'arquivo'
}

export const fileKey = (formId: number, filename: string) =>
  `formulario-${formId}/${randomBytes(8).toString('hex')}-${safeFilename(filename)}`

const localPath = (key: string) => {
  const target = path.resolve(LOCAL_DIR, key)
  if (!target.startsWith(LOCAL_DIR + path.sep)) throw new Error('Caminho de arquivo inválido')
  return target
}

/** Link de envio: PUT direto ao bucket (ou, no computador, ao endpoint local). */
export async function uploadTarget(
  key: string,
  mimeType: string,
  size: number,
  local: string,
): Promise<{ url: string; headers: Record<string, string> }> {
  const headers: Record<string, string> = { 'Content-Type': mimeType }
  if (!storageEnabled()) return { url: local, headers }
  const url = await getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: FILES_BUCKET,
      Key: key,
      ContentType: mimeType,
      ContentLength: size,
    }),
    { expiresIn: 600, signableHeaders: new Set(['content-type', 'content-length']) },
  )
  return { url, headers }
}

/** Guarda o arquivo no computador (só sem o Storage). */
export async function writeLocal(key: string, body: Buffer) {
  const target = localPath(key)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, body)
}

export const readLocal = (key: string) => readFile(localPath(key))

/** O tamanho do arquivo guardado, ou `null` se ele não está lá. */
export async function storedSize(key: string): Promise<number | null> {
  try {
    if (!storageEnabled()) return (await stat(localPath(key))).size
    const head = await s3().send(new HeadObjectCommand({ Bucket: FILES_BUCKET, Key: key }))
    return head.ContentLength ?? null
  } catch {
    return null
  }
}

/** Link de 5 minutos para baixar (só o painel pede, com a pessoa logada). */
export async function downloadURL(key: string, filename: string): Promise<string> {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: FILES_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }),
    { expiresIn: 300 },
  )
}

export async function deleteStored(key: string) {
  if (!storageEnabled()) {
    await rm(localPath(key), { force: true })
    return
  }
  await s3().send(new DeleteObjectCommand({ Bucket: FILES_BUCKET, Key: key }))
}
