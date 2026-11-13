// O que a biblioteca de fotos aceita. Vale no servidor (coleção e limite de envio) e no navegador,
// para avisar antes de enviar.

/** Lista fechada: `image/*` aceitaria SVG, que pode carregar script e fica público no bucket. */
export const PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const

export const PHOTO_MAX_BYTES = 10_000_000

/** Frase para a pessoa quando o arquivo não serve; `null` quando serve. */
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Este arquivo não é uma foto. Use JPG, PNG, WebP, AVIF ou GIF.'
  }
  if (file.size > PHOTO_MAX_BYTES) return 'Esta foto passa de 10 MB. Use uma foto menor.'
  return null
}

/** Nome que aparece para a foto: a descrição ou, sem ela, o nome do arquivo. */
export function photoLabel(photo: { alt?: string | null; filename?: string | null }): string {
  return photo.alt?.trim() || photo.filename || 'Foto'
}

/** "Foto-Praia (2).JPG" e "foto-praia-3.jpg" → "foto-praia": o nome sem extensão e sem o número
 * que o sistema põe no fim quando o nome se repete. */
const nameStem = (name: string) =>
  name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/(?<!\d)[\s_-]*\(?\d{1,4}\)?$/, '')

/**
 * A foto da biblioteca que parece ser o mesmo arquivo (mesmo tamanho em bytes e mesmo nome, fora o
 * número do fim), para avisar antes de enviar uma cópia (achado 9.5). `null` quando não há.
 */
export function samePhoto<T extends { filename?: string | null; filesize?: number | null }>(
  file: { name: string; size: number },
  library: readonly T[],
): T | null {
  const stem = nameStem(file.name)
  return (
    library.find(
      (photo) => photo.filesize === file.size && nameStem(photo.filename ?? '') === stem,
    ) ?? null
  )
}
