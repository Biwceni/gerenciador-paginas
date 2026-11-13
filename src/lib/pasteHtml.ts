/**
 * Arruma o que se cola no Texto simples vindo do Word ou de uma página (achado 7.4). O texto do
 * site só tem parágrafo, subtítulo, listas e links:
 * - cada linha de uma tabela vira um parágrafo, com as células separadas por " · " (antes, "Bolo"
 *   e "R$ 45" viravam "BoloR$ 45");
 * - títulos de qualquer tamanho viram o subtítulo do site, em vez de texto comum.
 * Sem `DOMParser` (no servidor), volta como veio.
 */
export function tidyPastedHTML(html: string): string {
  if (typeof DOMParser === 'undefined' || !/<(table|h[1-6])\b/i.test(html)) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')

  for (const table of [...doc.querySelectorAll('table')]) {
    const lines = [...table.querySelectorAll('tr')]
      .map((row) =>
        [...row.querySelectorAll('th, td')]
          .map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join(' · '),
      )
      .filter(Boolean)
    const parts = lines.map((line) => {
      const paragraph = doc.createElement('p')
      paragraph.textContent = line
      return paragraph
    })
    table.replaceWith(...parts)
  }

  for (const heading of [...doc.querySelectorAll('h1, h2, h4, h5, h6')]) {
    const subtitle = doc.createElement('h3')
    subtitle.textContent = (heading.textContent ?? '').replace(/\s+/g, ' ').trim()
    heading.replaceWith(subtitle)
  }

  return doc.body.innerHTML
}
