'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import { useDocumentDrawer } from '@payloadcms/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { request } from './session'
import { thumbnailURL } from '@/components/editor/context'
import { FocusPicker } from '@/components/editor/FocusPicker'
import type { PhotoUse } from '@/hooks/protectPhoto'
import { editorPath } from '@/lib/editor'
import { isExamplePhoto } from '@/lib/examples'
import { panelHref } from '@/lib/panel'
import { photoLabel } from '@/lib/photos'
import { SMALL_PHOTO_TEXT } from '@/lib/photoSize'
import type { Media } from '@/payload-types'

import { PanelIcon } from './PanelIcon'
import { PhotoDrop, UploadTiles } from './PhotoUploadParts'
import { usePhotoUploads } from './usePhotoUploads'

type Props = {
  adminRoute: string
  apiRoute: string
  photos: Media[]
  usage: Record<number, PhotoUse[]>
  /** Fotos pequenas para onde estão: a largura que cada uma precisaria ter. */
  small: Record<number, number>
}

type Filter = 'all' | 'noalt' | 'unused' | 'small'

const hasAlt = (photo: Media) => Boolean(photo.alt?.trim())
const isUnused = (uses: PhotoUse[] | undefined) => !uses?.length

function usageLabel(uses: PhotoUse[] | undefined): string {
  const pages = uses?.filter((use) => use.kind === 'page').length ?? 0
  const settings = uses?.some((use) => use.kind === 'settings')
  if (pages) return `Usada em ${pages} ${pages === 1 ? 'página' : 'páginas'}`
  return settings ? 'Usada nas Configurações' : 'Não usada'
}

// Até esta largura o detalhe da foto abre numa folha que sobe do pé da tela (M2), por cima da lista.
// Igual ao `$media-stacked` do panel.scss.
const STACKED = '(max-width: 1279px)'

