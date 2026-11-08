import { contrastRatio, readableTextColor, relativeLuminance } from './colors'
import { bannerTextRatio, type SiteColors } from './style-presets'

// "Sua marca" (redesign v3, entrega 3): as cores do site a partir do logo. Tudo aqui é conta pura,
// sem navegador: a leitura dos pixels fica em `components/panel/logoColors.ts`, que só desenha o
// logo num canvas e passa os pixels para cá. Nada sai do computador de quem está no painel.

/** Lado do quadrado em que o logo é desenhado para a leitura: 48 × 48 pixels bastam. */
export const LOGO_SAMPLE_SIZE = 48

/** Cores parecidas (distância RGB menor que esta) contam como uma só. */
const SAME_COLOR_DISTANCE = 48

/** Cor com menos que esta fatia da imagem não pode ser a principal (um risco, uma sombra). */
export const MIN_MAIN_SHARE = 0.005

/** Abaixo desta saturação a cor é "cinza" (logo metálico): ela é avivada antes de virar a principal. */
const LOW_SATURATION = 0.35

/** Quanto a cor cinza é afastada do cinza para ficar viva. */
const VIVID_FACTOR = 2.2

/** Quanto cada passo do ajuste de contraste escurece ou clareia a cor. */
const CONTRAST_STEP = 0.08

const MIN_CONTRAST = 4.5

export type LogoColor = {
  color: string
  /** Fatia da parte visível do logo (sem o transparente) que tem esta cor, de 0 a 1. */
  share: number
}

type RGB = [number, number, number]

const clamp = (value: number) => Math.max(0, Math.min(255, value))

export function hexToRgb(hex: string): RGB {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as RGB
}

export function rgbToHex(rgb: readonly number[]): string {
  return `#${rgb.map((value) => Math.round(clamp(value)).toString(16).padStart(2, '0')).join('')}`
}

/**
 * Vai de `from` para `to` na proporção `amount` (0 fica em `from`, 1 chega em `to`). Acima de 1, passa
 * de `to` na mesma direção: é assim que uma cor acinzentada é afastada do cinza.
 */
export function mixColors(from: string, to: string, amount: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  return rgbToHex(a.map((value, index) => value + (b[index] - value) * amount))
}

/** Saturação de 0 (cinza) a 1 (cor pura), como no HSV. */
export function saturation(hex: string): number {
  const rgb = hexToRgb(hex)
  const max = Math.max(...rgb)
  const min = Math.min(...rgb)
  return max === 0 ? 0 : (max - min) / max
}

const distance = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/**
 * Cores do logo a partir dos pixels (RGBA, como o `getImageData` do canvas entrega), da mais usada
 * para a menos usada. Pixel quase transparente não conta: um PNG com fundo transparente dá só as
 * cores do desenho. As cores são agrupadas em 4 bits por canal e as parecidas são juntadas.
 */
export function extractLogoColors(pixels: ArrayLike<number>): LogoColor[] {
  const buckets = new Map<number, { count: number; sum: RGB }>()
  let total = 0
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue
    const r = pixels[index]
    const g = pixels[index + 1]
    const b = pixels[index + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key) ?? { count: 0, sum: [0, 0, 0] }
    bucket.count++
    bucket.sum[0] += r
    bucket.sum[1] += g
    bucket.sum[2] += b
    buckets.set(key, bucket)
    total++
  }
  if (!total) return []

  const groups: { rgb: RGB; count: number }[] = []
  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count)
  for (const { count, sum } of sorted) {
    const rgb = sum.map((value) => Math.round(value / count)) as RGB
    // A cor mais usada do grupo é a que representa todas as parecidas com ela.
    const near = groups.find((group) => distance(group.rgb, rgb) < SAME_COLOR_DISTANCE)
    if (near) near.count += count
    else groups.push({ rgb, count })
  }

  return groups
    .sort((a, b) => b.count - a.count)
    .map((group) => ({ color: rgbToHex(group.rgb), share: group.count / total }))
}

/** Nota de cada cor para ser a principal: viva, num tom médio e não minúscula na imagem. */
export function mainColorScore({ color, share }: LogoColor): number {
  return saturation(color) * (1 - Math.abs(relativeLuminance(color) - 0.3)) * share ** 0.25
}

/**
 * A cor principal do logo: a de maior nota, ignorando as que ocupam menos de 0,5% da imagem. O
 * fundo branco e o preto do texto quase nunca ganham (saturação zero), mas também ficam de fora
 * quando há outra cor, por serem claros ou escuros demais para botão.
 */
export function pickMainColor(colors: LogoColor[]): string | null {
  const enough = colors.filter((item) => item.share >= MIN_MAIN_SHARE)
  const middle = enough.filter((item) => {
    const luminance = relativeLuminance(item.color)
    return luminance > 0.04 && luminance < 0.75
  })
  const pool = middle.length ? middle : enough.length ? enough : colors
  if (!pool.length) return null
  return pool.reduce((best, item) => (mainColorScore(item) > mainColorScore(best) ? item : best))
    .color
}

/** Cor de pouca saturação (prata, grafite) afastada do cinza, para o site ganhar cor. */
export function vividColor(color: string): string {
  if (saturation(color) >= LOW_SATURATION) return color
  const rgb = hexToRgb(color)
  const gray = (rgb[0] + rgb[1] + rgb[2]) / 3
  return mixColors(rgbToHex([gray, gray, gray]), color, VIVID_FACTOR)
}

export type BrandPalette = {
  /** A cor principal, já avivada. */
  accent: string
  /** A cor mais escura do logo, escurecida um pouco mais: textos e fundo da noite. */
  dark: string
}

