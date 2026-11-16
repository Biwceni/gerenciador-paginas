'use client'

import { useGetPuck } from '@puckeditor/core'
import React, { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { SECTION_LABELS } from '@/puck/config'

import { ChoiceThumb, type ChoiceThumbName } from './ChoiceThumbs'
import { usePuck } from './puck'

// "Escolher o jeito da seção já no catálogo" (Elementor, E7). Um clique na lista coloca a seção
// como sempre (o primeiro jeito é o de hoje); logo depois, embaixo da prévia, aparecem os outros
// jeitos dela, para trocar com um toque. Tudo continua mudável depois em Aparência.

type Variant = { value: string; label: string; thumb: ChoiceThumbName }

/** Seções com mais de um jeito: o campo que muda e as opções (a primeira é a de hoje). */
export const SECTION_VARIANTS: Partial<
  Record<keyof typeof SECTION_LABELS, { field: string; variants: Variant[] }>
> = {
  Hero: {
    field: 'style',
    variants: [
      { value: 'image', label: 'Foto de fundo', thumb: 'hero-image' },
      { value: 'side', label: 'Foto ao lado', thumb: 'hero-side' },
      { value: 'brand', label: 'Sem foto', thumb: 'bg-brand' },
    ],
  },
  Features: {
    field: 'marker',
    variants: [
      { value: 'none', label: 'Só texto', thumb: 'marker-none' },
      { value: 'icon', label: 'Ícones', thumb: 'marker-icon' },
      { value: 'number', label: 'Números', thumb: 'marker-number' },
    ],
  },
  Products: {
    field: 'layout',
    variants: [
      { value: 'three', label: '3 por linha', thumb: 'products-three' },
      { value: 'two', label: '2 grandes', thumb: 'products-two' },
      { value: 'list', label: 'Lista com foto', thumb: 'products-list' },
    ],
  },
  Gallery: {
    field: 'layout',
    variants: [
      { value: 'grid', label: 'Grade', thumb: 'gallery-grid' },
      { value: 'masonry', label: 'Mosaico', thumb: 'gallery-masonry' },
    ],
  },
  PriceList: {
    field: 'columns',
    variants: [
      { value: 'two', label: 'Duas colunas', thumb: 'prices-two' },
      { value: 'one', label: 'Uma coluna', thumb: 'prices-one' },
    ],
  },
}

let added: { id: string; type: string } | null = null
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const setAdded = (next: typeof added) => {
  added = next
  listeners.forEach((listener) => listener())
}

/** A seção que acabou de entrar pela lista: mostra os jeitos dela, se tiver. */
export const offerVariants = (id: string, type: string) =>
  setAdded(type in SECTION_VARIANTS ? { id, type } : null)

/** Faixa "Escolha o jeito", embaixo da prévia. Some ao escolher outra seção ou em "Pronto". */
export function SectionVariantsBar() {
  const current = useSyncExternalStore(
    subscribe,
    () => added,
    () => null,
  )
  const getPuck = useGetPuck()
  const selectedId = usePuck((s) => (s.selectedItem?.props.id as string | undefined) ?? null)
  const value = usePuck((s) => {
    if (!current) return undefined
    const config = SECTION_VARIANTS[current.type as keyof typeof SECTION_VARIANTS]
    const item = s.appState.data.content.find((section) => section.props.id === current.id)
    return item && config ? (item.props[config.field] as string) : undefined
  })
  const canvas =
    typeof document === 'undefined'
      ? null
      : document.querySelector<HTMLElement>('.ed-root [class*="PuckCanvas_"]')

  if (!current || !canvas || value === undefined) return null
  // Escolheu outra seção (ou nenhuma): a oferta acabou.
  if (selectedId !== current.id) {
    queueMicrotask(() => added === current && setAdded(null))
    return null
  }
  const config = SECTION_VARIANTS[current.type as keyof typeof SECTION_VARIANTS]!
  const name = (SECTION_LABELS as Record<string, string>)[current.type] ?? 'seção'

  const choose = (next: string) => {
    const puck = getPuck()
    const item = puck.getItemById(current.id)
    const selector = puck.getSelectorForId(current.id)
    if (!item || !selector || item.props[config.field] === next) return
    puck.dispatch({
      type: 'replace',
      destinationIndex: selector.index,
      destinationZone: selector.zone,
      data: { ...item, props: { ...item.props, [config.field]: next } },
    })
  }

  return createPortal(
    <div aria-label={`Jeito do ${name}`} className="ed-variants" role="group">
      <span className="ed-variants__title">
        <b>Escolha o jeito</b>
        <span>Dá para trocar depois em Aparência.</span>
      </span>
      <div className="ed-variants__list" role="radiogroup" aria-label={`Jeito do ${name}`}>
        {config.variants.map((variant) => (
          <label className="ed-thumb ed-variants__item" key={variant.value}>
            <input
              checked={value === variant.value}
              className="ed-thumb__input"
              name={`ed-variant-${current.id}`}
              onChange={() => choose(variant.value)}
              type="radio"
              value={variant.value}
            />
            <ChoiceThumb name={variant.thumb} />
            <span className="ed-thumb__text">
              <b>{variant.label}</b>
            </span>
          </label>
        ))}
      </div>
      <button className="ed-btn ed-btn--sm" onClick={() => setAdded(null)} type="button">
        Pronto
      </button>
    </div>,
    canvas,
  )
}
