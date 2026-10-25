import { createHash } from 'crypto'

import { slugify } from './slug'
import { fontStorageConfigured, uploadFontFile } from './storage'

// O Google só entrega woff2 (o formato menor) para navegadores atuais.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// Português usa só estes dois conjuntos de letras; os outros (cirílico, grego...) seriam peso à toa.
const SUBSETS = new Set(['latin', 'latin-ext'])

const FONT_FILE_HOST = 'https://fonts.gstatic.com/'

export class FontNotFoundError extends Error {
  constructor(public fontName: string) {
    super(`Fonte não encontrada no Google Fonts: ${fontName}`)
  }
}

type FontFace = {
  family: string
  style: string
  weight: string
  unicodeRange: string
  src: string
}

const titleCase = (name: string) => name.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())

async function fetchGoogleCSS(family: string): Promise<string | null> {
  const encoded = family.trim().replace(/\s+/g, '+')
  // Regular e negrito; algumas fontes só têm um peso, então tenta também sem pedir pesos.
  for (const query of [`${encoded}:wght@400;700`, encoded]) {
    const response = await fetch(`https://fonts.googleapis.com/css2?family=${query}&display=swap`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    })
    if (response.ok) return response.text()
    if (response.status !== 400) {
      throw new Error(`Google Fonts respondeu ${response.status} para ${family}`)
    }
  }
  return null
}

/** Lê o CSS do Google, conferindo cada valor: o CSS final é montado por nós, não copiado. */
export function parseGoogleCSS(css: string, family: string): FontFace[] {
  const faces: FontFace[] = []
  for (const [, subset, body] of css.matchAll(
    /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g,
  )) {
    if (!SUBSETS.has(subset)) continue
    const read = (property: string) =>
      new RegExp(`${property}:\\s*([^;]+);`).exec(body)?.[1].trim() ?? ''
    const src = /url\((https:\/\/fonts\.gstatic\.com\/[^)\s]+\.woff2)\)/.exec(body)?.[1]
    const style = read('font-style')
    const weight = read('font-weight')
    const unicodeRange = read('unicode-range')
    if (
      src &&
      /^(normal|italic)$/.test(style) &&
      /^\d{3}( \d{3})?$/.test(weight) &&
      /^[Uu+0-9A-Fa-f?,\s-]+$/.test(unicodeRange)
    ) {
      faces.push({ family, style, weight, unicodeRange, src })
    }
  }
  return faces
}

export function buildFontFaceCSS(faces: FontFace[]): string {
  return faces
    .map(
      (face) =>
        `@font-face{font-family:"${face.family}";font-style:${face.style};font-weight:${face.weight};font-display:swap;src:url(${face.src}) format("woff2");unicode-range:${face.unicodeRange}}`,
    )
    .join('\n')
}

/** Copia os arquivos para o nosso Storage, para o visitante não baixar nada do Google (LGPD). */
async function copyToStorage(faces: FontFace[]): Promise<FontFace[]> {
  // Sem o bucket de fontes (só no computador), usa os arquivos do Google mesmo.
  if (!fontStorageConfigured()) return faces

  const copied = new Map<string, string>()
  for (const face of faces) {
    if (copied.has(face.src) || !face.src.startsWith(FONT_FILE_HOST)) continue
    const response = await fetch(face.src, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error(`Não deu para baixar a fonte ${face.family}`)
    const file = new Uint8Array(await response.arrayBuffer())
    const hash = createHash('sha256').update(file).digest('hex').slice(0, 16)
    copied.set(face.src, await uploadFontFile(`${slugify(face.family)}/${hash}.woff2`, file))
  }
  return faces.map((face) => ({ ...face, src: copied.get(face.src) ?? face.src }))
}

/**
 * Prepara as fontes escolhidas: confere o nome no Google Fonts (com e sem maiúsculas), copia os
 * arquivos e devolve o CSS `@font-face` e o nome certo de cada fonte.
 */
export async function prepareFonts(
  names: string[],
): Promise<{ css: string; resolved: Record<string, string> }> {
  const resolved: Record<string, string> = {}
  const faces: FontFace[] = []

  for (const name of [...new Set(names.map((n) => n.trim()).filter(Boolean))]) {
    let family = name
    let css = await fetchGoogleCSS(family)
    if (!css && titleCase(name) !== name) {
      family = titleCase(name)
      css = await fetchGoogleCSS(family)
    }
    const parsed = css ? parseGoogleCSS(css, family) : []
    if (!parsed.length) throw new FontNotFoundError(name)
    resolved[name] = family
    faces.push(...parsed)
  }

  return { css: buildFontFaceCSS(await copyToStorage(faces)), resolved }
}
