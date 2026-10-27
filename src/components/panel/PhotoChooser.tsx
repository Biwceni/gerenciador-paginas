'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import { useDocumentDrawer } from '@payloadcms/ui'
import React from 'react'

import { thumbnailURL } from '@/components/editor/context'
import type { Media } from '@/payload-types'

import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'

type Props = {
  title: string
  photos: Media[]
  onPick: (photo: Media) => void
  onClose: () => void
}

/** Escolher uma foto da biblioteca, ou enviar uma nova (gaveta do Payload, direto ao Storage). */
export function PhotoChooser({ title, photos, onPick, onClose }: Props) {
  const [UploadDrawer, , { openDrawer, closeDrawer }] = useDocumentDrawer({
    collectionSlug: 'media',
  })

  return (
    <PanelDialog onClose={onClose} title={title} wide>
      <div>
        <button className="gp-btn gp-btn--primary" onClick={openDrawer} type="button">
          <PanelIcon name="upload" size={16} />
          Enviar foto do computador ou celular
        </button>
      </div>
      {photos.length ? (
        <ul className="gp-media__grid">
          {photos.map((photo) => (
            <li key={photo.id}>
              <button className="gp-media__item" onClick={() => onPick(photo)} type="button">
                <img alt="" src={thumbnailURL(photo)} />
                <span className="gp-media__name">{photo.alt}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="gp-muted">Ainda não há fotos. Envie a primeira.</p>
      )}
      <UploadDrawer
        // Sem isso, depois de criar a foto o Payload leva para a tela padrão dela.
        redirectAfterCreate={false}
        onSave={({ doc, operation }) => {
          if (operation !== 'create') return
          closeDrawer()
          onPick(doc as Media)
        }}
      />
    </PanelDialog>
  )
}
