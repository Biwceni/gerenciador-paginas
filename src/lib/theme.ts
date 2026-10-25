// Constantes do visual do site, usadas pelo painel (globals) e pelo site público.

export const DEFAULT_COLORS = {
  primary: '#1d4ed8',
  background: '#ffffff',
  surface: '#f3f4f6',
  text: '#1f2933',
  footer: '#111827',
} as const

// Só letras, números e espaços: o nome vai para o CSS do site.
export const FONT_NAME_PATTERN = /^[A-Za-z0-9 ]{1,60}$/
