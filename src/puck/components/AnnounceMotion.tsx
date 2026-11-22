'use client'

import React, { useEffect, useRef, useState } from 'react'

/** Tempo de cada frase na Faixa de aviso Parada, quando ela troca uma por vez. */
export const ANNOUNCE_ROTATE_MS = 5000

/** Frases que a faixa Parada mostra juntas; com mais, troca uma por vez (C2, achado Announcement-2). */
export const ANNOUNCE_STILL_MAX = 2

/**
 * Segura a faixa enquanto o dedo está encostado (o `:hover` do celular não para nada). Marca
 * `data-held` na faixa; o CSS para a trilha e a troca das frases.
 */
function useHold() {
  const [held, setHeld] = useState(false)
  const handlers = {
    onPointerDown: () => setHeld(true),
    onPointerUp: () => setHeld(false),
    onPointerCancel: () => setHeld(false),
    onPointerLeave: () => setHeld(false),
  }
  return { held, handlers }
}

/**
 * Faixa de aviso no site (C2): para com o mouse em cima, com o dedo encostado e com o foco do
 * teclado (a faixa recebe foco). O botão de pausar (A2) para de vez, até tocar de novo: quem lê
 * devagar não precisa segurar a faixa. Só aparece quando a faixa se mexe (o CSS o esconde para quem
 * pediu menos movimento e nas prévias).
 */
export function AnnounceStrip({
  className,
  label,
  children,
}: {
  className: string
  /** O aviso inteiro, para o leitor de tela. */
  label: string
  children: React.ReactNode
}) {
  const { held, handlers } = useHold()
  const [paused, setPaused] = useState(false)
  return (
    <div
      className={className}
      data-held={held || undefined}
      data-paused={paused || undefined}
      {...handlers}
    >
      <div aria-label={label} className="announce__note" role="note" tabIndex={0}>
        {children}
      </div>
      <button
        aria-label={paused ? 'Continuar o aviso' : 'Pausar o aviso'}
        aria-pressed={paused}
        className="announce__pause"
        onClick={() => setPaused((value) => !value)}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        <svg aria-hidden="true" fill="currentColor" height="14" viewBox="0 0 16 16" width="14">
          {paused ? <path d="M4 2.5v11l9-5.5z" /> : <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />}
        </svg>
      </button>
    </div>
  )
}

/**
 * As frases da faixa Parada, uma por vez quando são mais de duas. A troca para do mesmo jeito que a
 * faixa Correndo; com "reduzir movimento", o CSS mostra todas juntas e nada troca.
 */
export function AnnounceRotate({ texts }: { texts: string[] }) {
  const box = useRef<HTMLParagraphElement>(null)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const timer = window.setInterval(() => {
      const element = box.current
      if (!element || reduced.matches || document.visibilityState !== 'visible') return
      const strip = element.closest('.announce')
      // Mouse em cima, dedo encostado, foco do teclado ou pausada no botão: espera.
      if (strip?.matches(':hover, :focus-within, [data-held], [data-paused]')) return
      setCurrent((index) => (index + 1) % texts.length)
    }, ANNOUNCE_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [texts.length])

  return (
    <p aria-hidden="true" className="announce__still announce__still--rotate" ref={box}>
      {texts.map((text, index) => (
        <span
          className="announce__item"
          data-on={index === current % texts.length || undefined}
          key={index}
        >
          {text}
        </span>
      ))}
    </p>
  )
}
