export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const DARK_TEXT = '#111111'
const LIGHT_TEXT = '#ffffff'

/** Luminância relativa da WCAG: 0 é preto, 1 é branco. */
export function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** Razão de contraste da WCAG, de 1 (nenhum) a 21 (preto no branco). */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Cor do texto sobre um fundo escolhido pelo cliente (botões, rodapé): a que contrasta mais.
 * As cores são livres, então o texto se adapta em vez de bloquear a escolha.
 */
export function readableTextColor(background: string): string {
  return contrastRatio(background, DARK_TEXT) >= contrastRatio(background, LIGHT_TEXT)
    ? DARK_TEXT
    : LIGHT_TEXT
}

/**
 * A cor que se vê com `color` por cima de `background` numa opacidade (`opacity` do CSS): mistura
 * os dois, canal a canal.
 */
export function blendColors(color: string, background: string, opacity: number): string {
  const channel = (hex: string, start: number) => parseInt(hex.slice(start, start + 2), 16)
  return `#${[1, 3, 5]
    .map((start) =>
      Math.round(channel(color, start) * opacity + channel(background, start) * (1 - opacity))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/**
 * A cor mais parecida com `color` que se lê sobre `background` com pelo menos `min` de contraste:
 * mistura a cor com branco (fundo escuro) ou preto (fundo claro), aos poucos, só o necessário. A
 * cor de marca continua reconhecível e o texto nela passa na WCAG.
 */
export function readableTint(color: string, background: string, min = 4.5): string {
  if (contrastRatio(color, background) >= min) return color
  const toward = contrastRatio('#ffffff', background) >= contrastRatio('#000000', background)
  const target = toward ? '#ffffff' : '#000000'
  for (let step = 1; step <= 20; step++) {
    const tint = blendColors(target, color, step / 20)
    if (contrastRatio(tint, background) >= min) return tint
  }
  return target
}

/** Tom bem escuro da cor principal, para rodapé e fundos fortes (texto claro em cima). */
export function deepShade(color: string): string {
  return blendColors(color, '#0b0b0d', 0.32)
}

/** Devolve a cor se for válida; senão, a cor padrão. Evita CSS quebrado ou injetado. */
export function safeColor(value: string | null | undefined, fallback: string): string {
  return value && HEX_COLOR_PATTERN.test(value) ? value.toLowerCase() : fallback
}
