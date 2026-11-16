'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** A partir desta largura o topo nunca usa o ☰: o menu que não cabe vai para uma segunda linha. */
const ROWS_FROM = 1024

/**
 * Como o topo se arranja, medido no navegador sempre que o nome, o menu ou a largura mudam
 * (inclusive quando a fonte termina de carregar):
 *
 * - tudo numa linha (`--full`), quando o nome e o menu cabem;
 * - em duas linhas (`--rows`, T1), a partir de 1024 px: em cima o nome e o botão de destaque,
 *   embaixo os links, no centro;
 * - com o ☰ (`--compact`), abaixo de 1024 px quando não cabe, e sempre até 720 px.
 *
 * Até 1023 px o ☰ já vem do CSS (antes do JavaScript, nome e menu não se sobrepõem). Com o ☰, o
 * botão de destaque fica ao lado dele, compacto: se o nome e o botão com texto não couberem juntos,
 * fica só o ícone (`--cta-icon`) ou, sem ícone que diga o destino, só dentro do ☰. Até 720 px isso
 * já vem do servidor (`data-cta` em `SiteHeaderView`), para o topo não mudar depois que carrega.
 */
function useHeaderLayout(button: React.RefObject<HTMLButtonElement | null>) {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const header = button.current?.closest<HTMLElement>('.site-header')
    const bar = header?.querySelector<HTMLElement>('.site-header__bar')
    const brand = header?.querySelector<HTMLElement>('.site-header__brand')
    const nav = header?.querySelector<HTMLElement>('.site-header__nav')
    const cta = header?.querySelector<HTMLElement>('.site-header__cta')
    // A prévia do editor desenha o topo dentro de um iframe: vale a janela dele.
    const view = header?.ownerDocument.defaultView
    if (!header || !bar || !brand || !nav || !view) return

    const check = () => {
      const style = view.getComputedStyle(bar)
      const gap = parseFloat(style.columnGap) || 0
      const width = bar.clientWidth - parseFloat(style.paddingLeft) * 2
      // Mede tudo no tamanho inteiro (nome e menu numa linha, botão com texto) e volta na hora.
      header.classList.add('site-header--measure')
      const brandWidth = brand.scrollWidth
      const navWidth = nav.scrollWidth
      const ctaWidth = cta?.offsetWidth ?? 0
      const burgerWidth = button.current?.offsetWidth || 44
      header.classList.remove('site-header--measure')

      // Até 720 px o CSS esconde o menu (`display: none`, mede 0): ali o topo é sempre o do ☰.
      const navHidden = nav.getClientRects().length === 0
      const fits = brandWidth + gap + navWidth <= width
      const rows = !navHidden && !fits && header.clientWidth >= ROWS_FROM
      const next = navHidden || (!fits && !rows)
      // As duas classes: entre 721 e 1023 px o CSS já começa com o ☰ e espera o `--full`.
      header.classList.toggle('site-header--compact', next)
      header.classList.toggle('site-header--rows', rows)
      header.classList.toggle('site-header--full', !next)
      // No celular quem decide é o servidor (`data-cta`): mudar aqui deslocava a página.
      header.classList.toggle(
        'site-header--cta-icon',
        next && !navHidden && brandWidth + gap + ctaWidth + gap + burgerWidth > width,
      )
      setCompact(next)
    }
    const observer = new view.ResizeObserver(check)
    for (const element of [bar, brand, nav]) observer.observe(element)
    return () => observer.disconnect()
  }, [button])

  return compact
}

/**
 * Topo preso no alto ao rolar (T2): fica mais baixo e ganha uma sombra (`--scrolled`). No celular
 * some quando a pessoa desce e volta ao menor movimento para cima (`--hidden`); com "reduzir
 * movimento" ligado, nunca some. A altura do topo vai para `--site-header-h`, que os links para
 * uma seção descontam (o título não fica escondido embaixo do topo).
 */
function useStickyHeader(button: React.RefObject<HTMLButtonElement | null>, open: boolean) {
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    const header = button.current?.closest<HTMLElement>('.site-header')
    const view = header?.ownerDocument.defaultView
    if (!header || !view) return
    const root = header.ownerDocument.documentElement
    const calm = view.matchMedia('(prefers-reduced-motion: reduce)')

    const size = new view.ResizeObserver(() => {
      root.style.setProperty('--site-header-h', `${header.offsetHeight}px`)
    })
    size.observe(header)

    let last = view.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = Math.max(0, view.scrollY)
      header.classList.toggle('site-header--scrolled', y > 4)
      const phone = header.clientWidth <= 720
      const down = y > last
      if (!phone || calm.matches || openRef.current || y < header.offsetHeight) {
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
  }, [button])
}

/**
 * Menu do ☰ (T3): abre em tela cheia, embaixo do topo, com a própria rolagem por dentro, e a página
 * de trás fica parada enquanto ele está aberto. Fica fora do topo (no elemento em volta dele), para
 * nenhum efeito do topo (como o vidro da Vitrine) prender o menu dentro dele. Enquanto aberto, a
 * tecla Tab anda só entre o ☰ e o menu, o Esc fecha e tocar num link fecha.
 */
export function HeaderMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLElement>(null)
  const compact = useHeaderLayout(button)
  useStickyHeader(button, open)
  const [host, setHost] = useState<Element | null>(null)
  useEffect(() => {
    setHost(button.current?.closest('.site-header')?.parentElement ?? null)
  }, [])
  // Voltou a caber: o menu aberto do ☰ fecha junto.
  const [wasCompact, setWasCompact] = useState(compact)
  if (wasCompact !== compact) {
    setWasCompact(compact)
    if (!compact) setOpen(false)
  }

  useEffect(() => {
    const header = button.current?.closest<HTMLElement>('.site-header')
    header?.classList.toggle('site-header--open', open)
    if (!open || !header) return
    header.classList.remove('site-header--hidden')
    const doc = header.ownerDocument
    const view = doc.defaultView
    const root = doc.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    // O menu começa onde o topo termina, inclusive quando o topo encolhe ou cresce.
    const place = () => {
      if (menu.current) menu.current.style.top = `${header.getBoundingClientRect().bottom}px`
    }
    place()
    const size = view ? new view.ResizeObserver(place) : null
    size?.observe(header)
    menu.current?.scrollTo?.(0, 0)

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      // Foco preso no ☰ e no menu, nessa ordem (o menu fica no fim da página).
      const items = [
        button.current,
        ...(menu.current?.querySelectorAll<HTMLElement>('a[href], button') ?? []),
      ].filter((item): item is HTMLElement => Boolean(item))
      const index = items.indexOf(doc.activeElement as HTMLElement)
      const next = event.shiftKey ? index - 1 : index + 1
      event.preventDefault()
      items[(next + items.length) % items.length]?.focus()
    }
    doc.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = previous
      size?.disconnect()
      doc.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        aria-controls="menu-celular"
        aria-expanded={open}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        className="site-header__burger"
        onClick={() => setOpen((value) => !value)}
        ref={button}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="20"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          width="20"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {host &&
        createPortal(
          <nav
            aria-label="Menu principal"
            className="site-header__mobile"
            hidden={!open}
            id="menu-celular"
            onClick={(event) => {
              if ((event.target as Element).closest('a')) setOpen(false)
            }}
            ref={menu}
          >
            <div className="site-header__mobile-inner">{children}</div>
          </nav>,
          host,
        )}
    </>
  )
}
