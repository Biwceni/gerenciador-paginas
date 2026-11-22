'use client'

import React, { useEffect, useRef, useState } from 'react'

/** Tempo de cada item na tela antes de passar para o próximo. */
export const ROTATE_MS = 6000

/**
 * Pode trocar sozinho agora? Só com a lista na tela, sem "reduzir movimento", sem a pessoa mexendo
 * (dedo, mouse, foco ou rolagem) e sem outra coisa correndo na tela: com a Faixa de aviso Correndo à
 * vista, a lista espera (duas coisas mexendo ao mesmo tempo cansam e atrapalham a leitura).
 */
export function canRotate(state: {
  visible: boolean
  reducedMotion: boolean
  paused: boolean
  interacting: boolean
  otherMotion: boolean
  scrollable: boolean
}): boolean {
  return (
    state.visible &&
    state.scrollable &&
    !state.reducedMotion &&
    !state.paused &&
    !state.interacting &&
    !state.otherMotion
  )
}

/** O próximo item, voltando ao primeiro depois do último. */
export const nextIndex = (current: number, count: number) => (count ? (current + 1) % count : 0)

/** Faixa de aviso Correndo visível na tela (ela já se mexe). */
export function movingStripVisible(): boolean {
  return [...document.querySelectorAll('.announce--move')].some((strip) => {
    const box = strip.getBoundingClientRect()
    return box.bottom > 0 && box.top < window.innerHeight
  })
}

/**
 * Lista que desliza para o lado e troca sozinha (A7, achado G5): os Depoimentos no celular. Quando a
 * lista cabe inteira (no computador, em grade), nada acontece. A troca para ao tocar, deslizar,
 * passar o mouse ou receber foco do teclado; não roda com "reduzir movimento"; e o botão de pausar
 * fica sempre à vista enquanto ela pode trocar. Os pontinhos mostram em que item está.
 */
export function AutoRotate({
  children,
  label,
  count,
}: {
  children: React.ReactNode
  /** O que troca, para o botão: "depoimentos". */
  label: string
  count: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [scrollable, setScrollable] = useState(false)
  const interacting = useRef(false)
  const visible = useRef(false)
  const programmatic = useRef(false)

  const list = () => box.current?.querySelector<HTMLElement>(':scope > ul, :scope > ol') ?? null

  // Deslizar ou tocar em outro item atualiza os pontinhos.
  useEffect(() => {
    const element = list()
    if (!element) return
    const measure = () => setScrollable(element.scrollWidth > element.clientWidth + 4)
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(element)
    const onScroll = () => {
      const items = [...element.children] as HTMLElement[]
      const left = element.scrollLeft
      const index = items.reduce(
        (best, item, i) =>
          Math.abs(item.offsetLeft - element.offsetLeft - left) <
          Math.abs(items[best].offsetLeft - element.offsetLeft - left)
            ? i
            : best,
        0,
      )
      setCurrent(index)
      // Quem deslizou foi a pessoa: para de trocar sozinho até ela soltar.
      if (!programmatic.current) interacting.current = true
    }
    // Fim da rolagem: a troca automática terminou, ou a pessoa soltou a lista depois de deslizar.
    const onScrollEnd = () => {
      if (programmatic.current) programmatic.current = false
      else interacting.current = false
    }
    element.addEventListener('scroll', onScroll, { passive: true })
    element.addEventListener('scrollend', onScrollEnd)
    const seen = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting
      },
      { threshold: 0.5 },
    )
    seen.observe(element)
    return () => {
      resize.disconnect()
      seen.disconnect()
      element.removeEventListener('scroll', onScroll)
      element.removeEventListener('scrollend', onScrollEnd)
    }
  }, [])

  // Faixa que desliza: quem usa o teclado precisa poder entrar nela e rolar com as setas.
  useEffect(() => {
    const element = list()
    if (!element) return
    if (scrollable) element.tabIndex = 0
    else element.removeAttribute('tabindex')
  }, [scrollable])

  useEffect(() => {
    if (!scrollable) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const timer = window.setInterval(() => {
      const element = list()
      if (!element) return
      const go = canRotate({
        visible: visible.current,
        reducedMotion: reduced.matches,
        paused,
        interacting: interacting.current,
        otherMotion: movingStripVisible(),
        scrollable: true,
      })
      if (!go) return
      const items = [...element.children] as HTMLElement[]
      const target = items[nextIndex(current, items.length)]
      if (!target) return
      programmatic.current = true
      element.scrollTo({ left: target.offsetLeft - element.offsetLeft, behavior: 'smooth' })
    }, ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [current, paused, scrollable])

  const hold = () => {
    interacting.current = true
  }
  const release = () => {
    interacting.current = false
  }

  return (
    <div
      className="auto-rotate"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) release()
      }}
      onFocus={hold}
      onMouseEnter={hold}
      onMouseLeave={release}
      onTouchEnd={release}
      onTouchStart={hold}
      ref={box}
    >
      {children}
      {scrollable && count > 1 && (
        <div className="auto-rotate__bar">
          <span aria-hidden="true" className="auto-rotate__dots">
            {Array.from({ length: count }, (_, index) => (
              <span
                className={`auto-rotate__dot${index === current ? ' auto-rotate__dot--on' : ''}`}
                key={index}
              />
            ))}
          </span>
          <button
            aria-pressed={paused}
            className="auto-rotate__pause"
            onClick={() => setPaused((value) => !value)}
            type="button"
          >
            <svg aria-hidden="true" height="14" viewBox="0 0 24 24" width="14">
              {paused ? (
                <path d="M8 5v14l11-7z" fill="currentColor" />
              ) : (
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
              )}
            </svg>
            <span className="visually-hidden">
              {paused ? `Voltar a trocar os ${label}` : `Parar de trocar os ${label}`}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
