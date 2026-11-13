/**
 * Limites de tamanho do conteúdo das páginas. Uma fonte só: o formato (`schema.ts`) recusa o que
 * passa deles, e o editor (`editor-config.tsx`) mostra o contador "32 de 60" no campo. Mudar um
 * número aqui muda as duas pontas juntas.
 */
export const LIMITS = {
  /** Títulos das seções e do banner. */
  title: 120,
  /** Nome da seção no menu (vira a âncora). */
  menuLabel: 40,
  /** Texto de botão: duas ou três palavras ("Pedir pelo WhatsApp"), numa linha só. */
  buttonLabel: 30,
  /** Preço livre ("R$ 45", "a partir de R$ 120", "sob consulta"), sem espremer o nome do item. */
  price: 24,
  /** Frase da Faixa de aviso: uma linha só na faixa. */
  announcement: 70,
  /** Letras que aparecem no Texto simples. As marcações (negrito, parágrafo) não contam. */
  richTextLetters: 10_000,
  /** Teto do HTML do Texto simples, com as marcações: só para nenhuma página ficar gigante. */
  richTextHTML: 60_000,
  /** Peças em cada coluna das Colunas. */
  columnPieces: 6,
  /** Seções numa página. */
  sections: 100,
} as const

/** Letras que a pessoa vê num texto com marcações: sem as tags e com as entidades valendo uma. */
export function visibleLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, '_').length
}
