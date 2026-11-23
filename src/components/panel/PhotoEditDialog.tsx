'use client'

import { useUploadHandlers } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'

import {
  clampCrop,
  type Crop,
  CROP_RATIOS,
  cropForRatio,
  cropPixels,
  dragCrop,
  editedScale,
  FULL_CROP,
  isEdited,
  turn,
  type Turn,
  turnedSize,
} from '@/lib/photoLibrary'
import { PHOTO_MAX_BYTES, photoLabel } from '@/lib/photos'
import type { Media } from '@/payload-types'

import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'
import { replacePhotoFile } from './uploadPhoto'

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se'

/** Tamanho máximo da prévia dentro da janela. */
const STAGE_WIDTH = 640
const STAGE_HEIGHT = 400

/** Tipo do arquivo pronto: foto com fundo transparente continua PNG ou WebP. */
function outputType(mime: string | null | undefined): { type: string; ext: string } {
  if (mime === 'image/webp') return { type: 'image/webp', ext: 'webp' }
  if (mime === 'image/png' || mime === 'image/gif' || mime === 'image/avif') {
    return { type: 'image/png', ext: 'png' }
  }
  return { type: 'image/jpeg', ext: 'jpg' }
}

/** Desenha a foto girada e cortada num canvas, na escala pedida. */
function draw(image: HTMLImageElement, rotation: Turn, crop: Crop, scale: number) {
  const turned = turnedSize(image.naturalWidth, image.naturalHeight, rotation)
  const area = cropPixels(crop, turned.width, turned.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(area.width * scale))
  canvas.height = Math.max(1, Math.round(area.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas')
  context.scale(scale, scale)
  context.translate(-area.x, -area.y)
  context.translate(turned.width / 2, turned.height / 2)
  context.rotate((rotation * Math.PI) / 180)
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
  return canvas
}

type Props = {
  apiRoute: string
  photo: Media
  onClose: () => void
  onSaved: (photo: Media) => void
}

/**
 * Cortar e girar a foto no painel (extra do C6). O arquivo novo toma o lugar do antigo na mesma
 * foto, então ela muda em todas as páginas que a usam. O recorte é guardado em frações da foto
 * girada: a prévia pequena e o arquivo grande saem da mesma conta.
 */
export function PhotoEditDialog({ apiRoute, photo, onClose, onSaved }: Props) {
  const { getUploadHandler } = useUploadHandlers()
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [failed, setFailed] = useState(false)
  const [rotation, setRotation] = useState<Turn>(0)
  const [ratioIndex, setRatioIndex] = useState(0)
  const [crop, setCrop] = useState<Crop>(FULL_CROP)
  const [saving, setSaving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ handle: Handle; x: number; y: number; crop: Crop } | null>(null)

  // A foto original, inteira (não a miniatura): é dela que sai o arquivo novo.
  useEffect(() => {
    const source = photo.url
    if (!source) return
    const element = new Image()
    element.crossOrigin = 'anonymous'
    element.onload = () => setImage(element)
    element.onerror = () => setFailed(true)
    element.src = source
  }, [photo.url])

  const turned = image
    ? turnedSize(image.naturalWidth, image.naturalHeight, rotation)
    : { width: 4, height: 3 }
  const fit = Math.min(STAGE_WIDTH / turned.width, STAGE_HEIGHT / turned.height, 1)
  const stageSize = {
    width: Math.round(turned.width * fit),
    height: Math.round(turned.height * fit),
  }
  const ratio = CROP_RATIOS[ratioIndex].ratio
  // A proporção em frações da foto girada (a conta do recorte trabalha em frações).
  const aspect = ratio ? ratio / (turned.width / turned.height) : null

  // Prévia: a foto girada inteira, no tamanho da tela; o recorte fica por cima.
  useEffect(() => {
    const canvas = preview.current
    if (!image || !canvas) return
    const small = draw(image, rotation, FULL_CROP, fit)
    canvas.width = small.width
    canvas.height = small.height
    canvas.getContext('2d')?.drawImage(small, 0, 0)
  }, [image, rotation, fit])

  const rotate = (direction: 1 | -1) => {
    const next = turn(rotation, direction)
    setRotation(next)
    if (image) {
      const size = turnedSize(image.naturalWidth, image.naturalHeight, next)
      setCrop(cropForRatio(ratio, size.width, size.height))
    }
  }
  const chooseRatio = (index: number) => {
    setRatioIndex(index)
    setCrop(cropForRatio(CROP_RATIOS[index].ratio, turned.width, turned.height))
  }

  const onPointerDown = (handle: Handle, event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    ;(event.target as Element).setPointerCapture?.(event.pointerId)
    drag.current = { handle, x: event.clientX, y: event.clientY, crop }
  }
  const onPointerMove = (event: React.PointerEvent) => {
    const current = drag.current
    const box = stage.current?.getBoundingClientRect()
    if (!current || !box?.width || !box.height) return
    const dx = (event.clientX - current.x) / box.width
    const dy = (event.clientY - current.y) / box.height
    setCrop(dragCrop(current.crop, current.handle, dx, dy, aspect))
  }
  const onPointerUp = () => {
    drag.current = null
  }

  // Teclado: setas movem o recorte; com Shift, mudam o tamanho (puxando o canto de baixo).
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = 0.01
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    setCrop(dragCrop(crop, event.shiftKey ? 'se' : 'move', move[0], move[1], aspect))
  }

  const edited = isEdited(rotation, crop)
  const save = async () => {
    if (!image || !edited) return
    setError(null)
    setSaving(0)
    try {
      const area = cropPixels(clampCrop(crop), turned.width, turned.height)
      const canvas = draw(image, rotation, clampCrop(crop), editedScale(area.width, area.height))
      const { type, ext } = outputType(photo.mimeType)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, type, type === 'image/png' ? undefined : 0.9),
      )
      if (!blob) throw new Error('A foto não ficou pronta. Tente de novo.')
      if (blob.size > PHOTO_MAX_BYTES) {
        throw new Error('A foto pronta passou de 10 MB. Corte um pedaço menor.')
      }
      const stem = (photo.filename ?? 'foto').replace(/\.[^.]+$/, '').replace(/-editada$/, '')
      const direct = Boolean(getUploadHandler({ collectionSlug: 'media' }))
      const saved = await replacePhotoFile(
        apiRoute,
        photo.id,
        blob,
        `${stem}-editada.${ext}`,
        direct,
        (progress) => setSaving(progress),
      )
      onSaved(saved)
    } catch (err) {
      // Canvas "sujo": o Storage não deixou ler a foto daqui (falta de permissão de origem).
      const message =
        err instanceof DOMException && err.name === 'SecurityError'
          ? 'Não deu para editar esta foto aqui. Envie a foto já cortada pela opção “Trocar em todo o site”.'
          : err instanceof Error
            ? err.message
            : 'Tente de novo.'
      setError(message)
      setSaving(null)
    }
  }

  const pct = (value: number) => `${value * 100}%`
  const out = image
    ? cropPixels(crop, turned.width, turned.height)
    : { width: 0, height: 0, x: 0, y: 0 }

  return (
    <PanelDialog onClose={onClose} title={`Cortar ou girar: ${photoLabel(photo)}`} wide>
      <div className="gp-photoedit">
        <div className="gp-photoedit__tools">
          <div aria-label="Girar" className="gp-actions" role="group">
            <button
              className="gp-btn gp-btn--sm"
              disabled={!image || saving !== null}
              onClick={() => rotate(-1)}
              type="button"
            >
              <PanelIcon name="rotate-left" size={14} />
              Girar para a esquerda
            </button>
            <button
              className="gp-btn gp-btn--sm"
              disabled={!image || saving !== null}
              onClick={() => rotate(1)}
              type="button"
            >
              <PanelIcon name="rotate-right" size={14} />
              Girar para a direita
            </button>
          </div>
          <div aria-label="Formato do recorte" className="gp-seg gp-photoedit__ratios" role="group">
            {CROP_RATIOS.map((option, index) => (
              <button
                aria-pressed={ratioIndex === index}
                disabled={!image || saving !== null}
                key={option.label}
                onClick={() => chooseRatio(index)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {failed ? (
          <p className="gp-error" role="alert">
            Não deu para abrir esta foto. Confira a internet e tente de novo.
          </p>
        ) : !image ? (
          <p className="gp-muted" role="status">
            Abrindo a foto…
          </p>
        ) : (
          <div className="gp-photoedit__area">
            <div
              className="gp-photoedit__stage"
              onPointerCancel={onPointerUp}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              ref={stage}
              style={{ width: stageSize.width, aspectRatio: `${turned.width} / ${turned.height}` }}
            >
              <canvas aria-hidden="true" className="gp-photoedit__canvas" ref={preview} />
              <div
                aria-describedby="pe-keys"
                aria-label={`Área do recorte: ${out.width} × ${out.height} px`}
                className="gp-photoedit__crop"
                onKeyDown={onKeyDown}
                onPointerDown={(event) => onPointerDown('move', event)}
                role="group"
                style={{
                  left: pct(crop.x),
                  top: pct(crop.y),
                  width: pct(crop.width),
                  height: pct(crop.height),
                }}
                tabIndex={0}
              >
                {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
                  <span
                    aria-hidden="true"
                    className={`gp-photoedit__handle gp-photoedit__handle--${handle}`}
                    key={handle}
                    onPointerDown={(event) => onPointerDown(handle, event)}
                  />
                ))}
              </div>
            </div>
            <p className="gp-hint" id="pe-keys">
              Arraste a área clara ou os cantos. No teclado, as setas movem o recorte e Shift com as
              setas muda o tamanho. A foto fica com {out.width.toLocaleString('pt-BR')} ×{' '}
              {out.height.toLocaleString('pt-BR')} px.
            </p>
          </div>
        )}

        <p className="gp-small gp-muted">
          A foto muda em todas as páginas que a usam. O ponto que não pode ser cortado volta para o
          centro.
        </p>
        {error && (
          <p className="gp-error" role="alert">
            {error}
          </p>
        )}
        <div className="gp-actions gp-photoedit__foot">
          <button
            className="gp-btn gp-btn--ghost"
            disabled={!edited || saving !== null}
            onClick={() => {
              setRotation(0)
              setRatioIndex(0)
              setCrop(FULL_CROP)
            }}
            type="button"
          >
            Desfazer tudo
          </button>
          <span className="gp-photoedit__spacer" />
          <button className="gp-btn" disabled={saving !== null} onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="gp-btn gp-btn--primary"
            disabled={!image || !edited || saving !== null}
            onClick={save}
            type="button"
          >
            {saving !== null ? `Salvando… ${saving}%` : 'Salvar a foto'}
          </button>
        </div>
      </div>
    </PanelDialog>
  )
}
