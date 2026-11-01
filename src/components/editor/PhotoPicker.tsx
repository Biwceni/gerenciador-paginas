'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react'

import { PhotoDrop, UploadTiles } from '@/components/panel/PhotoUploadParts'
import { usePhotoUploads } from '@/components/panel/usePhotoUploads'
import { photoLabel } from '@/lib/photos'
import type { Media } from '@/payload-types'

import { thumbnailURL } from './context'
import { Dialog } from './Dialog'

type Props = {
  photos: Media[]
  onPick: (photo: Media) => void
  onUploaded: (photo: Media) => void
  onClose: () => void
}

/**
 * Biblioteca de fotos, com o mesmo envio da tela Fotos (direto do navegador para o Storage). Enviou
 * uma só e deu certo: ela já é a escolhida. Enviou várias: elas aparecem na lista, para escolher.
 */
export function PhotoPicker({ photos, onPick, onUploaded, onClose }: Props) {
  const [query, setQuery] = useState('')
  const uploads = usePhotoUploads({
    onUploaded,
    onFinished: ({ uploaded, problems }) => {
      if (uploaded.length === 1 && !problems) onPick(uploaded[0])
    },
  })
  const search = query.trim().toLowerCase()
  const shown = search
    ? photos.filter((photo) =>
        `${photo.alt ?? ''} ${photo.filename ?? ''}`.toLowerCase().includes(search),
      )
    : photos

  return (
    <Dialog
      description="A descrição de cada foto ajuda no Google e em leitores de tela."
      onClose={onClose}
      title="Escolha uma foto"
      wide
    >
      <PhotoDrop uploads={uploads} />
      {photos.length > 8 && (
        <div className="ed-picker-bar">
          <input
            aria-label="Procurar foto"
            className="ed-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Procurar pela descrição"
            type="search"
            value={query}
          />
        </div>
      )}

      {uploads.items.length > 0 && (
        <ul className="gp-media__grid">
          <UploadTiles uploads={uploads} />
        </ul>
      )}

      {shown.length ? (
        <div className="ed-media-grid">
          {shown.map((photo) => (
            <button
              className="ed-media-item"
              key={photo.id}
              onClick={() => onPick(photo)}
              type="button"
            >
              <img alt="" src={thumbnailURL(photo)} />
              <span>{photoLabel(photo)}</span>
              {!photo.alt?.trim() && <span className="gp-media__noalt">Sem descrição</span>}
            </button>
          ))}
        </div>
      ) : (
        <p className="ed-muted">
          {photos.length
            ? 'Nenhuma foto com essa descrição.'
            : 'Ainda não há fotos. Envie a primeira.'}
        </p>
      )}
    </Dialog>
  )
}
