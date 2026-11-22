'use client'

import { createUsePuck, useGetPuck } from '@puckeditor/core'
import React, { useState } from 'react'

import {
  fitTable,
  looksLikeTable,
  parseSpreadsheet,
  pasteAt,
  type TableValue,
} from '@/lib/tablePaste'
import { LIMITS } from '@/puck/limits'
import { TABLE_MAX_COLUMNS, TABLE_MAX_ROWS } from '@/puck/schema'

import { showUndo } from './undoToast'

const usePuck = createUsePuck()

const LIMITS_TABLE = {
  maxColumns: TABLE_MAX_COLUMNS,
  maxRows: TABLE_MAX_ROWS,
  maxCell: LIMITS.tableCell,
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * Campo da Tabela (C5): as células num quadro de caixinhas, mais "Colar da planilha". Edita as
 * duas partes da seção juntas (o cabeçalho `head` e as linhas `rows`), numa mudança só do
 * histórico. Colar várias células numa caixinha também cola a partir dela.
 */
export function TableField({ readOnly }: { readOnly?: boolean }) {
  const getPuck = useGetPuck()
  const selected = usePuck((state) => state.selectedItem)
  const [status, setStatus] = useState('')
  const props = (selected?.props ?? {}) as Partial<TableValue>
  const head = props.head?.length ? props.head : ['']
  const rows = (props.rows ?? []).map((row) => head.map((_, index) => row[index] ?? ''))

  const save = (next: TableValue) => {
    const puck = getPuck()
    const id = puck.selectedItem?.props.id as string | undefined
    const item = id ? puck.getItemById(id) : undefined
    const selector = id ? puck.getSelectorForId(id) : undefined
    if (!item || !selector) return
    puck.dispatch({
      type: 'replace',
      destinationIndex: selector.index,
      destinationZone: selector.zone,
      data: { ...item, props: { ...item.props, head: next.head, rows: next.rows } },
    })
  }

  const setCell = (row: number, column: number, value: string) => {
    if (row < 0) return save({ head: head.map((v, c) => (c === column ? value : v)), rows })
    save({
      head,
      rows: rows.map((cells, r) =>
        r === row ? cells.map((v, c) => (c === column ? value : v)) : cells,
      ),
    })
  }

  const pasteWhole = (text: string) => {
    const cells = parseSpreadsheet(text)
    if (!cells.length) return
    const before = { head, rows }
    const table = fitTable(cells, LIMITS_TABLE)
    save(table)
    const size = `${plural(table.head.length, 'coluna', 'colunas')} e ${plural(table.rows.length, 'linha', 'linhas')}`
    setStatus(
      table.cut
        ? `A planilha tinha ${plural(table.cut.columns, 'coluna', 'colunas')} e ${plural(table.cut.rows, 'linha', 'linhas')}. Entraram ${size}, o máximo da tabela.`
        : `Tabela colada: ${size}. A primeira linha virou o nome das colunas.`,
    )
    showUndo('Tabela colada.', () => save(before))
  }

  const pasteCell = (
    event: React.ClipboardEvent<HTMLInputElement>,
    row: number,
    column: number,
  ) => {
    const text = event.clipboardData.getData('text/plain')
    if (!looksLikeTable(text)) return
    event.preventDefault()
    save(pasteAt({ head, rows }, parseSpreadsheet(text), { row, column }, LIMITS_TABLE))
    setStatus('Células coladas a partir da caixinha escolhida.')
  }

  const addColumn = () => save({ head: [...head, ''], rows: rows.map((cells) => [...cells, '']) })
  const removeColumn = (column: number) => {
    const before = { head, rows }
    save({
      head: head.filter((_, c) => c !== column),
      rows: rows.map((cells) => cells.filter((_, c) => c !== column)),
    })
    showUndo('Coluna tirada da tabela.', () => save(before))
  }
  const addRow = () => save({ head, rows: [...rows, head.map(() => '')] })
  const removeRow = (row: number) => {
    const before = { head, rows }
    save({ head, rows: rows.filter((_, r) => r !== row) })
    showUndo('Linha tirada da tabela.', () => save(before))
  }

  const cellInput = (row: number, column: number, value: string) => (
    <input
      aria-label={
        row < 0 ? `Nome da coluna ${column + 1}` : `Linha ${row + 1}, coluna ${column + 1}`
      }
      className={`ed-table__cell${row < 0 ? ' ed-table__cell--head' : ''}`}
      disabled={readOnly}
      maxLength={LIMITS.tableCell}
      onChange={(event) => setCell(row, column, event.target.value)}
      onPaste={(event) => pasteCell(event, row, column)}
      value={value}
    />
  )

  return (
    <div className="ed-table">
      <label className="ed-table__paste">
        <span className="ed-table__paste-title">Colar da planilha</span>
        <textarea
          className="ed-input"
          disabled={readOnly}
          onChange={() => undefined}
          onPaste={(event) => {
            event.preventDefault()
            pasteWhole(event.clipboardData.getData('text/plain'))
          }}
          placeholder="Copie as células na planilha (Excel, Google Planilhas) e cole aqui."
          rows={2}
          value=""
        />
      </label>
      <p aria-live="polite" className="ed-hint" role="status">
        {status || 'Colar aqui troca a tabela toda. Colar numa caixinha cola a partir dela.'}
      </p>
      <div className="ed-table__scroll">
        <table className="ed-table__grid">
          <thead>
            <tr>
              {head.map((value, column) => (
                <th key={column} scope="col">
                  <span className="ed-table__col">
                    {cellInput(-1, column, value)}
                    {head.length > 1 && (
                      <button
                        aria-label={`Tirar a coluna ${column + 1}`}
                        className="ed-table__remove"
                        disabled={readOnly}
                        onClick={() => removeColumn(column)}
                        title="Tirar a coluna"
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </span>
                </th>
              ))}
              <td />
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, row) => (
              <tr key={row}>
                {cells.map((value, column) => (
                  <td key={column}>{cellInput(row, column, value)}</td>
                ))}
                <td>
                  <button
                    aria-label={`Tirar a linha ${row + 1}`}
                    className="ed-table__remove"
                    disabled={readOnly}
                    onClick={() => removeRow(row)}
                    title="Tirar a linha"
                    type="button"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ed-table__actions">
        <button
          className="ed-btn ed-btn--sm"
          disabled={readOnly || rows.length >= TABLE_MAX_ROWS}
          onClick={addRow}
          type="button"
        >
          + Linha
        </button>
        <button
          className="ed-btn ed-btn--sm"
          disabled={readOnly || head.length >= TABLE_MAX_COLUMNS}
          onClick={addColumn}
          type="button"
        >
          + Coluna
        </button>
        <span className="ed-hint">
          {plural(head.length, 'coluna', 'colunas')} de {TABLE_MAX_COLUMNS},{' '}
          {plural(rows.length, 'linha', 'linhas')} de {TABLE_MAX_ROWS}
        </span>
      </div>
    </div>
  )
}
