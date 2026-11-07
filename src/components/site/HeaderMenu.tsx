'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Topo que não cabe numa linha (menu comprido, botão com texto longo) passa a usar o ☰, como no
 * celular: assim nada quebra em duas linhas nem passa da largura. Mede o nome do site e o menu
 * inteiros e compara com a largura do topo, sempre que algum deles muda de tamanho (inclusive
 * quando a fonte termina de carregar). Até 1023 px o ☰ já vem do CSS (antes do JavaScript, nome e
 * menu não se sobrepõem); entre 721 e 1023 px, o `--full` devolve o menu inteiro quando ele cabe.
 *
 * Com o ☰, o botão de destaque fica ao lado dele, compacto. Se o nome do site e o botão com texto
 * não couberem juntos, o botão fica só com o ícone (`--cta-icon`) ou, sem ícone que diga o destino,
 * só dentro do ☰. Até 720 px isso já vem do servidor (`data-cta` em `SiteHeaderView`), para o topo
 * não mudar de tamanho depois que a página carrega.
 */
function useCompactHeader(button: React.RefObject<HTMLButtonElement | null>) {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const header = button.current?.closest('.site-header')
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
      // Mede tudo no tamanho inteiro (nome numa linha, botão com texto) e volta na mesma hora.
      header.classList.add('site-header--measure')
      const brandWidth = brand.scrollWidth
      const navWidth = nav.scrollWidth
      const ctaWidth = cta?.offsetWidth ?? 0
      const burgerWidth = button.current?.offsetWidth || 44
      header.classList.remove('site-header--measure')

      // Até 720 px o CSS esconde o menu (`display: none`, mede 0): ali o topo é sempre o do ☰.
      const navHidden = nav.getClientRects().length === 0
      const next = navHidden || brandWidth + gap + navWidth > width
      // As duas classes: entre 721 e 1023 px o CSS já começa com o ☰ e espera o `--full`.
      header.classList.toggle('site-header--compact', next)
      header.classList.toggle('site-header--full', !next)
      // No celular quem decide é o servidor (`data-cta`): mudar aqui deslocava a página.
      header.classList.toggle(
        'site-header--cta-icon',
        !navHidden && brandWidth + gap + ctaWidth + gap + burgerWidth > width,
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
 * Menu do celular: o botão abre a lista embaixo do topo e escurece o resto da página (tocar no
 * fundo fecha). Enquanto aberto, a tecla Tab fica dentro do menu e o Esc fecha; tocar num link
 * fecha.
 */
export function HeaderMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLElement>(null)
  const compact = useCompactHeader(button)
  // O fundo escuro fica fora do topo (no elemento em volta dele), para não escurecer o próprio topo.
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
    const header = button.current?.closest('.site-header')
    header?.classList.toggle('site-header--open', open)
    if (!open) return
    const doc = button.current?.ownerDocument
    if (!doc) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      // Foco preso no menu: do último volta para o ☰, e vice-versa.
      const items = [
        button.current,
        ...(menu.current?.querySelectorAll<HTMLElement>('a[href], button') ?? []),
      ].filter((item): item is HTMLElement => Boolean(item))
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    doc.addEventListener('keydown', onKey)
    return () => doc.removeEventListener('keydown', onKey)
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
        {children}
      </nav>
      {open &&
        host &&
        createPortal(
          <div
            aria-hidden="true"
            className="site-header__backdrop"
            onClick={() => setOpen(false)}
          />,
          host,
        )}
    </>
  )
}
