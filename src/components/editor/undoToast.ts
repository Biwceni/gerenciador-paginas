import { toast } from '@payloadcms/ui'
import { setDeep } from '@puckeditor/core'

import type { GetPuck } from './puck'

let current: string | number | null = null

/**
 * Aviso de remoção com "Desfazer" (seção, peça, item de lista ou foto: achados 4.3 e 5.5). Só um
 * de cada vez; qualquer outra mudança na página fecha o aviso (`dismissUndo`, no `onAction` do
 * editor), porque o Desfazer volta a última mudança e ela já não seria a remoção.
 */
export function showUndo(message: string, undo: () => void) {
  dismissUndo()
  current = toast.info(message, { action: { label: 'Desfazer', onClick: undo } })
}

export function dismissUndo() {
  if (current === null) return
  toast.dismiss(current)
  current = null
}

/**
 * Desfaz uma remoção dentro de uma seção (item de lista, foto) devolvendo o valor de antes ao
 * campo, pela seção (`sectionId`) e pelo caminho do campo (`items`, `groups[0].items`). Não usa o
 * Desfazer do Puck: ele guarda a mudança só um instante depois, e um clique rápido voltaria outra
 * coisa.
 */
export function restoreField(getPuck: GetPuck, sectionId: string, path: string, before: unknown) {
  const puck = getPuck()
  const item = puck.getItemById(sectionId)
  const selector = puck.getSelectorForId(sectionId)
  if (!item || !selector) return
  puck.dispatch({
    type: 'replace',
    destinationIndex: selector.index,
    destinationZone: selector.zone,
    data: { ...item, props: setDeep(item.props, path, before) },
  })
}
