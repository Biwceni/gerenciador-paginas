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
  /** Botão de pedir da Vitrine: cabe numa linha no cartão estreito (C3, achado Products-4). */
  productButton: 22,
  /** Preço livre ("R$ 45", "a partir de R$ 120", "sob consulta"), sem espremer o nome do item. */
  price: 24,
  /** Selo do item da Vitrine (B2): "-30%", "Mais vendido", "Venda sob prescrição". */
  productBadge: 24,
  /** Categoria do item da Vitrine (B3): vira um botão do filtro. */
  productCategory: 30,
  /** Texto de "Mais detalhes" do item da Vitrine (B2). */
  productDetails: 1000,
  /** Depoimento: o que cabe ler de uma vez (C7, achado Testimonials-3). */
  testimonial: 300,
  /** Frase da Faixa de aviso: uma linha só na faixa. */
  announcement: 70,
  /** Letras que aparecem no Texto simples. As marcações (negrito, parágrafo) não contam. */
  richTextLetters: 10_000,
  /** Teto do HTML do Texto simples, com as marcações: só para nenhuma página ficar gigante. */
  richTextHTML: 60_000,
  /** Selo da faixa fina da Chamada (C4): "Novo", "Até domingo". */
  ctaTag: 20,
  /** Número dos "Números do negócio": "+3.000", "4,9", "24h", "R$ 12,5 milhões" (C4). */
  statValue: 16,
  /** Frase embaixo do número: "bolos entregues". */
  statLabel: 40,
  /** Peças em cada coluna das Colunas. */
  columnPieces: 6,
  /** Seções numa página. */
  sections: 100,
} as const

/** Letras que a pessoa vê num texto com marcações: sem as tags e com as entidades valendo uma. */
export function visibleLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, '_').length
}
