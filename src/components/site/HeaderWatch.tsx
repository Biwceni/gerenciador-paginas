'use client'

import React, { useEffect, useRef } from 'react'

/**
 * Topo preso no alto ao rolar (T2): fica mais baixo e ganha uma sombra (`--scrolled`). No celular
 * some quando a pessoa desce e volta ao menor movimento para cima (`--hidden`); com "reduzir
 * movimento" ligado ou o menu do ☰ aberto, nunca some.
 *
 * Duas medidas vão para a página:
 * - `--site-header-h`: a altura do topo agora, que os links para uma seção descontam (o título não
 *   fica escondido embaixo do topo);
 * - `--site-header-top`: a altura do topo sem rolagem, que o banner da Vitrine sobe para ficar por
 *   baixo do topo transparente (A1). Não muda quando o topo encolhe ao rolar: assim nada pula.
 *
 * Fica em todo topo, inclusive no da página de campanha (sem menu). Não desenha nada.
 */
export function HeaderWatch() {
  const marker = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const header = marker.current?.closest<HTMLElement>('.site-header')
    const view = header?.ownerDocument.defaultView
    // No editor o topo fica parado (`data-editor`): sem encolher, nada se mexe embaixo do mouse.
    if (!header || !view || header.closest('[data-editor]')) return
    const root = header.ownerDocument.documentElement
    const calm = view.matchMedia('(prefers-reduced-motion: reduce)')

    const measure = () => {
      root.style.setProperty('--site-header-h', `${header.offsetHeight}px`)
      if (!header.classList.contains('site-header--scrolled')) {
        root.style.setProperty('--site-header-top', `${header.offsetHeight}px`)
      }
    }
    const size = new view.ResizeObserver(measure)
    size.observe(header)

    let last = view.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = Math.max(0, view.scrollY)
      header.classList.toggle('site-header--scrolled', y > 4)
      const phone = header.clientWidth <= 720
      const down = y > last
      const open = header.classList.contains('site-header--open')
      if (!phone || calm.matches || open || y < header.offsetHeight) {
        header.classList.remove('site-header--hidden')
      } else if (down && y - last > 2) {
        header.classList.add('site-header--hidden')
      } else if (!down) {
        header.classList.remove('site-header--hidden')
      }
      last = y
    }
    const onScroll = () => {
      if (!frame) frame = view.requestAnimationFrame(update)
    }
    update()
    measure()
    view.addEventListener('scroll', onScroll, { passive: true })
    // Foco num link escondido embaixo do topo sumido: o topo volta.
    const onFocus = (event: FocusEvent) => {
      if (header.contains(event.target as Node)) header.classList.remove('site-header--hidden')
    }
    header.addEventListener('focusin', onFocus)
    return () => {
      size.disconnect()
      view.removeEventListener('scroll', onScroll)
      header.removeEventListener('focusin', onFocus)
      if (frame) view.cancelAnimationFrame(frame)
    }
  }, [])

  return <span hidden ref={marker} />
}
