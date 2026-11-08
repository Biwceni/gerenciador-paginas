/**
 * Animação do site (redesign v3, entrega 2). Dois níveis:
 *
 * - **Animação do site** (Configurações): Nenhuma, Suave ou Marcante. É o padrão das seções.
 * - **Animação de cada seção** (editor): "Igual ao site" (padrão), "Sem animação" ou uma das
 *   animações pensadas para aquela seção. Nunca uma lista aberta de qualquer efeito em qualquer
 *   seção: o leigo montaria um site agitado demais.
 *
 * Tudo é CSS (`styles.css`, regras `.anim--*`): o banner anima ao abrir a página; as outras seções,
 * ao rolar, só onde o navegador tem `animation-timeline`. Sem suporte, nada fica escondido.
 */

export const MOTIONS = ['nenhum', 'suave', 'marcante'] as const

export type Motion = (typeof MOTIONS)[number]

/** Suave: cada seção esmaece ao aparecer. Os sites de antes ficam assim, sem nada agitado. */
export const DEFAULT_MOTION: Motion = 'suave'

export const MOTION_LABELS: Record<Motion, { name: string; description: string }> = {
  nenhum: { name: 'Nenhuma', description: 'As seções aparecem paradas.' },
  suave: { name: 'Suave', description: 'Cada seção esmaece ao aparecer na tela.' },
  marcante: {
    name: 'Marcante',
    description: 'O banner entra em linhas e cortina; cada seção usa a animação pensada para ela.',
  },
}

/** A animação do site guardada, ou a padrão se vier vazia ou desconhecida. */
export function safeMotion(value: string | null | undefined): Motion {
  return MOTIONS.includes(value as Motion) ? (value as Motion) : DEFAULT_MOTION
}

/** Todas as animações de seção. Os nomes vão para a classe `anim--<nome>` no site. */
export const ANIMS = [
  'linhas',
  'zoom',
  'esmaecer',
  'cascata',
  'deslizar',
  'sequencia',
  'cortina',
  'subir',
] as const

export type Anim = (typeof ANIMS)[number]

/** Valor guardado na seção: além das animações dela, "Igual ao site" e "Sem animação". */
export type SectionAnim = 'site' | 'none' | Anim

/**
 * As animações de cada seção, na ordem do editor. A primeira é a do "Marcante". A Faixa de aviso
 * não entra: ela tem o próprio "Movimento" (Correndo ou Parada).
 */
export const SECTION_ANIMS = {
  Hero: ['linhas', 'zoom', 'esmaecer'],
  Products: ['cascata', 'zoom', 'esmaecer'],
  PriceList: ['linhas', 'esmaecer'],
  Features: ['cascata', 'esmaecer'],
  Testimonials: ['deslizar', 'cascata', 'esmaecer'],
  Gallery: ['sequencia', 'zoom', 'esmaecer'],
  InstagramStrip: ['sequencia', 'esmaecer'],
  TextImage: ['deslizar', 'cortina', 'esmaecer'],
  CallToAction: ['subir', 'esmaecer'],
  Columns: ['cascata', 'esmaecer'],
  LinkList: ['cascata', 'esmaecer'],
  Video: ['cortina', 'esmaecer'],
  Faq: ['esmaecer'],
  Contact: ['esmaecer'],
  Form: ['esmaecer'],
  RichText: ['esmaecer'],
  Privacy: ['esmaecer'],
} as const satisfies Record<string, readonly [Anim, ...Anim[]]>

export type AnimatedSection = keyof typeof SECTION_ANIMS

/** Valores que uma seção aceita (o mesmo tipo do esquema dela). */
export type SectionAnimOf<K extends AnimatedSection> =
  'site' | 'none' | (typeof SECTION_ANIMS)[K][number]

/** Nome de cada animação no editor. Algumas mudam conforme a seção ("Vêm do lado" ou "dos lados"). */
const ANIM_LABELS: Record<Anim, string> = {
  linhas: 'Linhas e cortina',
  zoom: 'Fotos aproximam',
  esmaecer: 'Esmaecer',
  cascata: 'Um depois do outro',
  deslizar: 'Vêm do lado',
  sequencia: 'Fotos em sequência',
  cortina: 'Abre em cortina',
  subir: 'Título sobe',
}

const SECTION_ANIM_LABELS: Partial<Record<AnimatedSection, Partial<Record<Anim, string>>>> = {
  Hero: { zoom: 'Foto aproxima' },
  PriceList: { linhas: 'Itens em sequência' },
  TextImage: { deslizar: 'Vêm dos lados', cortina: 'Foto em cortina' },
  Columns: { cascata: 'Uma depois da outra' },
  LinkList: { cascata: 'Botões em sequência' },
}

export function animLabel(section: AnimatedSection, anim: Anim): string {
  return SECTION_ANIM_LABELS[section]?.[anim] ?? ANIM_LABELS[anim]
}

/** Os valores que a seção aceita, na ordem do editor. */
export function sectionAnimValues(section: AnimatedSection): SectionAnim[] {
  return ['site', 'none', ...SECTION_ANIMS[section]]
}

export function isAnimatedSection(type: string): type is AnimatedSection {
  return Object.hasOwn(SECTION_ANIMS, type)
}

/**
 * Animação que a seção mostra de fato: o valor dela, ou, em "Igual ao site", a regra do site
 * (Nenhuma → sem animação; Suave → esmaecer; Marcante → a primeira da seção). Valor que a seção não
 * aceita conta como "Igual ao site".
 */
export function resolveAnim(
  section: { type: string; anim?: string | null },
  site: Motion | string | null | undefined,
): Anim | 'none' {
  if (!isAnimatedSection(section.type)) return 'none'
  const options: readonly Anim[] = SECTION_ANIMS[section.type]
  const own = section.anim
  if (own === 'none') return 'none'
  if (own && options.includes(own as Anim)) return own as Anim
  const motion = safeMotion(site)
  if (motion === 'nenhum') return 'none'
  if (motion === 'suave') return 'esmaecer'
  return options[0]
}

/** Classe da seção no site: `anim anim--cascata`, ou nada. */
export function animClass(anim: Anim | 'none'): string {
  return anim === 'none' ? '' : `anim anim--${anim}`
}

/**
 * Título do banner em linhas, para a animação "Linhas e cortina": pelas quebras que o cliente
 * digitou ou, sem elas, em até 3 partes de tamanho parecido (títulos curtos ficam numa linha só).
 * Cada linha sobe de dentro de uma máscara.
 */
export function splitTitleLines(title: string): string[] {
  const typed = title
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  // Mais de 3 linhas digitadas: as que sobram vão juntas na terceira.
  if (typed.length > 1) return [...typed.slice(0, 2), typed.slice(2).join(' ')].filter(Boolean)
  const words = title.trim().split(/\s+/).filter(Boolean)
  const length = title.trim().length
  const parts = words.length < 3 || length <= 22 ? 1 : length <= 44 ? 2 : 3
  if (parts === 1) return words.length ? [words.join(' ')] : []

  // A linha quebra antes da palavra cujo meio passa da sua parte do total de letras.
  const target = length / parts
  const lines: string[] = []
  let current: string[] = []
  let position = 0
  for (const word of words) {
    const boundary = target * (lines.length + 1)
    if (current.length && lines.length < parts - 1 && position + word.length / 2 > boundary) {
      lines.push(current.join(' '))
      current = []
    }
    current.push(word)
    position += word.length + 1
  }
  if (current.length) lines.push(current.join(' '))
  return lines
}
