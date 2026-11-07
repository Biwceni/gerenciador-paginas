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

/** Primeira frase da apresentação, se for curta: vai embaixo do nome, no topo do site. */
export function shortTagline(tagline: string | null | undefined, max = 48): string | null {
  const [sentence = ''] = (tagline ?? '').trim().split(/(?<=[.!?])\s/)
  const first = sentence.replace(/\.$/, '')
  return first && first.length <= max ? first : null
}