/** A principal escolhida e a mais escura do logo, prontas para montar as combinações. */
export function brandPalette(main: string, colors: LogoColor[]): BrandPalette {
  const pool = colors.filter((item) => item.share >= MIN_MAIN_SHARE).map((item) => item.color)
  const darkest = [...pool, main].reduce((a, b) =>
    relativeLuminance(b) < relativeLuminance(a) ? b : a,
  )
  return {
    accent: vividColor(main),
    dark: relativeLuminance(darkest) > 0.05 ? mixColors(darkest, '#000000', 0.55) : darkest,
  }
}

/**
 * Leva a cor em direção a `target` (preto ou branco) aos poucos, 8% por passo, até `ok` aceitar.
 * Mexe só o necessário: a cor continua reconhecível.
 */
export function adjustUntil(color: string, target: string, ok: (color: string) => boolean): string {
  let current = color
  for (let step = 0; step < 60 && !ok(current); step++) {
    current = mixColors(current, target, CONTRAST_STEP)
  }
  return ok(current) ? current : target
}

/** A cor principal funciona sobre o fundo: como texto (links, menu) e como fundo de botão e faixa. */
export function primaryReads(primary: string, background: string): boolean {
  return (
    contrastRatio(primary, background) >= MIN_CONTRAST &&
    contrastRatio(readableTextColor(primary), primary) >= MIN_CONTRAST &&
    bannerTextRatio(primary) >= MIN_CONTRAST
  )
}

/** Fundo escuro pede a cor mais clara; fundo claro, mais escura. */
const awayFrom = (background: string) =>
  relativeLuminance(background) < 0.18 ? '#ffffff' : '#000000'

/** A cor principal ajustada até ler bem sobre o fundo (4,5:1), escurecendo ou clareando. */
export function fitPrimary(primary: string, background: string): string {
  return adjustUntil(primary, awayFrom(background), (color) => primaryReads(color, background))
}

/** Cor do texto ajustada até ler bem sobre o fundo e o fundo suave. */
function fitText(text: string, background: string, surface: string): string {
  return adjustUntil(
    text,
    awayFrom(background),
    (color) =>
      contrastRatio(color, background) >= MIN_CONTRAST &&
      contrastRatio(color, surface) >= MIN_CONTRAST,
  )
}

/** Rodapé sempre escuro, com letras claras lendo bem. */
function fitFooter(color: string): string {
  return adjustUntil(color, '#000000', (footer) => contrastRatio('#ffffff', footer) >= 7)
}

const NIGHT_TEXT = '#f4eeec'

export type BrandComboKey = 'noite' | 'claro' | 'forte'

export type BrandCombo = {
  key: BrandComboKey
  name: string
  note: string
  colors: SiteColors
  /** Contraste do texto sobre o fundo, o número que a tela mostra ("15,6:1"). */
  ratio: number
}

/**
 * As três combinações prontas a partir da principal e da mais escura. Todas passam 4,5:1 em texto,
 * botões, links, faixa da cor do site e rodapé (as mesmas conferências de `contrastWarnings`).
 */
export function brandCombos({ accent, dark }: BrandPalette): BrandCombo[] {
  // Noite: fundo quase preto, puxado para a cor escura do logo.
  const nightBackground = adjustUntil(
    mixColors(dark, '#000000', 0.05),
    '#000000',
    (color) => contrastRatio(NIGHT_TEXT, color) >= 12,
  )
  const nightSurface = mixColors(nightBackground, accent, 0.09)
  const night: SiteColors = {
    primary: fitPrimary(accent, nightBackground),
    background: nightBackground,
    surface: nightSurface,
    text: fitText(NIGHT_TEXT, nightBackground, nightSurface),
    footer: fitFooter(mixColors(nightBackground, '#000000', 0.35)),
  }

  // Claro e delicado: fundo é a principal 93% clareada.
  const lightBackground = mixColors(accent, '#ffffff', 0.93)
  const lightSurface = mixColors(accent, '#ffffff', 0.84)
  const light: SiteColors = {
    primary: fitPrimary(accent, lightBackground),
    background: lightBackground,
    surface: lightSurface,
    text: fitText(mixColors(dark, '#000000', 0.2), lightBackground, lightSurface),
    footer: fitFooter(mixColors(dark, '#000000', 0.1)),
  }

  // Contraste forte: branco e a cor escura.
  const strongSurface = mixColors(accent, '#ffffff', 0.9)
  const strong: SiteColors = {
    primary: fitPrimary(mixColors(accent, dark, 0.3), '#ffffff'),
    background: '#ffffff',
    surface: strongSurface,
    text: fitText(dark, '#ffffff', strongSurface),
    footer: fitFooter(dark),
  }

  const combo = (
    key: BrandComboKey,
    name: string,
    note: string,
    colors: SiteColors,
  ): BrandCombo => ({
    key,
    name,
    note,
    colors,
    ratio: contrastRatio(colors.text, colors.background),
  })

  return [
    combo('noite', 'Noite com a cor do logo', 'Fundo escuro', night),
    combo('claro', 'Claro e delicado', 'Fundo bem claro', light),
    combo('forte', 'Contraste forte', 'Branco e a cor escura', strong),
  ]
}

/** Qual combinação está em uso, se as cores do site são exatamente as de uma delas. */
export function currentCombo(colors: SiteColors, combos: BrandCombo[]): BrandComboKey | null {
  const same = (a: SiteColors, b: SiteColors) =>
    (Object.keys(a) as (keyof SiteColors)[]).every(
      (key) => a[key].toLowerCase() === b[key].toLowerCase(),
    )
  return combos.find((combo) => same(combo.colors, colors))?.key ?? null
}
