'use client'

import React, { useEffect, useRef, useState } from 'react'

import { canRotate, movingStripVisible, nextIndex } from './AutoRotate'

/** Voltas completas pelas chamadas antes de parar de vez na primeira (C1). */
export const HERO_LOOPS = 3

/**
 * Próximo passo da troca automática: a chamada seguinte e quantas voltas já foram. Depois da última
 * volta, para na primeira chamada (`stop`).
 */
export function heroStep(current: number, count: number, loops: number) {
  const next = nextIndex(current, count)
  const done = next === 0 ? loops + 1 : loops
  return { next, loops: done, stop: done >= HERO_LOOPS }
}

/** O mouse está em cima da seção, ou o foco do teclado está nela. */
const busy = (section: HTMLElement | null | undefined) =>
  Boolean(section && (section.matches(':hover') || section.contains(document.activeElement)))

/**
 * Banner com até 3 chamadas (C1). Só as bolinhas, sem setas nem botão de pausa (decisão de 22/11):
 * a troca para com o mouse em cima, um toque ou o foco do teclado, e para de vez depois de 3 voltas
 * ou quando a pessoa escolhe uma chamada pelas bolinhas. Com "reduzir movimento", fica só a
 * primeira (as bolinhas continuam, para quem quiser ver as outras). As camadas de cada chamada
 * (`[data-slide]`) vêm do servidor, e aqui só se troca qual está à vista (`data-on`); as que não
 * estão à vista ficam `inert`, fora do teclado e do leitor de tela.
 */
export function HeroRotate({
  count,
  seconds,
  autoplay,
  dots,
}: {
  count: number
  seconds: number
  autoplay: boolean
  dots: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [stopped, setStopped] = useState(!autoplay)
  const loops = useRef(0)
  const holding = useRef(false)
  const visible = useRef(false)

  // Mostra a chamada atual: liga `data-on` e tira o `inert` só dela.
  useEffect(() => {
    const section = ref.current?.closest('.hero')
    if (!section) return
    section.querySelectorAll<HTMLElement>('[data-slide]').forEach((layer) => {
      const on = Number(layer.dataset.slide) === current
      layer.toggleAttribute('data-on', on)
      if (layer.classList.contains('hero__copy')) {
        layer.inert = !on
        layer.setAttribute('aria-hidden', on ? 'false' : 'true')
      }
    })
  }, [current])

  // Mouse, toque e foco seguram a troca; a seção fora da tela também.
  useEffect(() => {
    const section = ref.current?.closest<HTMLElement>('.hero')
    if (!section) return
    const hold = () => {
      holding.current = true
    }
    const release = () => {
      holding.current = false
    }
    const blur = (event: FocusEvent) => {
      if (!section.contains(event.relatedTarget as Node | null)) release()
    }
    section.addEventListener('mouseenter', hold)
    section.addEventListener('mouseleave', release)
    section.addEventListener('touchstart', hold, { passive: true })
    section.addEventListener('touchend', release)
    section.addEventListener('focusin', hold)
    section.addEventListener('focusout', blur)
    const seen = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting
      },
      { threshold: 0.5 },
    )
    seen.observe(section)
    return () => {
      seen.disconnect()
      section.removeEventListener('mouseenter', hold)
      section.removeEventListener('mouseleave', release)
      section.removeEventListener('touchstart', hold)
      section.removeEventListener('touchend', release)
      section.removeEventListener('focusin', hold)
      section.removeEventListener('focusout', blur)
    }
  }, [])

  useEffect(() => {
    if (stopped) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const timer = window.setInterval(() => {
      const go = canRotate({
        visible: visible.current,
        reducedMotion: reduced.matches,
        paused: false,
        // O mouse pode já estar em cima antes de a página ficar pronta (sem o `mouseenter`).
        interacting: holding.current || busy(ref.current?.closest<HTMLElement>('.hero')),
        otherMotion: movingStripVisible(),
        scrollable: true,
      })
      if (!go) return
      const step = heroStep(current, count, loops.current)
      loops.current = step.loops
      setCurrent(step.next)
      if (step.stop) setStopped(true)
    }, seconds * 1000)
    return () => window.clearInterval(timer)
  }, [current, count, seconds, stopped])

  return (
    <div
      className="hero__dots"
      hidden={!dots}
      ref={ref}
      role="group"
      aria-label="Chamadas do banner"
    >
      {dots &&
        Array.from({ length: count }, (_, index) => (
          <button
            aria-current={index === current ? 'true' : undefined}
            aria-label={`Chamada ${index + 1} de ${count}`}
            className="hero__dot"
            key={index}
            onClick={() => {
              // Escolheu uma chamada: ela fica, e a troca automática para de vez.
              setStopped(true)
              setCurrent(index)
            }}
            type="button"
          />
        ))}
    </div>
  )
}

/**
 * Fotos das chamadas 2 e 3: só entram depois que a página terminou de carregar, para não disputar
 * com a primeira foto (a maior da tela, LCP).
 */
export function HeroLater({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const load = () => setReady(true)
    if (document.readyState === 'complete') {
      const timer = window.setTimeout(load, 0)
      return () => window.clearTimeout(timer)
    }
    window.addEventListener('load', load)
    return () => window.removeEventListener('load', load)
  }, [])
  return ready ? <>{children}</> : null
}
