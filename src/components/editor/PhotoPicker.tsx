'use client'

import React, { useState } from 'react'

import { FolderChips, LazyThumb, usePhotoBrowse, useStepper } from '@/components/panel/photoBrowse'
import { PhotoDrop, UploadTiles } from '@/components/panel/PhotoUploadParts'
import { usePhotoUploads } from '@/components/panel/usePhotoUploads'
import { type PhotoFolder, toggleInOrder } from '@/lib/photoLibrary'
import { photoLabel } from '@/lib/photos'
import type { Media } from '@/payload-types'

import { thumbnailURL } from './context'
import { Dialog } from './Dialog'

type Props = {
  photos: Media[]
  folders: PhotoFolder[]
  /** Várias de uma vez (listas de fotos): cada toque marca, e o botão do pé põe todas. */
  multiple?: boolean
  /** Quantas ainda cabem na seção. */
  max?: number
  onPick: (photos: Media[]) => void
  onUploaded: (photo: Media) => void
  onClose: () => void
}

/**
 * Biblioteca de fotos do editor (C6): pastas, busca e miniaturas que chegam aos poucos, com o mesmo
 * envio da tela Fotos. Uma foto: o toque escolhe. Várias: os toques numeram a ordem em que entram, e
 * "Adicionar N fotos" fica fixo no pé da janela. Enviou uma só (e é uma foto só): já é a escolhida.
 */
export function PhotoPicker({
  photos,
  folders,
  multiple = false,
  max = 1,
  onPick,
  onUploaded,
  onClose,
}: Props) {
  const [chosen, setChosen] = useState<number[]>([])
  const [full, setFull] = useState(false)
  const browse = usePhotoBrowse(photos, folders)
  const { shown, query, folder } = browse
  const { limit, more, sentinel, showMore } = useStepper(shown.length, `${String(folder)}|${query}`)
  const byId = new Map(photos.map((photo) => [photo.id, photo]))

  const choose = (id: number) => {
    const next = toggleInOrder(chosen, id, max)
    setFull(!chosen.includes(id) && next.length === chosen.length)
    setChosen(next)
  }

  const uploads = usePhotoUploads({
    library: photos,
    folder: browse.uploadFolder,
    onUploaded,
    onFinished: ({ uploaded, problems }) => {
      if (!multiple) {
        if (uploaded.length === 1 && !problems) onPick(uploaded)
        return
      }
      // Várias: as que chegaram entram marcadas, no fim da fila, até caber.
      setChosen((list) => {
        let next = list
        for (const photo of uploaded) next = toggleInOrder(next, photo.id, max)
        return next
      })
    },
  })

  const add = () => {
    const list = chosen.map((id) => byId.get(id)).filter((photo): photo is Media => Boolean(photo))
    if (list.length) onPick(list)
  }

  return (
    <Dialog
      description={
        multiple
          ? `Toque nas fotos na ordem em que devem aparecer. Cabem mais ${max}.`
          : 'A descrição de cada foto ajuda no Google e em leitores de tela.'
      }
      footer={
        multiple ? (
          <div className="ed-picker-foot">
            <span aria-live="polite" className="ed-picker-foot__note">
              {full
                ? `Já são ${max}: é o que ainda cabe nesta seção.`
                : chosen.length
                  ? 'Os números mostram a ordem na seção.'
                  : 'Nenhuma foto escolhida ainda.'}
            </span>
            <button
              className="ed-btn"
              disabled={!chosen.length}
              onClick={() => {
                setChosen([])
                setFull(false)
              }}
              type="button"
            >
              Limpar
            </button>
            <button
              className="ed-btn ed-btn--primary"
              disabled={!chosen.length}
              onClick={add}
              type="button"
            >
              {chosen.length > 1
                ? `Adicionar ${chosen.length} fotos`
                : chosen.length === 1
                  ? 'Adicionar 1 foto'
                  : 'Adicionar fotos'}
            </button>
          </div>
        ) : undefined
      }
      onClose={onClose}
      title={multiple ? 'Escolha as fotos' : 'Escolha uma foto'}
      wide
    >
      <PhotoDrop uploads={uploads} />
      {(photos.length > 8 || folders.length > 0) && (
        <div className="ed-picker-bar">
          <FolderChips
            counts={browse.counts}
            folders={folders}
            onChange={browse.setFolder}
            total={photos.length}
            value={folder}
          />
          <input
            aria-label="Procurar foto"
            className="ed-input"
            onChange={(event) => browse.setQuery(event.target.value)}
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
          {shown.slice(0, limit).map((photo) => {
            const order = chosen.indexOf(photo.id) + 1
            return (
              <button
                aria-label={
                  multiple && order
                    ? `${photoLabel(photo)}: foto ${order} de ${chosen.length}`
                    : undefined
                }
                aria-pressed={multiple ? order > 0 : undefined}
                className={`ed-media-item${order ? ' ed-media-item--chosen' : ''}`}
                key={photo.id}
                onClick={() => (multiple ? choose(photo.id) : onPick([photo]))}
                type="button"
              >
                {order > 0 && (
                  <span aria-hidden="true" className="ed-media-item__order">
                    {order}
                  </span>
                )}
                <LazyThumb src={thumbnailURL(photo)} />
                <span>{photoLabel(photo)}</span>
                {!photo.alt?.trim() && <span className="gp-media__noalt">Sem descrição</span>}
              </button>
            )
          })}
          {more && (
            <div className="ed-media-more" ref={sentinel}>
              <button className="ed-btn ed-btn--sm" onClick={showMore} type="button">
                Mostrar mais fotos ({shown.length - limit})
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="ed-muted">
          {query
            ? 'Nenhuma foto com essa descrição.'
            : photos.length
              ? 'Esta pasta está vazia.'
              : 'Ainda não há fotos. Envie a primeira.'}
        </p>
      )}
    </Dialog>
  )
}
