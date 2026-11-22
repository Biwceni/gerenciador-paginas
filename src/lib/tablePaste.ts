/**
 * Colar uma tabela de planilha na seção Tabela (C5). O Excel, o Google Planilhas e o LibreOffice
 * copiam as células como texto separado por tabulação, uma linha por linha; célula com quebra de
 * linha ou aspas vem entre aspas, com as aspas de dentro dobradas.
 */

/** As células do texto copiado, linha por linha. Linhas vazias no fim saem. */
export function parseSpreadsheet(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const source = text.replace(/\r\n?/g, '\n')
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"' && cell === '') {
      quoted = true
    } else if (char === '\t') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell)
  rows.push(row)
  const clean = rows.map((cells) => cells.map((value) => value.replace(/\s+/g, ' ').trim()))
  while (clean.length && clean[clean.length - 1].every((value) => !value)) clean.pop()
  return clean
}

/** O texto parece uma tabela (tem tabulação ou mais de uma linha)? */
export const looksLikeTable = (text: string) => /\t/.test(text) || /\n./.test(text.trim())

export type TableValue = { head: string[]; rows: string[][] }

/**
 * A tabela dentro dos limites: até `maxColumns` colunas e `maxRows` linhas (fora o cabeçalho),
 * cada célula com até `maxCell` letras, e toda linha com uma célula por coluna. `cut` diz se algo
 * ficou de fora, para avisar.
 */
export function fitTable(
  cells: string[][],
  limits: { maxColumns: number; maxRows: number; maxCell: number },
): TableValue & { cut: { columns: number; rows: number } | null } {
  const width = Math.max(1, ...cells.map((row) => row.length))
  const columns = Math.min(width, limits.maxColumns)
  const fit = (row: string[] = []) =>
    Array.from({ length: columns }, (_, index) => (row[index] ?? '').slice(0, limits.maxCell))
  const [first, ...rest] = cells
  const rows = rest.slice(0, limits.maxRows).map(fit)
  const cut =
    width > limits.maxColumns || rest.length > limits.maxRows
      ? { columns: width, rows: rest.length }
      : null
  return { head: fit(first), rows, cut }
}

/**
 * Cola as células a partir de uma célula (`row`, `column`; a linha -1 é o cabeçalho), aumentando
 * a tabela até os limites, sem apagar o que já estava fora da área colada.
 */
export function pasteAt(
  table: TableValue,
  cells: string[][],
  at: { row: number; column: number },
  limits: { maxColumns: number; maxRows: number; maxCell: number },
): TableValue {
  const pastedWidth = Math.max(...cells.map((line) => line.length))
  const columns = Math.min(Math.max(table.head.length, at.column + pastedWidth), limits.maxColumns)
  const all = [table.head, ...table.rows]
  const start = at.row + 1
  const height = Math.min(Math.max(all.length, start + cells.length), limits.maxRows + 1)
  const next = Array.from({ length: height }, (_, r) =>
    Array.from({ length: columns }, (_, c) => all[r]?.[c] ?? ''),
  )
  cells.forEach((line, r) =>
    line.forEach((value, c) => {
      const row = start + r
      const column = at.column + c
      if (row < height && column < columns) next[row][column] = value.slice(0, limits.maxCell)
    }),
  )
  return { head: next[0], rows: next.slice(1) }
}
