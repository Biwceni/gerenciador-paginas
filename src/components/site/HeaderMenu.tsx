'use client'

import React, { useState } from 'react'

/** Menu do celular: o botão abre a lista embaixo do topo; tocar num link fecha. */
export function HeaderMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        aria-controls="menu-celular"
        aria-expanded={open}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        className="site-header__burger"
        onClick={() => setOpen((value) => !value)}
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
