import { describe, expect, it } from 'vitest'

import {
  clampCrop,
  cleanFolderName,
  CROP_MIN,
  cropForRatio,
  cropPixels,
  dragCrop,
  editedScale,
  folderCounts,
  folderNameTaken,
  FULL_CROP,
  inFolder,
  isEdited,
  matchesSearch,
  safeFolderFilter,
  toggleInOrder,
  turn,
  turnedSize,
} from '@/lib/photoLibrary'
import { PERSONALITIES, PERSONALITY_LABELS } from '@/lib/theme'

describe('C6: pastas e busca', () => {
  const photos = [
    { id: 1, alt: 'Fachada da loja', filename: 'fachada.jpg', folder: 10 },
    { id: 2, alt: '', filename: 'Promoção-Verão.png', folder: { id: 10 } },
    { id: 3, alt: 'Equipe', filename: 'equipe.jpg', folder: null },
  ]

  it('nome de pasta limpo e sem repetir (sem ligar para maiúscula e acento)', () => {
    expect(cleanFolderName('  Fachada   e\nlojas ')).toBe('Fachada e lojas')
    expect(cleanFolderName('x'.repeat(60))).toHaveLength(40)
    const folders = [{ id: 1, name: 'Promoções' }]
    expect(folderNameTaken('promocoes', folders)).toBe(true)
    expect(folderNameTaken('PROMOÇÕES ', folders, 1)).toBe(false)
    expect(folderNameTaken('Fachada', folders)).toBe(false)
  })

  it('filtra por pasta, sem pasta e todas, e conta cada uma', () => {
    expect(photos.filter((photo) => inFolder(photo, 10)).map((photo) => photo.id)).toEqual([1, 2])
    expect(photos.filter((photo) => inFolder(photo, 'none')).map((photo) => photo.id)).toEqual([3])
    expect(photos.filter((photo) => inFolder(photo, 'all'))).toHaveLength(3)
    const counts = folderCounts(photos)
    expect(counts.get(10)).toBe(2)
    expect(counts.get('none')).toBe(1)
  })

  it('pasta apagada volta para todas', () => {
    expect(safeFolderFilter(10, [{ id: 10, name: 'A' }])).toBe(10)
    expect(safeFolderFilter(10, [])).toBe('all')
    expect(safeFolderFilter('none', [])).toBe('none')
  })

  it('busca pela descrição e pelo nome do arquivo, sem acento; palavra que não existe não acha', () => {
    expect(matchesSearch(photos[1], 'promocao')).toBe(true)
    expect(matchesSearch(photos[0], 'FACHADA')).toBe(true)
    expect(matchesSearch(photos[2], 'xyzzy')).toBe(false)
    expect(matchesSearch(photos[2], '   ')).toBe(true)
  })

  it('várias de uma vez: a ordem é a dos toques, tocar de novo tira, e não passa do que cabe', () => {
    let chosen: number[] = []
    chosen = toggleInOrder(chosen, 5, 3)
    chosen = toggleInOrder(chosen, 2, 3)
    chosen = toggleInOrder(chosen, 9, 3)
    expect(chosen).toEqual([5, 2, 9])
    expect(toggleInOrder(chosen, 7, 3)).toEqual([5, 2, 9])
    expect(toggleInOrder(chosen, 2, 3)).toEqual([5, 9])
  })
})

describe('C6 extra: cortar e girar', () => {
  it('gira em quartos de volta e troca largura e altura de lado', () => {
    expect(turn(0, -1)).toBe(270)
    expect(turn(270, 1)).toBe(0)
    expect(turnedSize(1200, 800, 90)).toEqual({ width: 800, height: 1200 })
    expect(turnedSize(1200, 800, 180)).toEqual({ width: 1200, height: 800 })
  })

  it('recorte com proporção fica no centro e usa o máximo da foto', () => {
    expect(cropForRatio(1, 1600, 800)).toEqual({ x: 0.25, y: 0, width: 0.5, height: 1 })
    const tall = cropForRatio(16 / 9, 800, 800)
    expect(tall.width).toBe(1)
    expect(tall.height).toBeCloseTo(0.5625)
    expect(cropForRatio(null, 10, 10)).toEqual(FULL_CROP)
  })

  it('arrastar não sai da foto e respeita o tamanho mínimo', () => {
    const moved = dragCrop({ x: 0.5, y: 0.5, width: 0.4, height: 0.4 }, 'move', 0.5, 0.5, null)
    expect(moved).toEqual({ x: 0.6, y: 0.6, width: 0.4, height: 0.4 })
    const shrunk = dragCrop({ x: 0, y: 0, width: 0.5, height: 0.5 }, 'se', -1, -1, null)
    expect(shrunk.width).toBe(CROP_MIN)
    expect(shrunk.height).toBe(CROP_MIN)
    const grown = dragCrop({ x: 0.2, y: 0.2, width: 0.2, height: 0.2 }, 'nw', -1, -1, null)
    expect(grown).toEqual({ x: 0, y: 0, width: 0.4, height: 0.4 })
    expect(clampCrop({ x: -1, y: 2, width: 3, height: 0 })).toEqual({
      x: 0,
      y: 1 - CROP_MIN,
      width: 1,
      height: CROP_MIN,
    })
  })

  it('com proporção, puxar o canto mantém a forma', () => {
    const crop = dragCrop({ x: 0, y: 0, width: 0.4, height: 0.4 }, 'se', 0.3, 0, 1)
    expect(crop.width).toBeCloseTo(crop.height)
    expect(crop.width).toBeCloseTo(0.7)
  })

  it('pixels inteiros dentro da foto e foto enorme diminui para 4000 px', () => {
    expect(cropPixels({ x: 0.25, y: 0, width: 0.5, height: 1 }, 1001, 600)).toEqual({
      x: 250,
      y: 0,
      width: 501,
      height: 600,
    })
    expect(editedScale(8000, 6000)).toBe(0.5)
    expect(editedScale(300, 200)).toBe(1)
    expect(isEdited(0, FULL_CROP)).toBe(false)
    expect(isEdited(90, FULL_CROP)).toBe(true)
  })
})

describe('F2: nomes dos visuais', () => {
  it('Simples, Sóbrio, Impacto, Acolhedor e Revista, cada um com a frase do que muda', () => {
    expect(PERSONALITIES.map((value) => PERSONALITY_LABELS[value].name)).toEqual([
      'Simples',
      'Sóbrio',
      'Impacto',
      'Acolhedor',
      'Revista',
    ])
    for (const value of PERSONALITIES) {
      expect(PERSONALITY_LABELS[value].description.length).toBeGreaterThan(10)
    }
  })
})
