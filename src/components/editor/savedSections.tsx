'use client'

import { toast } from '@payloadcms/ui'
import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'

import { PanelIcon } from '@/components/panel/PanelIcon'
import { type Components, SECTION_LABELS } from '@/puck/config'
import {
  cleanSavedName,
  defaultSavedName,
  dropMissingReferences,
  readSaved,
  SAVED_LIMIT,
  SAVED_NAME_MAX,
  type SavedSection,
} from '@/puck/savedSections'
import { packSection, type SectionItem } from '@/puck/sectionClipboard'

import { request } from './api'
import { useEditor } from './context'
import { useInsertSection } from './copyPaste'
import { Dialog } from './Dialog'
import { SectionThumb } from './SectionThumb'

// "Minhas seções" (Elementor, E2): guardar uma seção para usar de novo em qualquer página e
// aparelho. Fica no banco (coleção `saved-sections`), e não no navegador como o Copiar.

const sectionName = (type: string) => (SECTION_LABELS as Record<string, string>)[type] ?? 'Seção'

/** Pedidos de fora do Puck (a barra da seção roda dentro da prévia): guardar e ver como fica. */
export const SAVE_EVENT = 'gp-guardar-secao'
export const VIEW_EVENT = 'gp-ver-secao'

export function requestSave(item: SectionItem) {
  window.dispatchEvent(new CustomEvent<SectionItem>(SAVE_EVENT, { detail: item }))
}

export function requestView(item: SectionItem) {
  window.dispatchEvent(new CustomEvent<SectionItem>(VIEW_EVENT, { detail: item }))
}

type Docs = { docs: { id: number; name?: string | null; section?: unknown }[] }

type State =
  | { status: 'idle' | 'loading'; items: SavedSection[] }
  | { status: 'ready'; items: SavedSection[] }
  | { status: 'error'; items: SavedSection[] }

// Uma lista só para o editor inteiro: a barra, a lista "Adicionar seção" e as janelas veem a mesma.
let state: State = { status: 'idle', items: [] }
const listeners = new Set<() => void>()
const set = (next: State) => {
  state = next
  listeners.forEach((listener) => listener())
}

async function load(apiRoute: string) {
  set({ status: 'loading', items: state.items })
  try {
    const { docs } = await request<Docs>(
      apiRoute,
      `/saved-sections?depth=0&limit=${SAVED_LIMIT + 10}&sort=-updatedAt`,
    )
    set({ status: 'ready', items: docs.map(readSaved) })
  } catch {
    set({ status: 'error', items: state.items })
  }
}

/** As seções guardadas (pede ao servidor na primeira vez que alguém olha). */
export function useSavedSections(apiRoute: string) {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => state,
  )
  useEffect(() => {
    if (state.status === 'idle') void load(apiRoute)
  }, [apiRoute])
  return { ...current, reload: () => load(apiRoute) }
}

export async function saveSection(apiRoute: string, name: string, item: SectionItem) {
  await request(apiRoute, '/saved-sections', {
    method: 'POST',
    body: JSON.stringify({ name: cleanSavedName(name), section: JSON.parse(packSection(item)) }),
  })
  await load(apiRoute)
}

