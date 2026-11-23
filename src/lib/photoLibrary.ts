// Biblioteca de fotos para sites maiores (C6): pastas, busca, várias de uma vez e a conta do
// recorte e do giro. Vale na tela Fotos, no seletor do editor e no servidor (nome da pasta).

import { photoLabel } from './photos'

/** Quantas miniaturas entram de cada vez: as outras chegam ao rolar até o fim da lista. */
export const PHOTOS_STEP = 60

/** Limites das pastas: nome curto (cabe no botão) e quantidade que ainda cabe numa linha que rola. */
export const FOLDER_NAME_MAX = 40
export const FOLDERS_MAX = 50

/** Filtro de pasta: todas, as que não estão em pasta nenhuma, ou o número de uma pasta. */
export type FolderFilter = 'all' | 'none' | number

export type PhotoFolder = { id: number; name: string }

type LibraryPhoto = {
  id: number
  alt?: string | null
  filename?: string | null
  folder?: number | { id: number } | null
}

/** O número da pasta da foto, venha ela como número ou como documento. */
export function folderOf(photo: Pick<LibraryPhoto, 'folder'>): number | null {
  const { folder } = photo
  if (folder == null) return null
  return typeof folder === 'number' ? folder : folder.id
}

/** Nome da pasta limpo: sem espaços sobrando, sem quebra de linha, no tamanho máximo. */
export function cleanFolderName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, FOLDER_NAME_MAX)
}

/** Para comparar nomes sem ligar para maiúscula e acento ("Fachada" e "fachada" são a mesma). */
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Já existe outra pasta com esse nome? */
export function folderNameTaken(name: string, folders: readonly PhotoFolder[], except?: number) {
  const key = fold(cleanFolderName(name))
  return folders.some((folder) => folder.id !== except && fold(folder.name) === key)
}

/** A busca acha pela descrição e pelo nome do arquivo, sem ligar para acento. */
export function matchesSearch(photo: LibraryPhoto, query: string): boolean {
  const search = fold(query.trim())
  if (!search) return true
  return fold(`${photoLabel(photo)} ${photo.alt ?? ''} ${photo.filename ?? ''}`).includes(search)
}

export function inFolder(photo: LibraryPhoto, filter: FolderFilter): boolean {
  if (filter === 'all') return true
  const folder = folderOf(photo)
  return filter === 'none' ? folder === null : folder === filter
}

