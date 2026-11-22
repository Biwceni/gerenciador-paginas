'use client'

import React, { useId, useRef, useState } from 'react'

import type { MenuItem } from './SiteChrome'
import { SiteLink } from './SiteLink'

/**
 * Grupo do menu (M1): um botão que abre a lista dos links de dentro. Abre ao clicar ou com Enter e
 * fecha com Esc (o foco volta ao botão), ao tocar fora ou quando o foco sai do grupo. No topo do
 * computador a lista fica embaixo do botão; no menu do ☰ ela abre no lugar, empurrando o resto.
 */
export function HeaderGroup({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  const current = Boolean(item.children?.some((child) => child.current))

  return (
    <li
      className="site-header__group"
      data-open={open ? '' : undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return
        // Fecha só o grupo: o menu do ☰, se aberto, continua aberto.
        event.stopPropagation()
        setOpen(false)
        button.current?.focus()
      }}
      onPointerDown={(event) => {
        // Tocar fora fecha: o ouvinte vai na página só enquanto o grupo está aberto.
        if (open) return
        const doc = event.currentTarget.ownerDocument
        const self = event.currentTarget
        const close = (outside: PointerEvent) => {
          if (self.contains(outside.target as Node)) return
          setOpen(false)
          doc.removeEventListener('pointerdown', close)
        }
        doc.addEventListener('pointerdown', close)
      }}
    >
      <button
        aria-controls={id}
        aria-expanded={open}
        className="site-header__groupbtn"
        data-current={current ? '' : undefined}
        onClick={() => setOpen((value) => !value)}
        ref={button}
        type="button"
      >
        <span>{item.label}</span>
        <svg
          aria-hidden="true"
          fill="none"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <ul className="site-header__sub" hidden={!open} id={id}>
        {item.children?.map((child) => (
          <li key={child.id}>
            <SiteLink
              aria-current={child.current ? 'page' : undefined}
              href={child.href}
              onClick={() => setOpen(false)}
            >
              {child.label}
            </SiteLink>
          </li>
        ))}
      </ul>
    </li>
  )
}
