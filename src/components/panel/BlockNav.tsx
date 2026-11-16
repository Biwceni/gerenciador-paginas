'use client'

import React, { useEffect, useRef, useState } from 'react'

import { PanelIcon } from './PanelIcon'

export type Block = {
  id: string
  label: string
  /** O que o bloco já tem, numa linha ("WhatsApp e e-mail"). */
  summary?: string
  /** O que falta, em amarelo ("Falta escolher a página"). Também vira o ponto no computador. */
  missing?: string
  /** Bloco de perigo ("Começar de novo"): fica separado, no fim da lista do celular. */
  danger?: boolean
  /** Fica fora da linha de atalhos do computador (só na lista do celular). */
  phoneOnly?: boolean
}

/**
 * Atalhos dos blocos de uma tela comprida (B8 v2). No computador, uma linha com o bloco atual
 * sublinhado e um ponto amarelo no que falta. No celular, um botão só, "Você está em · Contato ·
 * Ir para", que abre uma folha com todos os blocos, o resumo de cada um e o que falta.
 */
export function BlockNav({ blocks, label }: { blocks: Block[]; label: string }) {
  const [current, setCurrent] = useState(blocks[0]?.id)
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  // Depois de escolher um atalho, o escolhido fica marcado enquanto a tela rola até ele (com duas
  // colunas, o bloco do lado também aparece na faixa do alto).
  const chosen = useRef<string | null>(null)

  // O bloco atual sem cálculo a cada rolagem: o primeiro bloco que está na faixa do alto da tela.
  const ids = blocks.map((block) => block.id).join(' ')
  useEffect(() => {
    const order = ids.split(' ')
    const seen = new Map<string, boolean>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting)
        // O escolhido vale até a pessoa rolar a tela por conta própria.
        if (chosen.current) return
        const visible = order.find((id) => seen.get(id))
        if (visible) setCurrent(visible)
      },
      // Só a faixa logo abaixo da barra fixa conta como "aqui".
      { rootMargin: '-140px 0px -55% 0px' },
    )
    for (const id of order) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    const release = () => {
      chosen.current = null
    }
    const events = ['wheel', 'touchmove', 'keydown'] as const
    for (const name of events) window.addEventListener(name, release, { passive: true })
    return () => {
      observer.disconnect()
      for (const name of events) window.removeEventListener(name, release)
    }
  }, [ids])

  const go = (id: string) => {
    setOpen(false)
    setCurrent(id)
    chosen.current = id
    const target = document.getElementById(id)
    if (!target) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' })
    // O título do bloco recebe o foco, para o teclado e o leitor de tela continuarem dali.
    const heading = target.querySelector<HTMLElement>('h2')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }

  const index = Math.max(
    0,
    blocks.findIndex((block) => block.id === current),
  )
  const here = blocks[index]
  const rowBlocks = blocks.filter((block) => !block.phoneOnly)

  return (
    <>
      <nav aria-label={label} className="gp-toc gp-toc--row gp-blocknav__row">
        {rowBlocks.map((block) => (
          <a
            aria-current={block.id === current ? 'location' : undefined}
            href={`#${block.id}`}
            key={block.id}
            onClick={(event) => {
              event.preventDefault()
              go(block.id)
            }}
            title={block.missing}
          >
            {block.label}
            {block.missing && (
              <>
                <span aria-hidden="true" className="gp-blocknav__dot" />
                <span className="gp-sr"> (falta algo)</span>
              </>
            )}
          </a>
        ))}
      </nav>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="gp-blocknav__button"
        onClick={() => setOpen(true)}
        ref={button}
        type="button"
      >
        <span className="gp-blocknav__where">
          <span className="gp-small gp-muted">
            Você está em · {index + 1} de {blocks.length}
          </span>
          <b>{here?.label}</b>
        </span>
        <span className="gp-blocknav__go">
          Ir para
          <PanelIcon name="down" size={16} />
        </span>
      </button>
      {open && (
        <BlockSheet
          blocks={blocks}
          current={current}
          onChoose={go}
          onClose={() => {
            setOpen(false)
            requestAnimationFrame(() => button.current?.focus())
          }}
        />
      )}
    </>
  )
}

function BlockSheet({
  blocks,
  current,
  onChoose,
  onClose,
}: {
  blocks: Block[]
  current: string | undefined
  onChoose: (id: string) => void
  onClose: () => void
}) {
  const sheet = useRef<HTMLDivElement>(null)
  const dragFrom = useRef<number | null>(null)
  const [drag, setDrag] = useState(0)

  // Folha aberta: a página de trás não rola, o foco vai para ela e o Esc fecha.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    sheet.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const regular = blocks.filter((block) => !block.danger)
  const danger = blocks.filter((block) => block.danger)
  const item = (block: Block) => (
    <li key={block.id}>
      <button
        aria-current={block.id === current ? 'location' : undefined}
        className={`gp-sheet__item${block.danger ? ' gp-sheet__item--danger' : ''}`}
        onClick={() => onChoose(block.id)}
        type="button"
      >
        <span className="gp-sheet__text">
          <b>{block.label}</b>
          {block.missing ? (
            <span className="gp-sheet__missing">{block.missing}</span>
          ) : (
            block.summary && <span className="gp-small gp-muted">{block.summary}</span>
          )}
        </span>
        {block.id === current && <span className="gp-chip gp-chip--ok">Aqui</span>}
      </button>
    </li>
  )

  return (
    <div
      className="gp-sheetwrap"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        aria-labelledby="gp-sheet-title"
        aria-modal="true"
        className="gp-sheet"
        ref={sheet}
        role="dialog"
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
        tabIndex={-1}
      >
        {/* Arrastar a alça ou o título para baixo fecha a folha. */}
        <div
          className="gp-sheet__head"
          onTouchEnd={() => {
            if (drag > 80) onClose()
            dragFrom.current = null
            setDrag(0)
          }}
          onTouchMove={(event) => {
            if (dragFrom.current === null) return
            setDrag(Math.max(0, event.touches[0].clientY - dragFrom.current))
          }}
          onTouchStart={(event) => {
            dragFrom.current = event.touches[0].clientY
          }}
        >
          <span aria-hidden="true" className="gp-sheet__handle" />
          <h2 id="gp-sheet-title">Ir para</h2>
          <button className="gp-btn gp-btn--sm gp-btn--ghost" onClick={onClose} type="button">
            Fechar
          </button>
        </div>
        <ul className="gp-sheet__list">{regular.map(item)}</ul>
        {danger.length > 0 && (
          <ul className="gp-sheet__list gp-sheet__list--danger">{danger.map(item)}</ul>
        )}
      </div>
    </div>
  )
}
