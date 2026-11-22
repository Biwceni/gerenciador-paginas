/**
 * Foto inteira ou preenchendo o espaço (C2). Quando a proporção da foto é muito diferente da do
 * espaço (uma foto em pé num espaço deitado, ou o contrário), preencher corta boa parte dela: o
 * editor já marca "Foto inteira" e avisa.
 */

/** A partir de quanto a foto é "bem mais alta" ou "bem mais larga" que o espaço. */
export const FIT_MISMATCH = 1.6

export type FitMismatch = 'taller' | 'wider' | null

/** A foto (largura e altura) comparada com o espaço (largura / altura). */
export function fitMismatch(
  photo: { width?: number | null; height?: number | null } | null | undefined,
  frame: number,
): FitMismatch {
  if (!photo?.width || !photo.height || !frame) return null
  const ratio = photo.width / photo.height / frame
  if (ratio >= FIT_MISMATCH) return 'wider'
  if (ratio <= 1 / FIT_MISMATCH) return 'taller'
  return null
}

/** O jeito ao escolher uma foto: inteira se ela não combina com o espaço; senão, o de antes. */
export function fitForPick<F extends 'cover' | 'contain'>(
  photo: { width?: number | null; height?: number | null },
  frame: number,
  current: F | undefined,
): 'cover' | 'contain' | undefined {
  return fitMismatch(photo, frame) ? 'contain' : current
}
