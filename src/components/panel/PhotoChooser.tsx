'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import React from 'react'

import { thumbnailURL } from '@/components/editor/context'
import { photoLabel } from '@/lib/photos'
import type { Media } from '@/payload-types'

import { PanelDialog } from './PanelDialog'
import { PhotoDrop, UploadTiles } from './PhotoUploadParts'
import { usePhotoUploads } from './usePhotoUploads'

type Props = {
  title: string
  photos: Media[]
  onPick: (photo: Media) => void
  onUploaded: (photo: Media) => void
  onClose: () => void
}

/**
 * Escolher uma foto da biblioteca, ou enviar novas (direto ao Storage). Enviou uma só e deu certo:
 * ela já é a escolhida. Enviou várias: elas aparecem na lista, para escolher.
 */
export function PhotoChooser({ title, photos, onPick, onUploaded, onClose }: Props) {
  const uploads = usePhotoUploads({
    onUploaded,
    onFinished: ({ uploaded, problems }) => {
      if (uploaded.length === 1 && !problems) onPick(uploaded[0])
    },
  })

  return (
    <PanelDialog onClose={onClose} title={title} wide>
      <PhotoDrop uploads={uploads} />
      {photos.length || uploads.items.length ? (
        <ul className="gp-media__grid">
          <UploadTiles uploads={uploads} />
          {photos.map((photo) => (
            <li key={photo.id}>
              <button className="gp-media__item" onClick={() => onPick(photo)} type="button">
                <img alt="" src={thumbnailURL(photo)} />
                <span className="gp-media__name">{photoLabel(photo)}</span>
                {!photo.alt?.trim() && <span className="gp-media__noalt">Sem descrição</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="gp-muted">Ainda não há fotos. Envie a primeira.</p>
      )}
    </PanelDialog>
  )
}
