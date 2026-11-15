'use client'

import React, { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { Photo } from '@/components/site/Photo'
import type { Media } from '@/payload-types'

import { galleryColumns } from '../layout'

type Props = {
  /** Cada foto e a legenda dela (a escrita na galeria ou, sem ela, a descrição da foto). */
  items: { photo: Media; caption: string }[]
  /** Grade de quadrados ou mosaico em colunas (fotos na proporção delas). */
  layout?: 'grid' | 'masonry'
  /** Legenda embaixo de cada foto. Na tela cheia, a legenda aparece sempre. */
  showCaptions?: boolean
  /** No site, cada foto abre em tela cheia; no editor, não (o clique escolhe a seção). */
  viewer: boolean
}

/** Quantas fotos aparecem antes do "Ver mais fotos": no computador e no celular (2 colunas). */
export const GALLERY_FOLD = 12
export const GALLERY_FOLD_MOBILE = 10

const order = (index: number) => ({ '--i': index }) as React.CSSProperties

/** Troca a foto com a transição do navegador, quando ele tem e a pessoa não pediu menos movimento. */
function withTransition(change: () => void) {
  const start = (document as Document & { startViewTransition?: (callback: () => void) => unknown })
    .startViewTransition
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!start || calm) return change()
  start.call(document, () => flushSync(change))
}

/**
 * Fotos da galeria. No site, cada uma é um botão que abre a foto grande num `<dialog>`, com a
 * descrição, o contador ("3 de 12"), setas e teclado (← →, Esc). O foco fica preso na janela e volta
 * para a foto clicada ao fechar. A foto grande só é baixada quando a janela abre.
 */
export function GalleryGrid({
  items: entries,
  layout = 'grid',
  showCaptions = false,
  viewer,
}: Props) {
  const photos = entries.map((entry) => entry.photo)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const [current, setCurrent] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const total = photos.length

  const open = (index: number, button: HTMLButtonElement) => {
    opener.current = button
    setCurrent(index)
  }

  // Abre depois de desenhar a foto: o `showModal` prende o foco e deixa o resto da página inerte.
  useEffect(() => {
    if (current !== null && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [current])

  const close = () => dialog.current?.close()

  const go = (by: number) =>
    withTransition(() =>
      setCurrent((index) => (index === null ? index : (index + by + total) % total)),
    )

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(-1)
    }
  }

  const masonry = layout === 'masonry'
  // Grade: quadrados que preenchem a moldura. Mosaico: a foto na proporção dela.
  const picture = (photo: Media) => (
    <Photo
      className="anim-part"
      fill={!masonry}
      media={photo}
      sizes="(max-width: 720px) 50vw, 380px"
    />
  )

  // Mosaico em linhas (C9, achado Gallery-3): a ordem da lista, a mesma altura em cada linha e a
  // largura pelo formato da foto (`--ar`), sem cortar.
  const ratio = (photo: Media) =>
    photo.width && photo.height ? Math.round((photo.width / photo.height) * 1000) / 1000 : 1
  const items = entries.map(({ photo, caption }, index) => (
    <li
      className="anim-part"
      key={`${photo.id}-${index}`}
      style={
        masonry ? ({ ...order(index), '--ar': ratio(photo) } as React.CSSProperties) : order(index)
      }
    >
      <figure className="gallery__item">
        <div className="gallery__frame">
          {viewer ? (
            <button
              aria-label={`Ver foto ${index + 1} de ${total} em tela cheia${caption ? `: ${caption}` : ''}`}
              className="gallery__open"
              onClick={(event) => open(index, event.currentTarget)}
              type="button"
            >
              {picture(photo)}
            </button>
          ) : (
            picture(photo)
          )}
        </div>
        {showCaptions && caption && <figcaption className="gallery__caption">{caption}</figcaption>}
      </figure>
    </li>
  ))

  const photo = current === null ? null : photos[current]
  const caption = current === null ? '' : entries[current].caption
  // Grade: colunas pela quantidade, sem foto sozinha na última linha (a sobra fica no centro).
  const columns = masonry ? Math.min(Math.max(total, 1), 3) : galleryColumns(total)
  const classes = [
    'gallery',
    `gallery--${layout}`,
    total % 2 && !masonry && 'gallery--odd',
    showCaptions && 'gallery--captions',
  ]

  // Muitas fotos (A7, achado G5): no site, as primeiras 12 (10 no celular) e "Ver mais fotos". A
  // ordem continua a da lista, e a tela cheia passa por todas.
  const folded = viewer && total > GALLERY_FOLD && !showAll

  return (
    <>
      <ul
        className={classes.filter(Boolean).join(' ')}
        data-count={total}
        data-folded={folded || undefined}
        style={{ '--cols': columns } as React.CSSProperties}
      >
        {items}
      </ul>
      {folded && (
        <button
          className="button button--ghost gallery__more"
          onClick={() => setShowAll(true)}
          type="button"
        >
          Ver mais fotos
          <span className="gallery__more-count gallery__more-count--wide">
            {' '}
            (mais {total - GALLERY_FOLD})
          </span>
          <span className="gallery__more-count gallery__more-count--narrow">
            {' '}
            (mais {total - GALLERY_FOLD_MOBILE})
          </span>
        </button>
      )}
      {viewer && (
        <dialog
          aria-label="Fotos da galeria"
          className="lightbox"
          onClick={(event) => {
            // Clique no fundo escuro fecha. O fundo é a própria janela ou as caixas que cobrem a tela
            // inteira em volta da foto; a foto, a legenda e os botões não fecham.
            const target = event.target as Element
            if (
              target === event.currentTarget ||
              target.classList.contains('lightbox__inner') ||
              target.classList.contains('lightbox__figure')
            ) {
              close()
            }
          }}
          onClose={() => {
            setCurrent(null)
            opener.current?.focus()
          }}
          onKeyDown={onKeyDown}
          ref={dialog}
        >
          {photo && (
            <div className="lightbox__inner">
              {/* Primeiro na ordem: é onde o foco cai ao abrir. */}
              <button aria-label="Fechar" className="lightbox__close" onClick={close} type="button">
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="22"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="22"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <figure className="lightbox__figure">
                <div className="lightbox__photo">
                  <Photo fill media={photo} sizes="100vw" />
                </div>
                {(caption || total > 1) && (
                  <figcaption className="lightbox__caption">
                    {caption && <span>{caption}</span>}
                    <span aria-live="polite" className="lightbox__count">
                      {(current ?? 0) + 1} de {total}
                    </span>
                  </figcaption>
                )}
              </figure>
              {total > 1 && (
                <>
                  <button
                    aria-label="Foto anterior"
                    className="lightbox__nav lightbox__nav--prev"
                    onClick={() => go(-1)}
                    type="button"
                  >
                    <Arrow direction="left" />
                  </button>
                  <button
                    aria-label="Próxima foto"
                    className="lightbox__nav lightbox__nav--next"
                    onClick={() => go(1)}
                    type="button"
                  >
                    <Arrow direction="right" />
                  </button>
                </>
              )}
            </div>
          )}
        </dialog>
      )}
    </>
  )
}

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
    >
      <path d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}
