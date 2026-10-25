import type { CSSProperties } from 'react'

import { readableTextColor, safeColor } from '@/lib/colors'
import { DEFAULT_COLORS, FONT_NAME_PATTERN } from '@/lib/theme'
import type { Site } from '@/payload-types'

const FALLBACK_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

function fontStack(name: string | null | undefined): string {
  return name && FONT_NAME_PATTERN.test(name) ? `"${name}", ${FALLBACK_FONT}` : FALLBACK_FONT
}

/**
 * Cores e fontes das configurações como variáveis CSS. Os valores passam por validação de novo
 * aqui, porque vão direto para o estilo da página.
 */
export function themeStyle(site: Partial<Site>): CSSProperties {
  const primary = safeColor(site.colors?.primary, DEFAULT_COLORS.primary)
  const footer = safeColor(site.colors?.footer, DEFAULT_COLORS.footer)

  return {
    '--color-primary': primary,
    '--color-on-primary': readableTextColor(primary),
    '--color-background': safeColor(site.colors?.background, DEFAULT_COLORS.background),
    '--color-surface': safeColor(site.colors?.surface, DEFAULT_COLORS.surface),
    '--color-text': safeColor(site.colors?.text, DEFAULT_COLORS.text),
    '--color-footer': footer,
    '--color-on-footer': readableTextColor(footer),
    '--font-headings': fontStack(site.fonts?.headings || site.fonts?.body),
    '--font-body': fontStack(site.fonts?.body),
  } as CSSProperties
}
