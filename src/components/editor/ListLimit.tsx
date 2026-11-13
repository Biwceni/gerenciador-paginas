'use client'

import { useGetPuck } from '@puckeditor/core'
import React, { useEffect, useRef } from 'react'

import { restoreField, showUndo } from './undoToast'

/** O nome de um item de cada lista do painel, e se ele é "o" ou "a" (para "Pergunta removida"). */
const ITEM_NAMES: Record<string, [string, 'o' | 'a']> = {
  Destaques: ['Destaque', 'o'],
  Produtos: ['Produto', 'o'],
  Depoimentos: ['Depoimento', 'o'],
  Perguntas: ['Pergunta', 'a'],
  Grupos: ['Grupo', 'o'],
  Itens: ['Item', 'o'],
  Frases: ['Frase', 'a'],
  Links: ['Link', 'o'],
}

/** O texto do botão Remover de cada item (`field-arrayitem-delete`, no `dictionary.ts`). */
const REMOVE = 'Remover'

/**
 * Listas do painel (override `fieldTypes.array`), com três ajustes à lista do Puck:
 * - no limite, o aviso de que chegou ao máximo (achado 4.5); antes o "+" só sumia;
 * - o "+" ganha nome: "+ Adicionar produto" (achados 4.7 e 11.9); antes era só "botão";
 * - remover um item mostra "Depoimento removido." com Desfazer, como a seção (achado 4.3).
 */
export function ListLimit({
  children,
  field,
  name,
  value,
}: {
  children: React.ReactNode
  field: { max?: number; label?: string }
  name: string
  value?: unknown
}) {
  const getPuck = useGetPuck()
  const box = useRef<HTMLDivElement>(null)
  const removing = useRef<{ count: number; before: unknown; section: string } | null>(null)
  const count = Array.isArray(value) ? value.length : 0
  const max = field.max
  const [noun, gender] = ITEM_NAMES[field.label ?? ''] ?? ['Item', 'o']

  // O botão de acrescentar é do Puck: o nome chega nele pelo DOM. Só o "+" da própria lista (uma
  // lista dentro de outra, como os Itens de cada Grupo, tem o dela).
  useEffect(() => {
    const add = [
      ...(box.current?.querySelectorAll<HTMLElement>('[class*="ArrayField-addButton"]') ?? []),
    ].find((button) => button.closest('.ed-list') === box.current)
    if (!add) return
    add.setAttribute('aria-label', `Adicionar ${noun.toLowerCase()}`)
    add.dataset.label = `Adicionar ${noun.toLowerCase()}`
  })

  // A remoção chega como uma lista com um item a menos, logo depois do clique em Remover.
  useEffect(() => {
    const removal = removing.current
    if (removal === null) return
    if (count === removal.count - 1) {
      showUndo(`${noun} removid${gender}.`, () =>
        restoreField(getPuck, removal.section, name, removal.before),
      )
    }
    removing.current = null
  }, [count, gender, getPuck, name, noun])

  return (
    <div
      className="ed-list"
      onClickCapture={(event) => {
        const button = (event.target as HTMLElement).closest('button')
        const own = button?.closest('.ed-list') === box.current
        if (
          own &&
          button?.closest('[class*="ArrayFieldItem-actions"]') &&
          button.title === REMOVE
        ) {
          const section = getPuck().selectedItem?.props.id
          if (typeof section === 'string') removing.current = { count, before: value, section }
        }
      }}
      ref={box}
    >
      {children}
      {max && count >= max ? (
        <p className="ed-hint" role="status">
          {count} de {max}: é o máximo desta lista. Para colocar outro, tire um.
        </p>
      ) : null}
    </div>
  )
}
