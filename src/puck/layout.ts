// Arrumação das listas das seções pela quantidade de itens (redesign v3, entrega 4): nenhuma foto da
// galeria nem depoimento fica sozinho na última linha.

/**
 * Colunas da galeria em grade no computador. Até 4 fotos, uma linha só; depois, 3 ou 4 colunas,
 * de preferência sem sobra e nunca com 1 foto sozinha na última linha (a sobra fica no centro).
 * Exemplos: 5 → 3 + 2; 7 → 4 + 3; 10 → 4 + 4 + 2.
 */
export function galleryColumns(count: number): number {
  if (count <= 4) return Math.max(count, 1)
  const options = [3, 4]
  return (
    options.find((columns) => count % columns === 0) ??
    options.find((columns) => count % columns !== 1) ??
    5
  )
}

/**
 * Colunas dos depoimentos no computador: 3 depoimentos ficam sempre em 3 colunas; 4 em 2 + 2; 5 em
 * 3 + 2. A última linha estica para ocupar a largura (CSS), então nada fica pela metade.
 */
export function testimonialColumns(count: number): number {
  if (count <= 3) return Math.max(count, 1)
  if (count === 4) return 2
  if (count <= 6) return 3
  return 4
}

/**
 * Link do WhatsApp com a mensagem pronta: "Olá! Quero saber sobre: Bolo de pote". O link das
 * Configurações é `https://wa.me/<número>`; sem número, não há link.
 */
export function whatsAppMessageHref(href: string | null, product: string): string | null {
  if (!href) return null
  const name = product.replace(/\s+/g, ' ').trim()
  if (!name) return href
  const url = new URL(href)
  url.searchParams.set('text', `Olá! Quero saber sobre: ${name}`)
  return url.toString()
}

/**
 * Frases da Faixa de aviso repetidas o bastante para encher uma tela larga: a faixa corre com duas
 * metades iguais (a segunda escondida do leitor de tela) e volta ao começo sem salto.
 */
export function announcementRun(items: string[], minLength = 120): string[] {
  const texts = items.map((text) => text.replace(/\s+/g, ' ').trim()).filter(Boolean)
  if (!texts.length) return []
  const length = texts.reduce((sum, text) => sum + text.length + 4, 0)
  const times = Math.min(10, Math.max(1, Math.ceil(minLength / length)))
  return Array.from({ length: times }, () => texts).flat()
}
