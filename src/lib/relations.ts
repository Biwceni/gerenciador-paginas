/** Id de uma relação do Payload, venha ela como número (depth 0) ou já carregada (depth 1). */
export function relationID(value: number | { id: number } | null | undefined): number | null {
  if (value == null) return null
  return typeof value === 'number' ? value : value.id
}
