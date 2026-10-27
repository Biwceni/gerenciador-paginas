import { contrastRatio, readableTextColor } from './colors'

// Atalhos do visual do site (do protótipo): só pontos de partida, as cores e fontes continuam livres.

export type SiteColors = {
  primary: string
  background: string
  surface: string
  text: string
  footer: string
}

export const COLOR_PRESETS: { name: string; colors: SiteColors }[] = [
  {
    name: 'Café',
    colors: {
      primary: '#6b3f24',
      surface: '#f5ebe0',
      background: '#fffdf9',
      text: '#2a211b',
      footer: '#2a211b',
    },
  },
  {
    name: 'Serra',
    colors: {
      primary: '#2f5d3a',
      surface: '#e8f0e4',
      background: '#fbfdf9',
      text: '#1e2a21',
      footer: '#1e2a21',
    },
  },
  {
    name: 'Mar',
    colors: {
      primary: '#1f4e79',
      surface: '#e6eef6',
      background: '#fbfcfe',
      text: '#18222d',
      footer: '#142235',
    },
  },
  {
    name: 'Terracota',
    colors: {
      primary: '#b4532a',
      surface: '#f8e9e1',
      background: '#fffaf6',
      text: '#2d1d16',
      footer: '#2d1d16',
    },
  },
  {
    name: 'Grafite',
    colors: {
      primary: '#2b2f33',
      surface: '#eeeeec',
      background: '#ffffff',
      text: '#1d1f21',
      footer: '#1d1f21',
    },
  },
  {
    name: 'Noite',
    colors: {
      primary: '#e3a22d',
      surface: '#2a2622',
      background: '#1a1816',
      text: '#f3ede4',
      footer: '#0f0e0d',
    },
  },
  {
    name: 'Rosa',
    colors: {
      primary: '#c2185b',
      surface: '#fde7ef',
      background: '#fffafc',
      text: '#2b1420',
      footer: '#3a1328',
    },
  },
]

export const COLOR_FIELDS: { key: keyof SiteColors; label: string; hint: string }[] = [
  { key: 'primary', label: 'Cor principal', hint: 'Botões, destaques e faixas coloridas' },
  { key: 'background', label: 'Fundo', hint: 'Fundo das páginas' },
  { key: 'surface', label: 'Fundo suave', hint: 'Faixas que separam as seções' },
  { key: 'text', label: 'Texto', hint: 'Cor das letras' },
  { key: 'footer', label: 'Rodapé', hint: 'Fundo do rodapé' },
]

export const FONT_PRESETS: { name: string; headings: string; body: string }[] = [
  { name: 'Clássica', headings: 'Lora', body: 'Figtree' },
  { name: 'Moderna', headings: 'DM Sans', body: 'DM Sans' },
  { name: 'Amigável', headings: 'Nunito', body: 'Nunito' },
  { name: 'Elegante', headings: 'Playfair Display', body: 'Lato' },
  { name: 'Forte', headings: 'Bebas Neue', body: 'Open Sans' },
  { name: 'À mão', headings: 'Pacifico', body: 'Quicksand' },
]

/** Sugestões na caixa de fonte. Qualquer outra fonte do Google Fonts também vale. */
export const FONT_SUGGESTIONS = [
  'Abril Fatface',
  'Alegreya',
  'Anton',
  'Archivo',
  'Barlow',
  'Bebas Neue',
  'Bitter',
  'Caveat',
  'Comfortaa',
  'Cormorant Garamond',
  'Crimson Pro',
  'Dancing Script',
  'DM Sans',
  'DM Serif Display',
  'Figtree',
  'Fraunces',
  'Inter',
  'Josefin Sans',
  'Karla',
  'Lato',
  'Libre Baskerville',
  'Lobster',
  'Lora',
  'Manrope',
  'Merriweather',
  'Montserrat',
  'Mulish',
  'Nunito',
  'Open Sans',
  'Oswald',
  'Pacifico',
  'Playfair Display',
  'Poppins',
  'Quicksand',
  'Raleway',
  'Righteous',
  'Roboto',
  'Roboto Slab',
  'Rubik',
  'Source Sans 3',
  'Space Grotesk',
  'Work Sans',
]

/**
 * Nome da fonte como o Google escreve: "playfair  display" vira "Playfair Display". Os nomes da
 * lista de sugestões são usados como estão (ex.: "DM Sans").
 */
export function normalizeFontName(value: string): string {
  const clean = value.trim().replace(/\s+/g, ' ')
  const known = FONT_SUGGESTIONS.find((name) => name.toLowerCase() === clean.toLowerCase())
  return known ?? clean.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

export type ContrastWarning = { label: string; ratio: number; hint: string }

/**
 * Combinações difíceis de ler (contraste abaixo de 4,5:1, o mínimo da WCAG para texto). Só avisam:
 * as cores são livres. A cor das letras de botões e rodapé já é a mais legível possível.
 */
export function contrastWarnings(colors: SiteColors): ContrastWarning[] {
  const checks: ContrastWarning[] = [
    {
      label: 'Texto sobre o fundo',
      ratio: contrastRatio(colors.text, colors.background),
      hint: 'Escureça o texto ou clareie o fundo (ou o contrário).',
    },
    {
      label: 'Texto sobre o fundo suave',
      ratio: contrastRatio(colors.text, colors.surface),
      hint: 'Deixe o fundo suave mais parecido com o fundo.',
    },
    {
      label: 'Letras dos botões',
      ratio: contrastRatio(readableTextColor(colors.primary), colors.primary),
      hint: 'A cor principal está num tom médio. Um pouco mais escura ou mais clara ajuda.',
    },
    {
      label: 'Letras do rodapé',
      ratio: contrastRatio(readableTextColor(colors.footer), colors.footer),
      hint: 'Use um rodapé bem escuro ou bem claro.',
    },
  ]
  return checks.filter((check) => check.ratio < 4.5)
}

/** "3,2:1", arredondado para baixo (4,49 não vira 4,5). */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 10) / 10).toFixed(1).replace('.', ',')}:1`
}
