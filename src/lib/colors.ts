export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const DARK_TEXT = '#111111'
const LIGHT_TEXT = '#ffffff'

function relativeLuminance(hex: string): number {
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

/** Devolve a cor se for válida; senão, a cor padrão. Evita CSS quebrado ou injetado. */
export function safeColor(value: string | null | undefined, fallback: string): string {
  return value && HEX_COLOR_PATTERN.test(value) ? value.toLowerCase() : fallback
}
