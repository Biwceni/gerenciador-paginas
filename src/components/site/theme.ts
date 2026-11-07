import type { CSSProperties } from 'react'

import { blendColors, deepShade, readableTextColor, readableTint, safeColor } from '@/lib/colors'
import { DEFAULT_COLORS, FONT_NAME_PATTERN, type Personality, safePersonality } from '@/lib/theme'
import type { Site } from '@/payload-types'

const FALLBACK_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/**
 * A fonte escolhida, a reserva com as mesmas medidas ("<fonte> Fallback", de `fontFallback.ts`, só no
 * site publicado) e a fonte do aparelho.
 */
function fontStack(name: string | null | undefined): string {
  return name && FONT_NAME_PATTERN.test(name)
    ? `"${name}", "${name} Fallback", ${FALLBACK_FONT}`
    : FALLBACK_FONT
}

type PersonalityTokens = {
  /** Cantos dos botões. */
  '--radius': string
  /** Cantos das fotos (o banner usa um pouco mais, a galeria um pouco menos). */
  '--radius-media': string
  '--fs-h1': string
  '--fs-h2': string
  '--heading-weight': string
  '--heading-tracking': string
  /** Espaço de cima e de baixo de cada seção. */
  '--section-pad': string
  /** Largura máxima do conteúdo. */
  '--container': string
}

/** Espaço entre seções das personalidades novas: mais ar, crescendo com a largura do site. */
const NEW_SECTION_PAD = 'clamp(64px, 10cqi, 128px)'

/**
 * Medidas de cada personalidade. As do Clássico são as de antes da v3 (as mesmas do `.site` no
 * `styles.css`): um site Clássico fica idêntico. As novas crescem com a largura do site (`cqi`), e
 * não da janela, para as prévias do painel e do editor responderem ao tamanho delas.
 */
export const PERSONALITY_TOKENS: Record<Personality, PersonalityTokens> = {
  classico: {
    '--radius': '999px',
    '--radius-media': '16px',
    '--fs-h1': 'clamp(34px, 21.6px + 3.19vw, 56px)',
    '--fs-h2': 'clamp(28px, 21.2px + 1.74vw, 40px)',
    '--heading-weight': '700',
    '--heading-tracking': 'normal',
    '--section-pad': 'clamp(44px, 8vw, 88px)',
    '--container': '1080px',
  },
  vitrine: {
    '--radius': '4px',
    '--radius-media': '3px',
    '--fs-h1': 'clamp(44px, 9.4cqi, 124px)',
    '--fs-h2': 'clamp(34px, 5.6cqi, 68px)',
    '--heading-weight': '500',
    '--heading-tracking': '-0.02em',
    '--section-pad': NEW_SECTION_PAD,
    '--container': '1180px',
  },
  aconchego: {
    '--radius': '999px',
    '--radius-media': '28px',
    '--fs-h1': 'clamp(38px, 6.6cqi, 84px)',
    '--fs-h2': 'clamp(30px, 4.6cqi, 56px)',
    '--heading-weight': '600',
    '--heading-tracking': '-0.01em',
    '--section-pad': NEW_SECTION_PAD,
    '--container': '1180px',
  },
  editorial: {
    '--radius': '0px',
    '--radius-media': '0px',
    '--fs-h1': 'clamp(42px, 8.8cqi, 116px)',
    '--fs-h2': 'clamp(36px, 5.8cqi, 68px)',
    '--heading-weight': '600',
    '--heading-tracking': '-0.03em',
    '--section-pad': NEW_SECTION_PAD,
    '--container': '1180px',
  },
}

/**
 * Tons tirados da cor principal, todos com contraste de 4,5:1 onde viram texto:
 * - `deep`: a cor principal bem escura (película do banner com foto e fundos fortes);
 * - `accentText`: a cor principal como texto sobre o fundo e o fundo suave (palavras em destaque);
 * - `accentOnDark`: a cor principal clareada, como texto sobre o tom escuro;
 * - `accentOnPhoto`: idem sobre a foto escurecida do banner (conta com a foto um pouco mais clara
 *   que a película, porque ela aparece por baixo).
 */
export function brandShades(colors: Partial<Site['colors']> | null | undefined) {
  const primary = safeColor(colors?.primary, DEFAULT_COLORS.primary)
  const background = safeColor(colors?.background, DEFAULT_COLORS.background)
  const surface = safeColor(colors?.surface, DEFAULT_COLORS.surface)
  const deep = deepShade(primary)
  return {
    deep,
    onDeep: readableTextColor(deep),
    accentText: readableTint(readableTint(primary, background), surface),
    accentOnDark: readableTint(primary, deep),
    accentOnPhoto: readableTint(primary, blendColors(deep, '#808080', 0.75)),
  }
}

/** Personalidade do site (a guardada ou a padrão). Vai no `data-personality` do `body`. */
export function sitePersonality(site: Partial<Site>): Personality {
  return safePersonality(site.personality)
}

/**
 * Cores, fontes e medidas das configurações como variáveis CSS. Os valores passam por validação de
 * novo aqui, porque vão direto para o estilo da página. `--personality` leva a personalidade às
 * prévias do painel e do editor, que copiam estas variáveis para o `body` delas (`applySiteTheme`).
 */
export function themeStyle(site: Partial<Site>): CSSProperties {
  const primary = safeColor(site.colors?.primary, DEFAULT_COLORS.primary)
  const footer = safeColor(site.colors?.footer, DEFAULT_COLORS.footer)
  const shades = brandShades(site.colors)
  const personality = sitePersonality(site)

  return {
    '--color-primary': primary,
    '--color-on-primary': readableTextColor(primary),
    '--color-background': safeColor(site.colors?.background, DEFAULT_COLORS.background),
    '--color-surface': safeColor(site.colors?.surface, DEFAULT_COLORS.surface),
    '--color-text': safeColor(site.colors?.text, DEFAULT_COLORS.text),
    '--color-footer': footer,
    '--color-on-footer': readableTextColor(footer),
    '--color-deep': shades.deep,
    '--color-on-deep': shades.onDeep,
    '--color-accent-text': shades.accentText,
    '--color-accent-on-dark': shades.accentOnDark,
    '--color-accent-on-photo': shades.accentOnPhoto,
    '--font-headings': fontStack(site.fonts?.headings || site.fonts?.body),
    '--font-body': fontStack(site.fonts?.body),
    '--personality': personality,
    ...PERSONALITY_TOKENS[personality],
  } as CSSProperties
}

/**
 * Põe as variáveis do tema no `body` de uma prévia (iframe), com a personalidade no
 * `data-personality`, como no `body` do site.
 */
export function applySiteTheme(body: HTMLElement, theme: Record<string, string>) {
  for (const [name, value] of Object.entries(theme)) body.style.setProperty(name, value)
  body.dataset.personality = safePersonality(theme['--personality'])
}
