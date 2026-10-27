'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import { useDocumentDrawer } from '@payloadcms/ui'
import React, { useState } from 'react'

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
 * Biblioteca de fotos. "Enviar foto" abre a gaveta de envio do próprio Payload, que manda o arquivo
 * direto do navegador para o Storage e pede o texto alternativo.
 */
export function PhotoPicker({ photos, onPick, onUploaded, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [UploadDrawer, , { openDrawer, closeDrawer }] = useDocumentDrawer({
    collectionSlug: 'media',
  })
  const search = query.trim().toLowerCase()
  const shown = search
    ? photos.filter((photo) =>
        `${photo.alt} ${photo.filename ?? ''}`.toLowerCase().includes(search),
      )
    : photos

  return (
    <Dialog
      description="A descrição de cada foto ajuda no Google e em leitores de tela."
      onClose={onClose}
      title="Escolha uma foto"
      wide
    >
      <div className="ed-picker-bar">
        <button className="ed-btn ed-btn--primary" onClick={openDrawer} type="button">
          Enviar foto do computador ou celular
        </button>
        {photos.length > 8 && (
          <input
            aria-label="Procurar foto"
            className="ed-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Procurar pela descrição"
            type="search"
            value={query}
          />
        )}
      </div>

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
              <span>{photo.alt}</span>
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

      <UploadDrawer
        // Sem isso, depois de criar a foto o Payload leva para a tela padrão dela e sai do editor.
        redirectAfterCreate={false}
        onSave={({ doc, operation }) => {
          if (operation !== 'create') return
          closeDrawer()
          onUploaded(doc as Media)
          onPick(doc as Media)
        }}
      />
    </Dialog>
  )
}
