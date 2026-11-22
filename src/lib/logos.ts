/**
 * Faixa de logos (C5): todos com o mesmo tamanho visual e sem a sobra em volta.
 *
 * - A sobra (fundo branco ou transparente em volta do desenho) é medida no editor, quando o
 *   logo entra na seção (`measureTrim`), e fica guardada como a parte útil da foto (`trim`).
 * - O tamanho: a mesma área para todos. Um logo comprido fica baixo e largo, um quadrado fica mais
 *   alto, e nenhum parece maior que o outro (`logoBox`).
 */

export type Trim = { x: number; y: number; w: number; h: number }

/** Área de cada logo no computador, em px² (um logo quadrado fica com 60 × 60). */
export const LOGO_AREA = 3600
const MAX_WIDTH = 180
const MAX_HEIGHT = 72
const MIN_SIDE = 16

/** Proporção da parte útil do logo (largura ÷ altura). */
export function logoRatio(width: number, height: number, trim?: Trim | null): number {
  const w = width * (trim?.w ?? 1)
  const h = height * (trim?.h ?? 1)
  return w > 0 && h > 0 ? w / h : 1
}

/** Largura e altura do logo no computador, em px, para a área ficar igual entre todos. */
export function logoBox(ratio: number): { width: number; height: number } {
  let height = Math.sqrt(LOGO_AREA / ratio)
  let width = height * ratio
  if (width > MAX_WIDTH) {
    width = MAX_WIDTH
    height = width / ratio
  }
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT
    width = height * ratio
  }
  return {
    width: Math.round(Math.max(width, MIN_SIDE)),
    height: Math.round(Math.max(height, MIN_SIDE)),
  }
}

/**
 * Onde a foto inteira fica, em %, dentro da caixa do logo recortado: maior que a caixa e puxada
 * para a esquerda e para cima, para só a parte útil aparecer.
 */
export function trimStyle(trim?: Trim | null): {
  width: string
  height: string
  left: string
  top: string
} | null {
  if (!trim || trim.w <= 0 || trim.h <= 0) return null
  if (trim.w > 0.98 && trim.h > 0.98) return null
  const pct = (value: number) => `${Math.round(value * 10000) / 100}%`
  return {
    width: pct(1 / trim.w),
    height: pct(1 / trim.h),
    left: pct(-trim.x / trim.w),
    top: pct(-trim.y / trim.h),
  }
}

/**
 * A parte útil de um logo, a partir dos pixels (RGBA, como o `getImageData` do navegador). Sobra é
 * o que é transparente ou, quando o canto de cima à esquerda é branco, o branco em volta. Uma margem pequena fica (2% de cada
 * lado), para o desenho não encostar na borda. Sem nada útil (foto toda de uma cor): `null`.
 */
export function findTrim(pixels: Uint8ClampedArray, width: number, height: number): Trim | null {
  if (!width || !height) return null
  const at = (x: number, y: number) => (y * width + x) * 4
  const corner = [pixels[0], pixels[1], pixels[2], pixels[3]]
  // Fundo de cor (um quadrado vermelho com a marca dentro) faz parte do logo: só o branco sobra.
  const whiteCorner = corner[3] >= 16 && corner[0] > 232 && corner[1] > 232 && corner[2] > 232
  const background = (i: number) => {
    const alpha = pixels[i + 3]
    if (alpha < 16) return true
    if (!whiteCorner) return false
    return (
      Math.abs(pixels[i] - corner[0]) +
        Math.abs(pixels[i + 1] - corner[1]) +
        Math.abs(pixels[i + 2] - corner[2]) <
      36
    )
  }
  let left = width
  let right = -1
  let top = height
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (background(at(x, y))) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }
  if (right < 0) return null
  const pad = 0.02
  const round = (value: number) => Math.round(value * 1000) / 1000
  const x = Math.max(0, left / width - pad)
  const y = Math.max(0, top / height - pad)
  const x2 = Math.min(1, (right + 1) / width + pad)
  const y2 = Math.min(1, (bottom + 1) / height + pad)
  return { x: round(x), y: round(y), w: round(x2 - x), h: round(y2 - y) }
}
