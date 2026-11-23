'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import { useDocumentDrawer } from '@payloadcms/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { request } from './session'
import { thumbnailURL } from '@/components/editor/context'
import { FocusPicker } from '@/components/editor/FocusPicker'
import type { PhotoUse } from '@/hooks/protectPhoto'
import { editorPath } from '@/lib/editor'
import { isExamplePhoto } from '@/lib/examples'
import { panelHref } from '@/lib/panel'
import { FOLDERS_MAX, type PhotoFolder, folderOf } from '@/lib/photoLibrary'
import { photoLabel } from '@/lib/photos'
import { SMALL_PHOTO_TEXT } from '@/lib/photoSize'
import type { Media } from '@/payload-types'

import { FolderDialog, type FolderAsk } from './FolderDialog'
import { FolderChips, LazyThumb, usePhotoBrowse, useStepper } from './photoBrowse'
import { PhotoEditDialog } from './PhotoEditDialog'
import { PanelIcon } from './PanelIcon'
import { PhotoDrop, UploadTiles } from './PhotoUploadParts'
import { usePhotoUploads } from './usePhotoUploads'

type Props = {
  adminRoute: string
  apiRoute: string
  photos: Media[]
  /** Pastas da biblioteca (C6), por nome. */
  folders: PhotoFolder[]
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

export function PhotosLibrary({ adminRoute, apiRoute, photos, folders, usage, small }: Props) {
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
  // Pasta mudada agora (C6): vale na hora, antes de a tela ser relida do servidor.
  const [moved, setMoved] = useState<Record<number, number | null>>({})
  const known = new Set(photos.map((photo) => photo.id))
  const library = [...arrived.filter((photo) => !known.has(photo.id)), ...photos].map((photo) =>
    photo.id in moved ? { ...photo, folder: moved[photo.id] } : photo,
  )
  const selected = library.find((photo) => photo.id === selectedId)

  const [filter, setFilter] = useState<Filter>('all')
  const passes = (photo: Media, which: Filter) =>
    (which !== 'noalt' || !hasAlt(photo)) &&
    (which !== 'unused' || isUnused(usage[photo.id])) &&
    (which !== 'small' || Boolean(small[photo.id]))
  // C6: pasta e busca primeiro; os filtros contam dentro da pasta aberta.
  const browse = usePhotoBrowse(library, folders, (photo) => passes(photo, filter))
  const { shown, query: search, folder } = browse
  const filters: [Filter, string, number][] = [
    ['all', 'Todas', browse.inPlace.length],
    ['noalt', 'Sem descrição', browse.inPlace.filter((photo) => passes(photo, 'noalt')).length],
    ['unused', 'Não usadas', browse.inPlace.filter((photo) => passes(photo, 'unused')).length],
    // Fotos pequenas para onde estão: em vez de uma etiqueta em cada cartão, um filtro.
    ['small', 'Fotos pequenas', browse.inPlace.filter((photo) => passes(photo, 'small')).length],
  ]
  const folderName = (id: number | null) => folders.find((item) => item.id === id)?.name
  const uploads = usePhotoUploads({
    library,
    folder: browse.uploadFolder,
    onUploaded: (photo) => setArrived((list) => [photo, ...list]),
    onFinished: ({ uploaded }) => {
      if (!uploaded.length) return
      if (uploaded.length === 1) setSelectedId(uploaded[0].id)
      const into = folderName(browse.uploadFolder)
      setNotice(
        (uploaded.length === 1
          ? 'Foto enviada. Escreva nos detalhes o que aparece nela.'
          : `${uploaded.length} fotos enviadas. ${
              window.matchMedia('(hover: none)').matches ? 'Toque' : 'Clique'
            } em cada uma para escrever a descrição.`) +
          (into ? ` Elas estão na pasta “${into}”.` : ''),
      )
      router.refresh()
    },
  })

  // Várias de uma vez (C6): escolher fotos e mudar todas de pasta.
  const [picking, setPicking] = useState(false)
  const [chosen, setChosen] = useState<number[]>([])
  const [moveTo, setMoveTo] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [folderAsk, setFolderAsk] = useState<FolderAsk | null>(null)
  const [editing, setEditing] = useState<Media | null>(null)
  const { limit, more, sentinel, showMore } = useStepper(
    shown.length,
    `${String(folder)}|${filter}|${search}`,
  )
  const stopPicking = () => {
    setPicking(false)
    setChosen([])
    setMoveTo('')
  }
  const toggle = (id: number) =>
    setChosen((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]))
  const moveChosen = async () => {
    if (!chosen.length || !moveTo) return
    const target = moveTo === 'none' ? null : Number(moveTo)
    setBusy(true)
    try {
      await request(
        apiRoute,
        `/media?${chosen.map((id, i) => `where[id][in][${i}]=${id}`).join('&')}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ folder: target }),
        },
      )
      setMoved((current) => ({
        ...current,
        ...Object.fromEntries(chosen.map((id) => [id, target])),
      }))
      setNotice(
        `${chosen.length} ${chosen.length === 1 ? 'foto foi' : 'fotos foram'} para ${
          target ? `a pasta “${folderName(target)}”` : '“Sem pasta”'
        }.`,
      )
      stopPicking()
      router.refresh()
    } catch (err) {
      setNotice(
        `Não deu para mudar as fotos de pasta: ${err instanceof Error ? err.message : 'tente de novo.'}`,
      )
    } finally {
      setBusy(false)
    }
  }

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
        <div className="gp-folders__bar">
          <FolderChips
            after={
              folders.length < FOLDERS_MAX && (
                <button
                  className="gp-folders__chip gp-folders__chip--add"
                  onClick={() => setFolderAsk({ kind: 'create' })}
                  type="button"
                >
                  <PanelIcon name="plus" size={14} />
                  Nova pasta
                </button>
              )
            }
            counts={browse.counts}
            folders={folders}
            onChange={browse.setFolder}
            total={library.length}
            value={folder}
          />
          {typeof folder === 'number' && (
            <div className="gp-folders__actions">
              <button
                className="gp-btn gp-btn--sm gp-btn--ghost"
                onClick={() =>
                  setFolderAsk({ kind: 'rename', id: folder, name: folderName(folder) ?? '' })
                }
                type="button"
              >
                <PanelIcon name="edit" size={14} />
                Renomear a pasta
              </button>
              <button
                className="gp-btn gp-btn--sm gp-btn--ghost"
                onClick={() =>
                  setFolderAsk({
                    kind: 'delete',
                    id: folder,
                    name: folderName(folder) ?? '',
                    count: browse.counts.get(folder) ?? 0,
                  })
                }
                type="button"
              >
                <PanelIcon name="trash" size={14} />
                Apagar a pasta
              </button>
            </div>
          )}
        </div>
      )}

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
          <div className="gp-media__find">
            <label className="gp-searchbox">
              <PanelIcon name="search" size={16} />
              <input
                aria-label="Procurar foto pelo nome ou pela descrição"
                onChange={(event) => browse.setQuery(event.target.value)}
                placeholder="Procurar foto"
                type="search"
                value={search}
              />
            </label>
            <button
              aria-pressed={picking}
              className="gp-btn gp-btn--sm"
              onClick={() => (picking ? stopPicking() : setPicking(true))}
              type="button"
            >
              <PanelIcon name={picking ? 'x' : 'check'} size={14} />
              {picking ? 'Parar de escolher' : 'Escolher várias'}
            </button>
          </div>
        </div>
      )}

      {/* L5: sem foto escolhida, a grade usa a largura toda; o detalhe abre ao lado ao clicar. */}
      <div className={`gp-media${selected && !picking ? ' gp-media--open' : ''}`}>
        {library.length || uploads.items.length ? (
          <ul className="gp-media__grid">
            <UploadTiles uploads={uploads} />
            {shown.length === 0 && (
              <li className="gp-media__none gp-muted">
                {search
                  ? 'Nenhuma foto com esse nome ou descrição.'
                  : typeof folder === 'number' && !browse.inPlace.length
                    ? 'Esta pasta está vazia. Envie fotos com ela aberta, ou escolha várias fotos e mude de pasta.'
                    : 'Nenhuma foto aqui.'}
              </li>
            )}
            {shown.slice(0, limit).map((photo) => {
              const isChosen = chosen.includes(photo.id)
              return (
                <li key={photo.id}>
                  <button
                    aria-pressed={picking ? isChosen : photo.id === selectedId}
                    className={`gp-media__item${picking ? ' gp-media__item--pick' : ''}`}
                    data-photo={photo.id}
                    onClick={() => (picking ? toggle(photo.id) : choose(photo.id))}
                    type="button"
                  >
                    {picking && (
                      <span aria-hidden="true" className="gp-media__check">
                        {isChosen && <PanelIcon name="check" size={14} />}
                      </span>
                    )}
                    <LazyThumb src={thumbnailURL(photo)} />
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
              )
            })}
            {more && (
              <li className="gp-media__more" ref={sentinel}>
                <button className="gp-btn gp-btn--sm" onClick={showMore} type="button">
                  Mostrar mais fotos ({shown.length - limit})
                </button>
              </li>
            )}
          </ul>
        ) : (
          <p className="gp-card gp-empty">Ainda não há fotos. Envie a primeira.</p>
        )}

        {selected && !picking && (
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
                folders={folders}
                key={selected.id}
                onAltSaved={router.refresh}
                onDeleted={() => {
                  setSelectedId(null)
                  setNotice('Foto excluída.')
                  router.refresh()
                }}
                onEdit={() => setEditing(selected)}
                onFolderChanged={(id) => {
                  setMoved((current) => ({ ...current, [selected.id]: id }))
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

      {picking && (
        <div aria-label="Fotos escolhidas" className="gp-selectbar" role="region">
          <span aria-live="polite" className="gp-selectbar__count">
            {chosen.length
              ? `${chosen.length} ${chosen.length === 1 ? 'foto escolhida' : 'fotos escolhidas'}`
              : 'Toque nas fotos para escolher'}
          </span>
          <button
            className="gp-btn gp-btn--sm gp-btn--ghost"
            disabled={!shown.length}
            onClick={() =>
              setChosen(chosen.length === shown.length ? [] : shown.map((photo) => photo.id))
            }
            type="button"
          >
            {chosen.length === shown.length && shown.length
              ? 'Tirar todas'
              : `Escolher todas (${shown.length})`}
          </button>
          <label className="gp-selectbar__move">
            <span className="gp-sr">Mover para</span>
            <select
              className="gp-input"
              disabled={!chosen.length || busy}
              onChange={(event) => setMoveTo(event.target.value)}
              value={moveTo}
            >
              <option value="">Mover para…</option>
              {folders.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              <option value="none">Sem pasta</option>
            </select>
          </label>
          <button
            className="gp-btn gp-btn--sm gp-btn--primary"
            disabled={!chosen.length || !moveTo || busy}
            onClick={moveChosen}
            type="button"
          >
            {busy ? 'Movendo…' : 'Mover'}
          </button>
          <button className="gp-btn gp-btn--sm gp-btn--ghost" onClick={stopPicking} type="button">
            Parar de escolher
          </button>
          {!folders.length && (
            <span className="gp-small gp-muted">
              Crie uma pasta em “Nova pasta” para organizar.
            </span>
          )}
        </div>
      )}

      {folderAsk && (
        <FolderDialog
          apiRoute={apiRoute}
          ask={folderAsk}
          folders={folders}
          onClose={() => setFolderAsk(null)}
          onDone={(message, openFolder) => {
            // Pasta apagada: as fotos que tinham ido para ela agora há pouco ficam sem pasta.
            if (folderAsk.kind === 'delete') {
              const gone = folderAsk.id
              setMoved((current) =>
                Object.fromEntries(
                  Object.entries(current).map(([id, value]) => [id, value === gone ? null : value]),
                ),
              )
            }
            setFolderAsk(null)
            setNotice(message)
            if (openFolder !== undefined) browse.setFolder(openFolder ?? 'all')
            router.refresh()
          }}
        />
      )}

      {editing && (
        <PhotoEditDialog
          apiRoute={apiRoute}
          onClose={() => setEditing(null)}
          onSaved={(photo) => {
            setEditing(null)
            setArrived((list) => [photo, ...list.filter((item) => item.id !== photo.id)])
            setNotice('Foto salva. Ela já mudou em todas as páginas que a usam.')
            router.refresh()
          }}
          photo={editing}
        />
      )}
    </div>
  )
}

type DetailProps = {
  adminRoute: string
  apiRoute: string
  folders: PhotoFolder[]
  onAltSaved: () => void
  onEdit: () => void
  onFolderChanged: (folder: number | null) => void
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
  folders,
  onAltSaved,
  onEdit,
  onFolderChanged,
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
  // O texto da caixa agora, para guardar ao fechar (o efeito de saída não vê o estado novo).
  const typed = useRef(alt)
  const [ReplaceDrawer, , { openDrawer, closeDrawer }] = useDocumentDrawer({
    collectionSlug: 'media',
    id: photo.id,
  })

  // Guarda a descrição (A5): na pausa da digitação, ao sair da caixa e ao fechar ou trocar de
  // foto. Antes só a pausa valia, e fechar logo depois de digitar perdia o texto (achado CAR6).
  const commit = useCallback(
    async (text: string, { quiet = false } = {}) => {
      if (text === saved.current) return
      saved.current = text
      if (!quiet) setSave('saving')
      try {
        await request(apiRoute, `/media/${photo.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ alt: text }),
          keepalive: true,
        })
        if (!quiet) setSave('saved')
        onAltSaved()
      } catch {
        if (!quiet) setSave('error')
      }
    },
    [apiRoute, onAltSaved, photo.id],
  )
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  }, [commit])

  useEffect(() => {
    const text = alt.trim()
    typed.current = text
    if (text === saved.current) return
    const timer = setTimeout(() => void commit(text), 800)
    return () => clearTimeout(timer)
  }, [alt, commit])

  // Fechou ou trocou de foto com texto ainda não guardado: guarda na saída.
  useEffect(() => () => void commitRef.current(typed.current, { quiet: true }), [])

  // "Guardado" fica 3 s e volta para a dica (A5).
  useEffect(() => {
    if (save !== 'saved') return
    const timer = setTimeout(() => setSave('idle'), 3000)
    return () => clearTimeout(timer)
  }, [save])

  const [folder, setFolder] = useState<number | null>(folderOf(photo))
  const [folderError, setFolderError] = useState<string | null>(null)
  const changeFolder = async (value: number | null) => {
    const before = folder
    setFolder(value)
    setFolderError(null)
    try {
      await request(apiRoute, `/media/${photo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ folder: value }),
      })
      onFolderChanged(value)
    } catch {
      setFolder(before)
      setFolderError('Não deu para mudar de pasta. Confira a internet e tente de novo.')
    }
  }

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
          onBlur={() => void commit(alt.trim())}
          placeholder="Ex.: Xícara de espresso vista de cima"
          rows={3}
          value={alt}
        />
        <span aria-live="polite" className="gp-hint">
          {!alt.trim()
            ? 'Escreva uma descrição: ela ajuda o Google e pessoas que usam leitor de tela.'
            : save === 'saving'
              ? 'Guardando…'
              : save === 'saved'
                ? '✓ Guardado'
                : save === 'error'
                  ? 'Não deu para salvar. Confira a internet e tente de novo.'
                  : 'Ajuda o Google e pessoas que usam leitor de tela. Salva sozinho.'}
        </span>
      </div>

      {folders.length > 0 && (
        <div className="gp-field">
          <label htmlFor="md-folder">Pasta</label>
          <select
            className="gp-input"
            id="md-folder"
            onChange={(event) =>
              void changeFolder(event.target.value ? Number(event.target.value) : null)
            }
            value={folder ?? ''}
          >
            <option value="">Sem pasta</option>
            {folders.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {folderError && (
            <span className="gp-error" role="alert">
              {folderError}
            </span>
          )}
        </div>
      )}

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
        <button className="gp-btn gp-btn--sm" onClick={onEdit} type="button">
          <PanelIcon name="crop" size={14} />
          Cortar ou girar
        </button>
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
