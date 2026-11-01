'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import { useDocumentDrawer } from '@payloadcms/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { request, updatePhotoAlt } from '@/components/editor/api'
import { thumbnailURL } from '@/components/editor/context'
import type { PhotoUse } from '@/hooks/protectPhoto'
import { editorPath } from '@/lib/editor'
import { isExamplePhoto } from '@/lib/examples'
import { panelHref } from '@/lib/panel'
import { photoLabel } from '@/lib/photos'
import type { Media } from '@/payload-types'

import { PanelIcon } from './PanelIcon'
import { PhotoDrop, UploadTiles } from './PhotoUploadParts'
import { usePhotoUploads } from './usePhotoUploads'

type Props = {
  adminRoute: string
  apiRoute: string
  photos: Media[]
  usage: Record<number, PhotoUse[]>
}

function usageLabel(uses: PhotoUse[] | undefined): string {
  const pages = uses?.filter((use) => use.kind === 'page').length ?? 0
  const settings = uses?.some((use) => use.kind === 'settings')
  if (pages) return `Usada em ${pages} ${pages === 1 ? 'página' : 'páginas'}`
  return settings ? 'Usada nas Configurações' : 'Não usada'
}

export function PhotosLibrary({ adminRoute, apiRoute, photos, usage }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Fotos que acabaram de chegar: aparecem na hora, antes de a tela ser relida do servidor.
  const [arrived, setArrived] = useState<Media[]>([])
  const uploads = usePhotoUploads({
    onUploaded: (photo) => setArrived((list) => [photo, ...list]),
    onFinished: ({ uploaded }) => {
      if (!uploaded.length) return
      if (uploaded.length === 1) setSelectedId(uploaded[0].id)
      setNotice(
        uploaded.length === 1
          ? 'Foto enviada. Escreva ao lado o que aparece nela.'
          : `${uploaded.length} fotos enviadas. Clique em cada uma para escrever a descrição.`,
      )
      router.refresh()
    },
  })
  const known = new Set(photos.map((photo) => photo.id))
  const library = [...arrived.filter((photo) => !known.has(photo.id)), ...photos]
  const selected = library.find((photo) => photo.id === selectedId)

  return (
    <div className="gp-page">
      <header className="gp-pagehead">
        <div>
          <h1>Fotos</h1>
          <p>Troque uma foto aqui e ela muda em todas as páginas que a usam.</p>
        </div>
        <button className="gp-btn gp-btn--primary gp-btn--lg" onClick={uploads.open} type="button">
          <PanelIcon name="upload" />
          Enviar fotos
        </button>
      </header>

      <PhotoDrop uploads={uploads} />

      <div aria-live="polite">
        {notice && (
          <p className="gp-notice">
            {notice}
            <button
              aria-label="Fechar aviso"
              className="gp-iconbtn"
              onClick={() => setNotice(null)}
              type="button"
            >
              <PanelIcon name="x" size={16} />
            </button>
          </p>
        )}
      </div>

      <div className="gp-media">
        {library.length || uploads.items.length ? (
          <ul className="gp-media__grid">
            <UploadTiles uploads={uploads} />
            {library.map((photo) => (
              <li key={photo.id}>
                <button
                  aria-pressed={photo.id === selectedId}
                  className="gp-media__item"
                  onClick={() => setSelectedId(photo.id)}
                  type="button"
                >
                  <img alt="" src={thumbnailURL(photo)} />
                  <span className="gp-media__name">{photoLabel(photo)}</span>
                  {photo.alt?.trim() ? (
                    <span className="gp-small gp-muted">{usageLabel(usage[photo.id])}</span>
                  ) : (
                    <span className="gp-media__noalt">Sem descrição</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="gp-card gp-empty">Ainda não há fotos. Envie a primeira.</p>
        )}

        <aside className="gp-card gp-media__detail">
          {selected ? (
            <PhotoDetail
              adminRoute={adminRoute}
              apiRoute={apiRoute}
              key={selected.id}
              onAltSaved={router.refresh}
              onDeleted={() => {
                setSelectedId(null)
                setNotice('Foto excluída.')
                router.refresh()
              }}
              onReplaced={() => {
                setNotice('Foto trocada. Ela já mudou em todas as páginas que a usam.')
                router.refresh()
              }}
              photo={selected}
              uses={usage[selected.id] ?? []}
            />
          ) : (
            <div className="gp-empty">
              <PanelIcon name="image" size={28} />
              <p>Clique em uma foto para ver os detalhes, escrever a descrição ou trocar.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

type DetailProps = {
  adminRoute: string
  apiRoute: string
  onAltSaved: () => void
  onDeleted: () => void
  onReplaced: () => void
  photo: Media
  uses: PhotoUse[]
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** Detalhes da foto escolhida: descrição (salva sozinha), onde é usada, trocar e excluir. */
function PhotoDetail({
  adminRoute,
  apiRoute,
  onAltSaved,
  onDeleted,
  onReplaced,
  photo,
  uses,
}: DetailProps) {
  const [alt, setAlt] = useState(photo.alt ?? '')
  const [save, setSave] = useState<SaveState>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saved = useRef(photo.alt ?? '')
  const [ReplaceDrawer, , { openDrawer, closeDrawer }] = useDocumentDrawer({
    collectionSlug: 'media',
    id: photo.id,
  })

  // Salva a descrição um pouco depois de a pessoa parar de digitar.
  useEffect(() => {
    const text = alt.trim()
    if (text === saved.current) return
    const timer = setTimeout(async () => {
      setSave('saving')
      try {
        await updatePhotoAlt(apiRoute, photo.id, text)
        saved.current = text
        setSave('saved')
        onAltSaved()
      } catch {
        setSave('error')
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [alt, apiRoute, onAltSaved, photo.id])

  const remove = async () => {
    setError(null)
    try {
      await request(apiRoute, `/media/${photo.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tente de novo.')
    }
  }

  return (
    <>
      <img alt="" className="gp-media__preview" src={photo.sizes?.medium?.url || photo.url || ''} />
      <span className="gp-small gp-muted gp-media__file">{photo.filename}</span>
      {isExamplePhoto(photo) && (
        <span className="gp-chip gp-chip--warn">Foto de exemplo do modelo</span>
      )}

      <div className="gp-field">
        <label htmlFor="md-alt">O que aparece na foto?</label>
        <textarea
          className="gp-input"
          id="md-alt"
          maxLength={200}
          onChange={(event) => {
            setAlt(event.target.value)
            setSave('idle')
          }}
          placeholder="Ex.: Xícara de espresso vista de cima"
          rows={3}
          value={alt}
        />
        <span aria-live="polite" className="gp-hint">
          {!alt.trim()
            ? 'Escreva uma descrição: ela ajuda o Google e pessoas que usam leitor de tela.'
            : save === 'saving'
              ? 'Salvando…'
              : save === 'saved'
                ? 'Salvo.'
                : save === 'error'
                  ? 'Não deu para salvar. Confira a internet e tente de novo.'
                  : 'Ajuda o Google e pessoas que usam leitor de tela. Salva sozinho.'}
        </span>
      </div>

      <div className="gp-field">
        <span className="gp-label">Onde está sendo usada</span>
        {uses.length ? (
          <ul className="gp-links">
            {uses.map((use) =>
              use.kind === 'page' ? (
                <li key={use.id}>
                  <Link href={editorPath(adminRoute, use.id)}>{use.title}</Link>
                </li>
              ) : (
                <li key="settings">
                  <Link href={panelHref(adminRoute, 'settings')}>
                    Configurações (logo ou foto ao compartilhar)
                  </Link>
                </li>
              ),
            )}
          </ul>
        ) : (
          <span className="gp-small gp-muted">Em nenhuma página.</span>
        )}
      </div>

      <div className="gp-actions">
        <button className="gp-btn gp-btn--sm" onClick={openDrawer} type="button">
          <PanelIcon name="upload" size={14} />
          Trocar em todo o site
        </button>
        <button
          className="gp-btn gp-btn--sm gp-btn--danger"
          disabled={uses.length > 0}
          onClick={() => setConfirmDelete(true)}
          type="button"
        >
          <PanelIcon name="trash" size={14} />
          Excluir
        </button>
      </div>
      {uses.length > 0 && (
        <span className="gp-small gp-muted">
          Para excluir, primeiro tire a foto das páginas onde ela aparece.
        </span>
      )}

      {confirmDelete && (
        <div className="gp-warnbox" role="alert">
          <b>Excluir esta foto?</b>
          <span>Não dá para desfazer.</span>
          <div className="gp-actions">
            <button
              className="gp-btn gp-btn--sm"
              onClick={() => setConfirmDelete(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="gp-btn gp-btn--sm gp-btn--solid-danger"
              onClick={remove}
              type="button"
            >
              Excluir
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="gp-error" role="alert">
          Não deu para excluir: {error}
        </p>
      )}

      <ReplaceDrawer
        onSave={() => {
          closeDrawer()
          onReplaced()
        }}
      />
    </>
  )
}
