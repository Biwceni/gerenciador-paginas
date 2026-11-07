'use client'

import React, { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { Photo } from '@/components/site/Photo'
import type { Media } from '@/payload-types'

type Props = {
  photos: Media[]
  /** No site, cada foto abre em tela cheia; no editor, não (o clique escolhe a seção). */
  viewer: boolean
}

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
export function GalleryGrid({ photos, viewer }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const [current, setCurrent] = useState<number | null>(null)
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

  const items = photos.map((photo, index) => (
    <li className="anim-part" key={`${photo.id}-${index}`} style={order(index)}>
      {viewer ? (
        <button
          aria-label={`Ver foto ${index + 1} de ${total} em tela cheia${photo.alt ? `: ${photo.alt}` : ''}`}
          className="gallery__open"
          onClick={(event) => open(index, event.currentTarget)}
          type="button"
        >
          <Photo className="anim-part" fill media={photo} sizes="(max-width: 720px) 50vw, 340px" />
        </button>
      ) : (
        <Photo className="anim-part" fill media={photo} sizes="(max-width: 720px) 50vw, 340px" />
      )}
    </li>
  ))

  const photo = current === null ? null : photos[current]

  return (
    <>
      <ul className={`gallery${total % 2 ? ' gallery--odd' : ''}`}>{items}</ul>
      {viewer && (
        <dialog
          aria-label="Fotos da galeria"
          className="lightbox"
          onClick={(event) => {
            // Clique fora da foto (no fundo escuro) fecha.
            if (event.target === event.currentTarget) close()
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
                {(photo.alt || total > 1) && (
                  <figcaption className="lightbox__caption">
                    {photo.alt && <span>{photo.alt}</span>}
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
