'use client'

import { createUsePuck } from '@puckeditor/core'
import React from 'react'

import { type EditorContextValue, useEditor } from './context'

const usePuck = createUsePuck()

/** O começo de um texto, para diferenciar itens de mesmo nome. */
export function snippet(text: string | undefined, max = 32): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

type Props = {
  /** Campo da lista na seção ("items"), para comparar com os outros itens. */
  field: string
  /** Propriedade que dá nome ao item ("name", "title", "label"). */
  nameKey: string
  item: Record<string, unknown>
  /** Nome quando o item ainda não tem um ("Depoimento"). */
  fallback: string
  /** Texto que diferencia itens de mesmo nome (o começo do depoimento, do destaque). */
  detail?: string
  /** Por que o item não vai aparecer no site, ou `null`. */
  problem?: (
    item: Record<string, unknown>,
    editor: EditorContextValue,
    section: Record<string, unknown> | undefined,
  ) => string | null
}

/**
 * Resumo de um item nas listas do painel (A5: PK-resumo, Testimonials-1, LinkList-1). Mostra o
 * nome; quando outro item da lista tem o mesmo nome (os dois "Nome do cliente" que vêm prontos),
 * junta o começo do texto. E avisa, no próprio item, quando ele não vai aparecer no site.
 */
export function ItemSummary({ field, nameKey, item, fallback, detail, problem }: Props) {
  const editor = useEditor()
  const section = usePuck((s) => s.selectedItem?.props) as Record<string, unknown> | undefined
  const list = usePuck((s) => s.selectedItem?.props?.[field]) as
    Record<string, unknown>[] | undefined
  const nameOf = (entry: Record<string, unknown> | undefined) =>
    String(entry?.[nameKey] ?? '').trim()
  const name = nameOf(item) || fallback
  const repeated =
    Array.isArray(list) && list.filter((entry) => (nameOf(entry) || fallback) === name).length > 1
  const extra = repeated ? snippet(detail) : ''
  const issue = problem?.(item, editor, section) ?? null

  return (
    <span className="ed-item-summary">
      <span className="ed-item-name">
        {name}
        {extra && <span className="ed-item-detail"> · {extra}</span>}
      </span>
      {issue && (
        <span className="ed-item-warn">
          <span aria-hidden="true">⚠ </span>
          {issue}
        </span>
      )}
    </span>
  )
}

/** Link da Lista de links que some do site: sem destino ou levando a uma página fora do ar. */
export function linkProblem(
  item: Record<string, unknown>,
  editor: EditorContextValue,
): string | null {
  const link = item.link as { kind: string; pageId?: number } | null | undefined
  if (!link) return 'Não aparece no site: sem destino'
  if (link.kind === 'whatsapp' && !editor.whatsappHref) {
    return 'Não aparece no site: o WhatsApp não está nas Configurações'
  }
  if (link.kind === 'page' || link.kind === 'section') {
    const page = editor.pages.find((entry) => entry.id === link.pageId)
    if (!page) return 'Não aparece no site: a página foi apagada'
    if (!page.published && page.id !== editor.pageId) {
      return 'Não aparece no site: a página está em rascunho'
    }
  }
  return null
}

/** Produto da Vitrine sem foto: o site não mostra (regra da seção). */
export function productProblem(item: Record<string, unknown>): string | null {
  return item.image ? null : 'Não aparece no site: sem foto'
}

/** Destaque sem foto com o marcador Foto: fica só com o texto (B1, achado Features-2). */
export function featureProblem(
  item: Record<string, unknown>,
  editor: EditorContextValue,
  section: Record<string, unknown> | undefined,
): string | null {
  if (section?.marker !== 'photo' && section?.marker !== 'cover') return null
  const photo = item.photo as { mediaId: number } | null | undefined
  if (photo && editor.photoById[photo.mediaId]) return null
  return section.marker === 'cover'
    ? 'Sem foto: fica a cor do site'
    : 'Sem foto: fica só com o texto'
}
