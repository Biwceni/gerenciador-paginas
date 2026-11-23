'use client'

import React, { useEffect, useState } from 'react'

import {
  type FolderFilter,
  folderCounts,
  inFolder,
  matchesSearch,
  type PhotoFolder,
  PHOTOS_STEP,
  safeFolderFilter,
} from '@/lib/photoLibrary'
import type { Media } from '@/payload-types'

/**
 * Pasta e busca da biblioteca (C6), iguais na tela Fotos e nos seletores de foto. `extra` filtra
 * mais (Sem descrição, Não usadas, Fotos pequenas, na tela Fotos).
 */
export function usePhotoBrowse(
  photos: readonly Media[],
  folders: readonly PhotoFolder[],
  extra: (photo: Media) => boolean = () => true,
) {
  const [chosenFolder, setFolder] = useState<FolderFilter>('all')
  const [query, setQuery] = useState('')
  const folder = safeFolderFilter(chosenFolder, folders)
  const inPlace = photos.filter((photo) => inFolder(photo, folder))
  const shown = inPlace.filter((photo) => extra(photo) && matchesSearch(photo, query))
  return {
    folder,
    setFolder,
    query,
    setQuery,
    /** As fotos da pasta escolhida, antes da busca: os filtros contam a partir delas. */
    inPlace,
    shown,
    counts: folderCounts(photos),
    /** A pasta onde as fotos novas entram: a escolhida, ou nenhuma. */
    uploadFolder: typeof folder === 'number' ? folder : null,
  }
}

/**
 * Mostra as miniaturas aos poucos: as primeiras `PHOTOS_STEP`, e mais a cada vez que o fim da lista
 * aparece na tela. Com 500 fotos, a janela abre leve. `reset` volta ao começo (outra pasta ou busca).
 */
export function useStepper(total: number, reset: string) {
  const [state, setState] = useState({ reset, limit: PHOTOS_STEP })
  // Outra pasta ou outra busca: volta para as primeiras (ajuste durante a renderização, sem efeito).
  if (state.reset !== reset) setState({ reset, limit: PHOTOS_STEP })
  const limit = state.reset === reset ? state.limit : PHOTOS_STEP
  // Ref de função (estado): o observador acompanha o marcador do fim da lista quando ele aparece.
  const [node, sentinel] = useState<Element | null>(null)
  const more = limit < total
  useEffect(() => {
    if (!node || !more || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState((current) => ({ ...current, limit: current.limit + PHOTOS_STEP }))
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, more, limit])
  return {
    limit,
    more,
    sentinel,
    showMore: () => setState((current) => ({ ...current, limit: current.limit + PHOTOS_STEP })),
  }
}

type ChipsProps = {
  folders: readonly PhotoFolder[]
  counts: Map<number | 'none', number>
  total: number
  value: FolderFilter
  onChange: (value: FolderFilter) => void
  /** Botão no fim da fila (Nova pasta, na tela Fotos). */
  after?: React.ReactNode
}

/** Fila de pastas que rola para o lado no celular. Sem pasta nenhuma, nada aparece. */
export function FolderChips({ folders, counts, total, value, onChange, after }: ChipsProps) {
  if (!folders.length && !after) return null
  const none = counts.get('none') ?? 0
  const chip = (key: FolderFilter, label: string, count: number) => (
    <button
      aria-pressed={value === key}
      className="gp-folders__chip"
      key={String(key)}
      onClick={() => onChange(key)}
      type="button"
    >
      <span className="gp-folders__name">{label}</span>
      <span className="gp-folders__count">{count}</span>
    </button>
  )
  return (
    <div aria-label="Pastas" className="gp-folders" role="group">
      {folders.length > 0 && chip('all', 'Todas', total)}
      {folders.map((folder) => chip(folder.id, folder.name, counts.get(folder.id) ?? 0))}
      {folders.length > 0 && chip('none', 'Sem pasta', none)}
      {after}
    </div>
  )
}

/** Miniatura que só baixa quando chega perto da tela, sem segurar a janela. */
export function LazyThumb({ src }: { src: string | undefined }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt="" decoding="async" height={150} loading="lazy" src={src} width={200} />
}
