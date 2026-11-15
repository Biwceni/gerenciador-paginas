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
 * teclado (a faixa recebe foco). Sem botão de pausar.
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
  return (
    <div className={className} data-held={held || undefined} {...handlers}>
      <div aria-label={label} className="announce__note" role="note" tabIndex={0}>
        {children}
      </div>
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
      // Mouse em cima, dedo encostado ou foco do teclado: espera.
      if (strip?.matches(':hover, :focus-within, [data-held]')) return
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
