const ROOT_ZONE = 'root:default-zone'

/**
 * Onde entra a seção escolhida na lista: abaixo da seção selecionada e, sem seleção, no fim da
 * página. Com uma peça selecionada dentro das Colunas, abaixo da seção Colunas.
 */
export function insertIndex(
  content: readonly { props: { id: string } }[],
  selector: { index: number; zone?: string } | null | undefined,
): number {
  if (!selector) return content.length
  if (!selector.zone || selector.zone === ROOT_ZONE) {
    return Math.min(selector.index + 1, content.length)
  }
  const parentId = selector.zone.split(':')[0]
  const parent = content.findIndex((item) => item.props.id === parentId)
  return parent < 0 ? content.length : parent + 1
}
