'use client'

import React, { useState } from 'react'

import type { Media } from '@/payload-types'

import { updatePhotoFocus } from './api'
import { thumbnailURL } from './context'
import './focus.css'

/** Os três recortes que as seções usam, para a pessoa ver o efeito do ponto escolhido. */
const CROPS = [
  { label: 'Quadrada', ratio: '1 / 1' },
  { label: 'Em pé', ratio: '4 / 5' },
  { label: 'Deitada', ratio: '16 / 9' },
] as const

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Ponto de foco da foto (A4: achados G3, TextImage-2 e PK-foco). A pessoa toca no que não pode ser
 * cortado (um rosto, o produto) e todo recorte do site fica centrado ali, em todas as seções. Vale
 * para a foto, não para uma seção: é guardado na própria foto da biblioteca, como a descrição.
 * Pelo teclado, as setas movem o ponto de 5 em 5%.
 */
export function FocusPicker({
  apiRoute,
  photo,
  onSaved,
  readOnly,
  hintClass = 'ed-hint',
}: {
  apiRoute: string
  photo: Media
  onSaved: (photo: Media) => void
  readOnly?: boolean
  /** Classe das frases de ajuda: a do editor ou a do painel (tela Fotos). */
  hintClass?: string
}) {
  const [point, setPoint] = useState({ x: photo.focalX ?? 50, y: photo.focalY ?? 50 })
  const [save, setSave] = useState<SaveState>('idle')
  const src = thumbnailURL(photo)
  const position = `${point.x}% ${point.y}%`

  const choose = async (x: number, y: number) => {
    if (readOnly) return
    const next = { x: clamp(x), y: clamp(y) }
    setPoint(next)
    setSave('saving')
    try {
      const { doc } = await updatePhotoFocus(apiRoute, photo.id, next.x, next.y)
      onSaved(doc)
      setSave('saved')
    } catch {
      setSave('error')
    }
  }

  const onPointer = (event: React.MouseEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    void choose(
      ((event.clientX - box.left) / box.width) * 100,
      ((event.clientY - box.top) / box.height) * 100,
    )
  }

  const onKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const move = {
      ArrowLeft: [-5, 0],
      ArrowRight: [5, 0],
      ArrowUp: [0, -5],
      ArrowDown: [0, 5],
    }[event.key]
    if (!move) return
    event.preventDefault()
    void choose(point.x + move[0], point.y + move[1])
  }

  if (!src) return null

  return (
    <div className="ed-focus">
      <button
        aria-label={`Ponto que não pode ser cortado: ${point.x}% da esquerda, ${point.y}% do alto. Toque na foto ou use as setas para mudar.`}
        className="ed-focus__photo"
        disabled={readOnly}
        onClick={onPointer}
        onKeyDown={onKey}
        style={{ aspectRatio: `${photo.width ?? 4} / ${photo.height ?? 3}` }}
        type="button"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={src} />
        <span
          aria-hidden="true"
          className="ed-focus__dot"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        />
      </button>
      <div aria-hidden="true" className="ed-focus__crops">
        {CROPS.map((crop) => (
          <span className="ed-focus__crop" key={crop.label}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src={src} style={{ aspectRatio: crop.ratio, objectPosition: position }} />
            <span className={hintClass}>{crop.label}</span>
          </span>
        ))}
      </div>
      <span aria-live="polite" className={hintClass}>
        {save === 'saving'
          ? 'Guardando…'
          : save === 'saved'
            ? 'Guardado. Vale para esta foto em todo o site.'
            : save === 'error'
              ? 'Não deu para guardar. Confira a internet e toque de novo.'
              : 'Toque no que não pode ser cortado (um rosto, o produto). Vale para esta foto em todo o site.'}
      </span>
    </div>
  )
}
