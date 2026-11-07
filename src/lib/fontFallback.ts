import { createFontStack, type FontMetrics } from '@capsizecss/core'

// Fonte de reserva com as medidas da fonte do cliente: enquanto a fonte do Google (copiada para o
// nosso Storage) não chega, o texto aparece numa fonte do aparelho (Arial ou Times New Roman)
// ajustada para ocupar o mesmo espaço. Quando a fonte chega, o texto troca de desenho, mas não de
// tamanho: a página não pula. É o mesmo que o `next/font` faz, com as medidas do pacote
// `@capsizecss/metrics`. Só no servidor (o layout do site): a tabela tem ~4 MB. O nome da fonte de
// reserva é "<fonte> Fallback", e a lista de fontes do site (`fontStack` em `theme.ts`) já o inclui.

type Collection = Record<string, FontMetrics & { category?: string }>

let byName: Promise<Map<string, FontMetrics & { category?: string }>> | null = null

function metricsByName() {
  byName ??= import('@capsizecss/metrics/entireMetricsCollection').then(
    ({ entireMetricsCollection }) => {
      const collection = entireMetricsCollection as unknown as Collection
      return new Map(
        Object.values(collection).map((metrics) => [metrics.familyName.toLowerCase(), metrics]),
      )
    },
  )
  return byName
}

/**
 * O CSS `@font-face` das fontes de reserva das fontes escolhidas. Fonte que o pacote não conhece:
 * fica sem reserva (o site continua com a fonte do aparelho até a do cliente chegar, como antes).
 */
export async function fallbackFontFaces(names: (string | null | undefined)[]): Promise<string> {
  const wanted = [...new Set(names.flatMap((name) => name?.trim() || []))]
  if (!wanted.length) return ''
  const metrics = await metricsByName()
  const serif = metrics.get('times new roman')
  const sans = metrics.get('arial')
  if (!serif || !sans) return ''

  return wanted
    .flatMap((name) => {
      const font = metrics.get(name.toLowerCase())
      if (!font) return []
      const base = font.category === 'serif' ? serif : sans
      const { fontFaces } = createFontStack([{ ...font, familyName: name }, base])
      return [fontFaces]
    })
    .join('\n')
}
