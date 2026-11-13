/**
 * Palavras em destaque no título do banner: o título em três partes (antes, o destaque, depois), ou
 * `null` se as palavras estão vazias ou não aparecem no título. Sem diferença de maiúsculas; vale
 * a última vez que aparecem (o destaque costuma ser o fim do título).
 */
export function splitHighlight(title: string, words: string): [string, string, string] | null {
  const target = words.trim()
  if (!target) return null
  const index = title.toLocaleLowerCase('pt-BR').lastIndexOf(target.toLocaleLowerCase('pt-BR'))
  // Uma letra que muda de tamanho ao virar minúscula desalinharia os pedaços: sem destaque.
  if (index < 0 || title.toLocaleLowerCase('pt-BR').length !== title.length) return null
  return [
    title.slice(0, index),
    title.slice(index, index + target.length),
    title.slice(index + target.length),
  ]
}

export type TitleWord = { text: string; start: number; end: number }

/**
 * As palavras do título, com onde cada uma começa e termina, para escolher o destaque tocando
 * nelas. A pontuação do fim ("mão.", "você!") fica fora: o destaque é a palavra.
 */
export function titleWords(title: string): TitleWord[] {
  const words: TitleWord[] = []
  for (const match of title.matchAll(/\S+/g)) {
    const raw = match[0]
    const text = raw.replace(/[.,;:!?…"”’)»]+$/u, '') || raw
    words.push({ text, start: match.index, end: match.index + text.length })
  }
  return words
}

/**
 * Quais palavras do título (primeira e última, pela posição em `titleWords`) as palavras em
 * destaque cobrem, pela mesma regra do site (`splitHighlight`). `null`: nada em destaque.
 */
export function highlightRange(title: string, words: string): [number, number] | null {
  const parts = splitHighlight(title, words)
  if (!parts) return null
  const start = parts[0].length
  const end = start + parts[1].length
  const list = titleWords(title)
  const first = list.findIndex((word) => word.end > start)
  let last = -1
  list.forEach((word, index) => {
    if (word.start < end) last = index
  })
  return first >= 0 && last >= first ? [first, last] : null
}

/** Primeira frase da apresentação, se for curta: vai embaixo do nome, no topo do site. */
export function shortTagline(tagline: string | null | undefined, max = 48): string | null {
  const [sentence = ''] = (tagline ?? '').trim().split(/(?<=[.!?])\s/)
  const first = sentence.replace(/\.$/, '')
  return first && first.length <= max ? first : null
}
