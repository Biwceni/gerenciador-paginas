'use client'

// Miniatura do próprio arquivo, ainda no computador da pessoa.
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react'

import { PHOTO_MIME_TYPES } from '@/lib/photos'

import { PanelIcon } from './PanelIcon'
import type { PhotoUpload, PhotoUploads } from './usePhotoUploads'

/** Área de envio: arrastar fotos da pasta ou clicar para escolher várias de uma vez. */
export function PhotoDrop({ uploads }: { uploads: PhotoUploads }) {
  const [over, setOver] = useState(false)

  return (
    <label
      className={`gp-drop${over ? ' gp-drop--over' : ''}`}
      onDragLeave={() => setOver(false)}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        uploads.addFiles(event.dataTransfer.files)
      }}
    >
      <input
        accept={PHOTO_MIME_TYPES.join(',')}
        className="gp-sr"
        id={uploads.inputId}
        multiple
        onChange={(event) => {
          if (event.target.files) uploads.addFiles(event.target.files)
          // Sem isso, escolher o mesmo arquivo de novo não dispara nada.
          event.target.value = ''
        }}
        type="file"
      />
      <PanelIcon name="upload" size={22} />
      <b className="gp-drop__mouse">Arraste as fotos da pasta para cá, ou clique para escolher</b>
      <b className="gp-drop__touch">Toque para escolher as fotos</b>
      <span className="gp-small">
        Várias de uma vez. JPG, PNG, WebP, AVIF ou GIF até 10 MB. A descrição você escreve depois,
        em cada foto.
      </span>
    </label>
  )
}

function UploadTile({ upload, uploads }: { upload: PhotoUpload; uploads: PhotoUploads }) {
  const { file, preview, problem, progress, state } = upload
  const sending = state === 'waiting' || state === 'sending'

  return (
    <li>
      <div className={`gp-media__item gp-upload${sending ? '' : ' gp-upload--problem'}`}>
        {preview ? (
          <img alt="" src={preview} />
        ) : (
          <span className="gp-upload__empty">
            <PanelIcon name="image" size={24} />
          </span>
        )}
        <span className="gp-media__name">{file.name}</span>
        {sending ? (
          <>
            <div
              aria-label={`Enviando ${file.name}`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              className="gp-progress"
              role="progressbar"
            >
              <i style={{ width: `${progress}%` }} />
            </div>
            <span className="gp-small gp-muted">
              {state === 'waiting' ? 'Na fila…' : progress < 90 ? 'Enviando…' : 'Quase lá…'}
            </span>
          </>
        ) : (
          <>
            <span className="gp-upload__error" role="alert">
              {problem ?? 'Não deu para enviar. Confira a internet e tente de novo.'}
            </span>
            <div className="gp-upload__actions">
              {state === 'failed' && (
                <button
                  className="gp-btn gp-btn--sm"
                  onClick={() => uploads.retry(upload)}
                  type="button"
                >
                  Tentar de novo
                </button>
              )}
              <button
                aria-label={`Tirar ${file.name} da lista`}
                className="gp-iconbtn"
                onClick={() => uploads.dismiss(upload)}
                type="button"
              >
                <PanelIcon name="x" size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  )
}

/** Fotos a caminho, com a barra de progresso. Ficam dentro da grade de fotos (`<ul>`). */
export function UploadTiles({ uploads }: { uploads: PhotoUploads }) {
  return uploads.items.map((upload) => (
    <UploadTile key={upload.id} upload={upload} uploads={uploads} />
  ))
}