export function PhotosLibrary({ adminRoute, apiRoute, photos, usage, small }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const detail = useRef<HTMLElement>(null)
  const choose = (id: number) => setSelectedId(id)
  // Fechou: a pessoa continua no mesmo ponto da lista, com o foco na foto que abriu.
  const close = () => {
    const id = selectedId
    setSelectedId(null)
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-photo="${id}"]`)?.focus({ preventScroll: true }),
    )
  }
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  // Folha aberta (celular e tablet): a lista de trás não rola, o foco vai para a folha e o Esc fecha.
  useEffect(() => {
    if (selectedId === null || !window.matchMedia(STACKED).matches) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    detail.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      // Uma janela por cima da folha (trocar a foto, excluir) fecha antes.
      if (event.key === 'Escape' && !document.querySelector('.gp-overlay, .drawer--is-open')) {
        closeRef.current()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [selectedId])
  const [notice, setNotice] = useState<string | null>(null)
  // Fotos que acabaram de chegar: aparecem na hora, antes de a tela ser relida do servidor.
  const [arrived, setArrived] = useState<Media[]>([])
  const uploads = usePhotoUploads({
    library: [...arrived, ...photos],
    onUploaded: (photo) => setArrived((list) => [photo, ...list]),
    onFinished: ({ uploaded }) => {
      if (!uploaded.length) return
      if (uploaded.length === 1) setSelectedId(uploaded[0].id)
      setNotice(
        uploaded.length === 1
          ? 'Foto enviada. Escreva nos detalhes o que aparece nela.'
          : `${uploaded.length} fotos enviadas. ${
              window.matchMedia('(hover: none)').matches ? 'Toque' : 'Clique'
            } em cada uma para escrever a descrição.`,
      )
      router.refresh()
    },
  })
  const known = new Set(photos.map((photo) => photo.id))
  const library = [...arrived.filter((photo) => !known.has(photo.id)), ...photos]
  const selected = library.find((photo) => photo.id === selectedId)

  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const search = query.trim().toLowerCase()
  const filters: [Filter, string, number][] = [
    ['all', 'Todas', library.length],
    ['noalt', 'Sem descrição', library.filter((photo) => !hasAlt(photo)).length],
    ['unused', 'Não usadas', library.filter((photo) => isUnused(usage[photo.id])).length],
    // Fotos pequenas para onde estão: em vez de uma etiqueta em cada cartão, um filtro.
    ['small', 'Fotos pequenas', library.filter((photo) => Boolean(small[photo.id])).length],
  ]
  const shown = library.filter(
    (photo) =>
      (filter !== 'noalt' || !hasAlt(photo)) &&
      (filter !== 'unused' || isUnused(usage[photo.id])) &&
      (filter !== 'small' || Boolean(small[photo.id])) &&
      (!search ||
        photoLabel(photo).toLowerCase().includes(search) ||
        (photo.alt ?? '').toLowerCase().includes(search)),
  )

  return (
    <div className="gp-page" role="main">
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

      {library.length > 0 && (
        <div className="gp-media__tools">
          <div aria-label="Mostrar" className="gp-seg" role="group">
            {filters.map(([value, label, count]) => (
              <button
                aria-pressed={filter === value}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {label} ({count})
              </button>
            ))}
          </div>
          <label className="gp-searchbox">
            <PanelIcon name="search" size={16} />
            <input
              aria-label="Procurar foto pelo nome ou pela descrição"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Procurar foto"
              type="search"
              value={query}
            />
          </label>
        </div>
      )}

      {/* L5: sem foto escolhida, a grade usa a largura toda; o detalhe abre ao lado ao clicar. */}
      <div className={`gp-media${selected ? ' gp-media--open' : ''}`}>
        {library.length || uploads.items.length ? (
          <ul className="gp-media__grid">
            <UploadTiles uploads={uploads} />
            {shown.length === 0 && (
              <li className="gp-media__none gp-muted">
                {search ? 'Nenhuma foto com esse nome ou descrição.' : 'Nenhuma foto aqui.'}
              </li>
            )}
            {shown.map((photo) => (
              <li key={photo.id}>
                <button
                  aria-pressed={photo.id === selectedId}
                  className="gp-media__item"
                  data-photo={photo.id}
                  onClick={() => choose(photo.id)}
                  type="button"
                >
                  <img alt="" src={thumbnailURL(photo)} />
                  <span className="gp-media__name">{photoLabel(photo)}</span>
                  <span className="gp-small gp-muted">{usageLabel(usage[photo.id])}</span>
                  {!hasAlt(photo) && <span className="gp-media__noalt">Sem descrição</span>}
                  {small[photo.id] && (
                    <span
                      aria-label="Foto pequena: fica borrada em telas grandes"
                      className="gp-media__small"
                      role="img"
                      title="Foto pequena: fica borrada em telas grandes"
                    >
                      <PanelIcon name="alert" size={14} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="gp-card gp-empty">Ainda não há fotos. Envie a primeira.</p>
        )}

        {selected && (
          <>
            {/* Fundo escuro da folha no celular: tocar fora fecha. No computador não aparece. */}
            <div aria-hidden="true" className="gp-media__scrim" onClick={close} />
            <aside
              aria-label={`Detalhes de ${photoLabel(selected)}`}
              className="gp-card gp-media__detail"
              ref={detail}
              tabIndex={-1}
            >
              <div className="gp-media__detailhead">
                <span className="gp-label">Detalhes da foto</span>
                <button className="gp-btn gp-btn--sm gp-btn--ghost" onClick={close} type="button">
                  <PanelIcon name="x" size={14} />
                  Fechar
                </button>
              </div>
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
                small={Boolean(small[selected.id])}
                uses={usage[selected.id] ?? []}
              />
            </aside>
          </>
        )}
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
  /** Pequena para onde está: fica borrada no computador. */
  small: boolean
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
  small,
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
        await request(apiRoute, `/media/${photo.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ alt: text }),
        })
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
      {small && (
        <p className="gp-warnbox" role="note">
          {SMALL_PHOTO_TEXT}
          {photo.width ? ` Esta tem ${photo.width.toLocaleString('pt-BR')} px de largura.` : ''}
        </p>
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
        <span className="gp-label">Recorte da foto</span>
        <FocusPicker
          apiRoute={apiRoute}
          hintClass="gp-hint"
          key={photo.id}
          onSaved={() => onAltSaved()}
          photo={photo}
        />
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
                  <Link href={panelHref(adminRoute, 'brand')}>Sua marca (logo)</Link> ou{' '}
                  <Link href={panelHref(adminRoute, 'settings')}>
                    Configurações (foto ao compartilhar)
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
