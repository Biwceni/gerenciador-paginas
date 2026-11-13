/**
 * Onde, nas opções de uma seção, está a foto `mediaId`: "image", "items[2].image", "images[3]".
 * Serve para trocar a foto tocando nela na prévia. Não entra nas peças das Colunas (cada peça é
 * escolhida à parte). `null`: a foto não é desta seção.
 */
export function findPhotoPath(props: unknown, mediaId: number, path = ''): string | null {
  if (Array.isArray(props)) {
    for (const [index, item] of props.entries()) {
      // Peças das Colunas: `{ type, props }`.
      if (item && typeof item === 'object' && 'type' in item && 'props' in item) continue
      const found = findPhotoPath(item, mediaId, `${path}[${index}]`)
      if (found) return found
    }
    return null
  }
  if (!props || typeof props !== 'object') return null
  if ((props as { mediaId?: unknown }).mediaId === mediaId) return path || null
  for (const [key, value] of Object.entries(props)) {
    const found = findPhotoPath(value, mediaId, path ? `${path}.${key}` : key)
    if (found) return found
  }
  return null
}
