'use client'

import React, { useEffect, useRef, useState } from 'react'

/**
 * Topo que não cabe numa linha (menu comprido, botão com texto longo) passa a usar o ☰, como no
 * celular: assim nada quebra em duas linhas nem passa da largura. Mede o nome do site e o menu
 * inteiros e compara com a largura do topo, sempre que algum deles muda de tamanho (inclusive
 * quando a fonte termina de carregar). Até 1023 px o ☰ já vem do CSS (antes do JavaScript, nome e
 * menu não se sobrepõem); entre 721 e 1023 px, o `--full` devolve o menu inteiro quando ele cabe.
 */
function useCompactHeader(button: React.RefObject<HTMLButtonElement | null>) {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const header = button.current?.closest('.site-header')
    const bar = header?.querySelector<HTMLElement>('.site-header__bar')
    const brand = header?.querySelector<HTMLElement>('.site-header__brand')
    const nav = header?.querySelector<HTMLElement>('.site-header__nav')
    // A prévia do editor desenha o topo dentro de um iframe: vale a janela dele.
    const view = header?.ownerDocument.defaultView
    if (!header || !bar || !brand || !nav || !view) return

    const check = () => {
      const gap = parseFloat(view.getComputedStyle(bar).columnGap) || 0
      const width = bar.clientWidth - parseFloat(view.getComputedStyle(bar).paddingLeft) * 2
      const next = brand.scrollWidth + gap + nav.scrollWidth > width
      // As duas classes: entre 721 e 1023 px o CSS já começa com o ☰ e espera o `--full`.
      header.classList.toggle('site-header--compact', next)
      header.classList.toggle('site-header--full', !next)
      setCompact(next)
    }
    const observer = new view.ResizeObserver(check)
    for (const element of [bar, brand, nav]) observer.observe(element)
    return () => observer.disconnect()
  }, [button])

  return compact
}

/** Menu do celular: o botão abre a lista embaixo do topo; tocar num link fecha. */
export function HeaderMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const compact = useCompactHeader(button)
  // Voltou a caber: o menu aberto do ☰ fecha junto.
  const [wasCompact, setWasCompact] = useState(compact)
  if (wasCompact !== compact) {
    setWasCompact(compact)
    if (!compact) setOpen(false)
  }

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
      >
        {children}
      </nav>
    </>
  )
}