/** Quantas fotos há em cada pasta, e quantas estão fora de pasta. */
export function folderCounts(photos: readonly LibraryPhoto[]) {
  const counts = new Map<number | 'none', number>()
  for (const photo of photos) {
    const key = folderOf(photo) ?? 'none'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** O filtro escolhido some (pasta apagada): volta para todas. */
export function safeFolderFilter(
  filter: FolderFilter,
  folders: readonly PhotoFolder[],
): FolderFilter {
  if (typeof filter !== 'number') return filter
  return folders.some((folder) => folder.id === filter) ? filter : 'all'
}

/**
 * Escolha de várias fotos, na ordem dos toques (C6): tocar de novo tira, e as outras sobem um
 * número. `max` é quanto ainda cabe na seção: passou disso, o toque não entra.
 */
export function toggleInOrder(chosen: readonly number[], id: number, max: number): number[] {
  if (chosen.includes(id)) return chosen.filter((item) => item !== id)
  if (chosen.length >= max) return [...chosen]
  return [...chosen, id]
}

// --- Cortar e girar -------------------------------------------------------------------------

/** Giro em quartos de volta, no sentido do relógio. */
export type Turn = 0 | 90 | 180 | 270

export function turn(current: Turn, direction: 1 | -1): Turn {
  return ((((current + direction * 90) % 360) + 360) % 360) as Turn
}

/** Tamanho da foto depois do giro: de lado, largura e altura trocam. */
export function turnedSize(width: number, height: number, rotation: Turn) {
  return rotation % 180 === 0 ? { width, height } : { width: height, height: width }
}

/** Recorte em frações da foto já girada (0 a 1), para não depender do tamanho da tela. */
export type Crop = { x: number; y: number; width: number; height: number }

export const FULL_CROP: Crop = { x: 0, y: 0, width: 1, height: 1 }

/** O menor recorte: 5% de cada lado, para a alça não sumir debaixo do dedo. */
export const CROP_MIN = 0.05

/** Proporções do recorte. `null` é livre. */
export const CROP_RATIOS: { label: string; ratio: number | null }[] = [
  { label: 'Livre', ratio: null },
  { label: 'Quadrada', ratio: 1 },
  { label: 'Deitada 4:3', ratio: 4 / 3 },
  { label: 'Larga 16:9', ratio: 16 / 9 },
  { label: 'Em pé 3:4', ratio: 3 / 4 },
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Mantém o recorte dentro da foto e com o tamanho mínimo. */
export function clampCrop(crop: Crop): Crop {
  const width = clamp(crop.width, CROP_MIN, 1)
  const height = clamp(crop.height, CROP_MIN, 1)
  return {
    width,
    height,
    x: clamp(crop.x, 0, 1 - width),
    y: clamp(crop.y, 0, 1 - height),
  }
}

/**
 * O maior recorte com a proporção pedida (largura ÷ altura, em pixels), no centro da foto girada.
 * `null`: a foto inteira.
 */
export function cropForRatio(ratio: number | null, width: number, height: number): Crop {
  if (!ratio || !width || !height) return FULL_CROP
  const photoRatio = width / height
  if (photoRatio > ratio) {
    const share = ratio / photoRatio
    return { x: (1 - share) / 2, y: 0, width: share, height: 1 }
  }
  const share = photoRatio / ratio
  return { x: 0, y: (1 - share) / 2, width: 1, height: share }
}

/**
 * Move o recorte inteiro, ou puxa um dos cantos, mantendo a proporção quando há uma. `dx`/`dy` em
 * frações da foto girada. `aspect` é a proporção em frações (proporção em px ÷ proporção da foto).
 */
export function dragCrop(
  crop: Crop,
  handle: 'move' | 'nw' | 'ne' | 'sw' | 'se',
  dx: number,
  dy: number,
  aspect: number | null,
): Crop {
  if (handle === 'move') return clampCrop({ ...crop, x: crop.x + dx, y: crop.y + dy })
  const left = handle === 'nw' || handle === 'sw'
  const top = handle === 'nw' || handle === 'ne'
  // O canto oposto fica parado.
  const fixedX = left ? crop.x + crop.width : crop.x
  const fixedY = top ? crop.y + crop.height : crop.y
  let width = crop.width + (left ? -dx : dx)
  let height = crop.height + (top ? -dy : dy)
  const maxWidth = left ? fixedX : 1 - fixedX
  const maxHeight = top ? fixedY : 1 - fixedY
  width = clamp(width, CROP_MIN, maxWidth)
  height = clamp(height, CROP_MIN, maxHeight)
  if (aspect) {
    // O lado que mais mexeu manda; o outro acompanha, sem passar da borda.
    if (Math.abs(dx) >= Math.abs(dy) * aspect) height = width / aspect
    else width = height * aspect
    if (height > maxHeight) {
      height = maxHeight
      width = height * aspect
    }
    if (width > maxWidth) {
      width = maxWidth
      height = width / aspect
    }
  }
  return {
    x: left ? fixedX - width : fixedX,
    y: top ? fixedY - height : fixedY,
    width,
    height,
  }
}

/** O recorte em pixels da foto girada, inteiros e dentro da foto. */
export function cropPixels(crop: Crop, width: number, height: number) {
  const x = Math.round(crop.x * width)
  const y = Math.round(crop.y * height)
  return {
    x,
    y,
    width: Math.max(1, Math.min(width - x, Math.round(crop.width * width))),
    height: Math.max(1, Math.min(height - y, Math.round(crop.height * height))),
  }
}

/** A foto pronta não passa disto no lado maior: celulares tiram fotos enormes. */
export const EDITED_MAX_SIDE = 4000

/** Escala para caber em `EDITED_MAX_SIDE`, sem aumentar foto pequena. */
export function editedScale(width: number, height: number): number {
  return Math.min(1, EDITED_MAX_SIDE / Math.max(width, height))
}

/** Foi mexido: girou ou cortou alguma coisa. */
export function isEdited(rotation: Turn, crop: Crop): boolean {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.002
  return (
    rotation !== 0 ||
    !near(crop.x, 0) ||
    !near(crop.y, 0) ||
    !near(crop.width, 1) ||
    !near(crop.height, 1)
  )
}