async function renameSection(apiRoute: string, id: number, name: string) {
  await request(apiRoute, `/saved-sections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: cleanSavedName(name) }),
  })
  await load(apiRoute)
}

async function deleteSection(apiRoute: string, id: number) {
  await request(apiRoute, `/saved-sections/${id}`, { method: 'DELETE' })
  await load(apiRoute)
}

/** Quantas guardadas aparecem antes do "Ver todas". */
const SAVED_PREVIEW = 4

/** Janela de guardar: miniatura, nome já preenchido e o aviso de que é uma cópia. */
export function SaveSectionDialog({ item, onClose }: { item: SectionItem; onClose: () => void }) {
  const { apiRoute } = useEditor()
  const saved = useSavedSections(apiRoute)
  const id = useId()
  const [name, setName] = useState(() => defaultSavedName(item, sectionName(item.type)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const full = saved.status === 'ready' && saved.items.length >= SAVED_LIMIT
  const empty = !cleanSavedName(name)

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (empty || full || busy) return
    setBusy(true)
    setError(null)
    try {
      await saveSection(apiRoute, name, item)
      toast.success(
        `“${cleanSavedName(name)}” guardada em Minhas seções. Está no alto de “Adicionar seção”, em qualquer página.`,
      )
      onClose()
    } catch (caught) {
      setBusy(false)
      setError(
        caught instanceof Error && !/internet/.test(caught.message)
          ? caught.message
          : 'Não deu para guardar. Confira a internet e tente de novo.',
      )
    }
  }

  return (
    <Dialog
      footer={
        <>
          <button className="ed-btn" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="ed-btn ed-btn--primary"
            disabled={empty || full || busy}
            form={`${id}-form`}
            type="submit"
          >
            {busy ? 'Guardando…' : error ? 'Tentar de novo' : 'Guardar'}
          </button>
        </>
      }
      onClose={onClose}
      title="Guardar em Minhas seções"
    >
      <form className="ed-savedform" id={`${id}-form`} onSubmit={submit}>
        <span className="ed-savedform__thumb">
          <SectionThumb type={item.type as keyof Components} />
        </span>
        <label className="ed-field ed-savedform__fields">
          <span>Nome</span>
          <input
            autoFocus
            className="ed-input"
            maxLength={SAVED_NAME_MAX}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <span className="ed-hint">
            {name.length} de {SAVED_NAME_MAX}
          </span>
        </label>
      </form>
      <p className="ed-hint">
        Guarda uma cópia: mudar esta seção depois não muda a guardada. Ela aparece no alto de
        “Adicionar seção”, em qualquer página e aparelho.
      </p>
      {full && (
        <p className="ed-hint ed-hint--warn">
          Você já tem {SAVED_LIMIT} seções guardadas. Apague uma em “Adicionar seção” para guardar
          outra.
        </p>
      )}
      {error && (
        <p className="ed-hint ed-hint--warn" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}

/** "Minhas seções" no alto da lista "Adicionar seção", com o contador e o menu de cada uma. */
export function MySections({ full }: { full: boolean }) {
  const { apiRoute, photoById, pages, forms } = useEditor()
  const saved = useSavedSections(apiRoute)
  const insert = useInsertSection()
  const [renaming, setRenaming] = useState<SavedSection | null>(null)
  // Com muitas guardadas, a lista não empurra o catálogo para longe: mostra as primeiras.
  const [all, setAll] = useState(false)
  const titleId = useId()

  const use = (section: SavedSection) => {
    if (!section.item) return
    if (full) return
    const ready = dropMissingReferences(section.item, {
      hasPhoto: (id) => Boolean(photoById[id]),
      hasPage: (id) => pages.some((page) => page.id === id),
      hasForm: (id) => forms.some((form) => form.id === id),
    })
    insert(ready)
  }

  const remove = async (section: SavedSection) => {
    try {
      await deleteSection(apiRoute, section.id)
    } catch {
      toast.error('Não deu para apagar. Confira a internet e tente de novo.')
      return
    }
    toast.info(`“${section.name}” apagada de Minhas seções.`, {
      action: {
        label: 'Desfazer',
        onClick: () => {
          if (!section.item) return
          saveSection(apiRoute, section.name, section.item).catch(() =>
            toast.error('Não deu para trazer de volta. Confira a internet.'),
          )
        },
      },
    })
  }

  return (
    <section aria-labelledby={titleId} className="ed-saved">
      <div className="ed-saved__head">
        <h4 id={titleId}>Minhas seções</h4>
        {saved.status === 'ready' && (
          <span className="ed-saved__count">
            {saved.items.length} de {SAVED_LIMIT}
          </span>
        )}
      </div>
      {saved.status === 'error' && (
        <p className="ed-hint ed-hint--warn">
          Não deu para abrir Minhas seções.{' '}
          <button className="ed-linkbtn" onClick={() => void saved.reload()} type="button">
            Tentar de novo
          </button>
        </p>
      )}
      {saved.status === 'ready' && saved.items.length === 0 && (
        <p className="ed-hint ed-saved__empty">
          Guarde uma seção para usar de novo em qualquer página: escolha a seção na página e toque
          em <b>⋯ → Guardar em Minhas seções</b>.
        </p>
      )}
      {saved.items.length > 0 && (
        <ul className="ed-saved__list">
          {(all ? saved.items : saved.items.slice(0, SAVED_PREVIEW)).map((section) => (
            <li className="ed-saved__item" key={section.id}>
              <button
                aria-disabled={!section.item || full ? true : undefined}
                className="ed-saved__use"
                onClick={() => use(section)}
                title={
                  !section.item
                    ? 'Esta seção não pode mais ser usada'
                    : full
                      ? 'A página já tem o máximo de seções'
                      : 'Colocar na página'
                }
                type="button"
              >
                <span className="ed-saved__thumb">
                  <SectionThumb type={section.type as keyof Components} />
                </span>
                <span className="ed-saved__text">
                  <b>{section.name}</b>
                  <span>
                    {section.item
                      ? sectionName(section.type)
                      : 'Esta seção não pode mais ser usada'}
                  </span>
                </span>
              </button>
              <SavedMenu
                name={section.name}
                onDelete={() => void remove(section)}
                onRename={section.item ? () => setRenaming(section) : undefined}
                onView={section.item ? () => requestView(section.item as SectionItem) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
      {saved.items.length > SAVED_PREVIEW && (
        <button
          aria-expanded={all}
          className="ed-linkbtn ed-saved__all"
          onClick={() => setAll((open) => !open)}
          type="button"
        >
          {all ? 'Mostrar menos' : `Ver todas as ${saved.items.length}`}
        </button>
      )}
      {renaming && <RenameDialog onClose={() => setRenaming(null)} section={renaming} />}
    </section>
  )
}

/** O ⋯ de cada seção guardada: Renomear, Ver como fica e Apagar. */
function SavedMenu({
  name,
  onRename,
  onView,
  onDelete,
}: {
  name: string
  onRename?: () => void
  onView?: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    wrap.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    const onDown = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        toggle.current?.focus()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const items = Array.from(
        wrap.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
      )
      if (!items.length) return
      event.preventDefault()
      const at = items.indexOf(document.activeElement as HTMLButtonElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      items[(at + step + items.length) % items.length]?.focus()
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const run = (action: () => void) => () => {
    setOpen(false)
    action()
  }

  return (
    <div className="ed-saved__more" ref={wrap}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Mais ações de “${name}”`}
        className="ed-icon-btn ed-icon-btn--sm"
        onClick={() => setOpen((value) => !value)}
        ref={toggle}
        type="button"
      >
        <PanelIcon name="more" size={16} />
      </button>
      {open && (
        <div aria-label={`Ações de “${name}”`} className="ed-saved__menu" role="menu">
          {onRename && (
            <button onClick={run(onRename)} role="menuitem" type="button">
              Renomear
            </button>
          )}
          {onView && (
            <button onClick={run(onView)} role="menuitem" type="button">
              Ver como fica
            </button>
          )}
          <button
            className="ed-saved__danger"
            onClick={run(onDelete)}
            role="menuitem"
            type="button"
          >
            Apagar
          </button>
        </div>
      )}
    </div>
  )
}

function RenameDialog({ section, onClose }: { section: SavedSection; onClose: () => void }) {
  const { apiRoute } = useEditor()
  const id = useId()
  const [name, setName] = useState(section.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const empty = !cleanSavedName(name)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (empty || busy) return
    setBusy(true)
    try {
      await renameSection(apiRoute, section.id, name)
      onClose()
    } catch {
      setBusy(false)
      setError('Não deu para renomear. Confira a internet e tente de novo.')
    }
  }

  return (
    <Dialog
      footer={
        <>
          <button className="ed-btn" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="ed-btn ed-btn--primary"
            disabled={empty || busy}
            form={`${id}-form`}
            type="submit"
          >
            {busy ? 'Salvando…' : 'Renomear'}
          </button>
        </>
      }
      onClose={onClose}
      title="Renomear seção guardada"
    >
      <form id={`${id}-form`} onSubmit={submit}>
        <label className="ed-field">
          <span>Nome</span>
          <input
            autoFocus
            className="ed-input"
            maxLength={SAVED_NAME_MAX}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <span className="ed-hint">
            {name.length} de {SAVED_NAME_MAX}
          </span>
        </label>
      </form>
      {error && (
        <p className="ed-hint ed-hint--warn" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  )
}
