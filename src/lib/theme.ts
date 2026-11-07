// Constantes do visual do site, usadas pelo painel (globals) e pelo site público.

export const DEFAULT_COLORS = {
  primary: '#1d4ed8',
  background: '#ffffff',
  surface: '#f3f4f6',
  text: '#1f2933',
  footer: '#111827',
} as const

/**
 * Personalidade do site (redesign v3): muda formas, tamanhos e a arrumação das seções, sem mexer no
 * conteúdo. `classico` é o visual de antes, o padrão: nenhum site muda sozinho.
 */
export const PERSONALITIES = ['classico', 'vitrine', 'aconchego', 'editorial'] as const

export type Personality = (typeof PERSONALITIES)[number]

export const DEFAULT_PERSONALITY: Personality = 'classico'

/** Nome e descrição de cada personalidade, para o painel. */
export const PERSONALITY_LABELS: Record<Personality, { name: string; description: string }> = {
  classico: { name: 'Clássico', description: 'Limpo e direto, como o site sempre foi.' },
  vitrine: { name: 'Vitrine', description: 'Foto grande, letras enormes, cara de loja.' },
  aconchego: { name: 'Aconchego', description: 'Formas redondas e fotos em arco.' },
  editorial: { name: 'Editorial', description: 'Grade de revista, títulos gigantes e fios.' },
}

/** A personalidade guardada, ou a padrão se vier vazia ou desconhecida. */
export function safePersonality(value: string | null | undefined): Personality {
  return PERSONALITIES.includes(value as Personality) ? (value as Personality) : DEFAULT_PERSONALITY
}

// Só letras, números e espaços: o nome vai para o CSS do site.
export const FONT_NAME_PATTERN = /^[A-Za-z0-9 ]{1,60}$/

/**
 * CSS das fontes pronto para ir dentro de `<style>`. O CSS gerado pelo servidor nunca tem `<`;
 * escapar impede que um `</style>` feche a tag e abra um `<script>` (segunda defesa: o gancho
 * das configurações já descarta qualquer CSS que não tenha sido gerado por ele).
 */
export function safeStyleText(css: string | null | undefined): string {
  return (css ?? '').replace(/</g, '\\3c ')
}

type SiteFonts = {
  fonts?: { headings?: string | null; body?: string | null } | null
  fontFaces?: string | null
  fontKey?: string | null
}

/**
 * Fontes das prévias do painel, que mostram o rascunho das configurações. As fontes só são
 * copiadas para o nosso Storage ao publicar: a que ainda não foi publicada vem direto do Google
 * (só quem está no painel vê; o site público nunca usa este CSS).
 */
export function previewFontFaces(site: SiteFonts): string | null {
  const names = [site.fonts?.headings?.trim() || '', site.fonts?.body?.trim() || '']
  if (names.join('|') === (site.fontKey ?? '|')) return site.fontFaces ?? null
  const imports = [...new Set(names.filter((name) => FONT_NAME_PATTERN.test(name)))].map(
    (name) =>
      `@import url("https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}&display=swap");`,
  )
  return [...imports, site.fontFaces ?? ''].join('\n') || null
}
