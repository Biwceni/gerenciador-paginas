// Quais arquivos de fonte valem baixar antes de tudo, lidos do CSS que o servidor montou ao publicar
// as configurações (`buildFontFaceCSS` em `fonts.ts`): o da fonte dos títulos em negrito (700) e o
// da fonte do texto normal (400), os dois no conjunto "latin" (o do português sem acentos raros).

const LATIN_START = 'U+0000-00FF'

type Face = { family: string; style: string; weights: [number, number]; range: string; src: string }

function parseFaces(css: string): Face[] {
  const faces: Face[] = []
  for (const [, body] of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const read = (property: string) =>
      new RegExp(`${property}:\\s*([^;]+)`).exec(body)?.[1].trim() ?? ''
    const src = /url\(([^)\s]+\.woff2)\)/.exec(body)?.[1]
    const [min, max = min] = read('font-weight').split(/\s+/).map(Number)
    if (!src || !min) continue
    faces.push({
      family: read('font-family').replace(/^"|"$/g, ''),
      style: read('font-style'),
      weights: [min, max],
      range: read('unicode-range').toUpperCase(),
      src,
    })
  }
  return faces
}

export type FontFile = { href: string; origin: string }

/**
 * O arquivo latin de uma fonte no peso mais perto do pedido, ou nada (sem fontes copiadas ou sem a
 * fonte no CSS).
 */
export function latinFontFile(
  css: string | null | undefined,
  family: string | null | undefined,
  weight: number,
): FontFile | null {
  if (!css || !family?.trim()) return null
  const wanted = family.trim().toLowerCase()
  const latin = parseFaces(css).filter(
    (face) =>
      face.family.toLowerCase() === wanted &&
      face.style === 'normal' &&
      face.range.startsWith(LATIN_START),
  )
  const distance = ({ weights: [min, max] }: Face) =>
    weight < min ? min - weight : weight > max ? weight - max : 0
  const best = latin.sort((a, b) => distance(a) - distance(b))[0]
  if (!best) return null
  try {
    return { href: best.src, origin: new URL(best.src).origin }
  } catch {
    return null
  }
}

/**
 * Os arquivos a pré-carregar: título em negrito e texto normal (um só, se forem a mesma fonte e o
 * mesmo arquivo).
 */
export function preloadFontFiles(
  css: string | null | undefined,
  fonts: { headings?: string | null; body?: string | null } | null | undefined,
): FontFile[] {
  const headings = fonts?.headings || fonts?.body
  const files = [latinFontFile(css, headings, 700), latinFontFile(css, fonts?.body, 400)]
  return files.filter(
    (file, index): file is FontFile =>
      file !== null && files.findIndex((other) => other?.href === file.href) === index,
  )
}
