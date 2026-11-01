'use client'

import { request } from '@/components/editor/api'
import type { Media } from '@/payload-types'

/** Endereço do plugin de Storage que assina o envio (`serverHandlerPath` do `s3Storage`). */
const SIGNED_URL_PATH = '/storage-s3-generate-signed-url'

/** Parte da barra que vai para o envio do arquivo; o resto é o servidor gravando a foto. */
const SENDING_SHARE = 90

type SignedUpload = {
  clientUploadContext: { prefix?: string; signedReceipt: string }
  filename?: string
  headers: Record<string, string>
  url: string
}

type Progress = (percent: number) => void

/** XHR no lugar de `fetch`: é o único jeito de saber quanto do arquivo já foi. */
function send(
  method: 'POST' | 'PUT',
  url: string,
  body: Blob | FormData,
  headers: Record<string, string>,
  onProgress: Progress,
) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)
    xhr.upload.onprogress = ({ lengthComputable, loaded, total }) => {
      if (lengthComputable) onProgress(Math.round((loaded / total) * SENDING_SHARE))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(xhr.responseText)
        : reject(new Error(`Erro ${xhr.status}`))
    xhr.onerror = () => reject(new Error('Falha na conexão'))
    xhr.send(body)
  })
}

const documentBody = (file: Blob | string) => {
  const body = new FormData()
  // Descrição vazia, não ausente: a descrição é escrita depois, em cada foto.
  body.append('_payload', JSON.stringify({ alt: '' }))
  body.append('file', file)
  return body
}

/**
 * Envia uma foto e devolve a foto criada na biblioteca.
 *
 * `direct` (com o Storage ligado): o mesmo caminho da gaveta do Payload (`clientUploads`), porque a
 * função da Vercel recusa corpo acima de ~4,5 MB. O servidor assina o envio, o arquivo vai direto
 * do navegador para o Storage, e a foto é criada com o recibo da assinatura. O código é o do
 * `S3ClientUploadHandler`, menos o `fetch`. **Ao atualizar o Payload, conferir este caminho.**
 *
 * Sem o Storage (só no computador), o arquivo vai para a própria API.
 */
export async function uploadPhoto(
  apiRoute: string,
  file: File,
  direct: boolean,
  onProgress: Progress,
): Promise<Media> {
  const url = `${apiRoute}/media`
  if (!direct) {
    return JSON.parse(await send('POST', url, documentBody(file), {}, onProgress)).doc
  }

  const signed = await request<SignedUpload>(apiRoute, SIGNED_URL_PATH, {
    method: 'POST',
    body: JSON.stringify({
      collectionSlug: 'media',
      filename: file.name,
      filesize: file.size,
      mimeType: file.type,
    }),
  })
  // O navegador põe o tamanho sozinho e recusa quem tenta definir este cabeçalho.
  const { 'Content-Length': _length, ...headers } = signed.headers
  await send('PUT', signed.url, file, headers, onProgress)

  const { clientUploadContext, filename } = signed
  const reference = JSON.stringify({
    clientUploadContext: {
      prefix: clientUploadContext.prefix,
      signedReceipt: clientUploadContext.signedReceipt,
    },
    collectionSlug: 'media',
    filename: filename ?? file.name,
    mimeType: file.type,
    size: file.size,
  })
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: documentBody(reference),
  })
  if (!response.ok) throw new Error(`Erro ${response.status}`)
  return ((await response.json()) as { doc: Media }).doc
}
