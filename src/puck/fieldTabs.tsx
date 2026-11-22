'use client'

import { FieldTab } from '@puckeditor/core'
import React from 'react'

import { type Components, SECTION_LABELS } from './config'

// Abas do painel de opções (componentes, tarefa A2): Conteúdo, Aparência e Animação. A tabela
// abaixo é a única que diz em que aba fica cada campo de cada seção; um teste confere que todo
// campo novo entrou nela. Seção com campos de uma aba só (as peças das Colunas) fica sem abas.

export type FieldTabName = 'conteudo' | 'aparencia' | 'animacao'

export const FIELD_TAB_ORDER: readonly FieldTabName[] = ['conteudo', 'aparencia', 'animacao']

export const FIELD_TAB_LABELS: Record<FieldTabName, string> = {
  conteudo: 'Conteúdo',
  aparencia: 'Aparência',
  animacao: 'Animação',
}

const C = 'conteudo' as const
const A = 'aparencia' as const
const M = 'animacao' as const

/** Aba de cada campo, seção por seção. As dicas (`*Hint`, `notice`) ficam junto do campo que explicam. */
export const FIELD_TABS: { [K in keyof Components]: Record<string, FieldTabName> } = {
  Hero: {
    title: C,
    highlight: C,
    text: C,
    button: C,
    button2: C,
    // Chamadas 2 e 3 (C1) e como elas trocam: só aparecem com mais de uma chamada.
    slides: C,
    autoplay: C,
    interval: C,
    transition: C,
    dots: C,
    // A foto do banner é o fundo: fica logo abaixo da escolha "Fundo", na mesma aba.
    style: A,
    image: A,
    align: A,
    height: A,
    anim: M,
  },
  TextImage: { title: C, text: C, button: C, image: C, menuLabel: C, side: A, style: A, anim: M },
  Features: { title: C, items: C, menuLabel: C, marker: C, steps: A, style: A, anim: M },
  Testimonials: { title: C, items: C, menuLabel: C, style: A, anim: M },
  Faq: { title: C, items: C, menuLabel: C, style: A, anim: M },
  Gallery: {
    title: C,
    images: C,
    menuLabel: C,
    layout: A,
    showCaptions: A,
    fit: A,
    captionsHint: A,
    style: A,
    anim: M,
  },
  Products: {
    title: C,
    text: C,
    items: C,
    productsHint: C,
    menuLabel: C,
    layout: A,
    badgeBelow: A,
    sort: A,
    style: A,
    anim: M,
  },
  PriceList: {
    title: C,
    text: C,
    groups: C,
    pricesHint: C,
    menuLabel: C,
    columns: A,
    leader: A,
    style: A,
    anim: M,
  },
  Announcement: { items: C, mode: A, announceHint: A, style: A },
  InstagramStrip: { title: C, images: C, instagramHint: C, menuLabel: C, style: A, anim: M },
  Stats: { title: C, items: C, statsHint: M, menuLabel: C, style: A, anim: M },
  Table: { title: C, text: C, head: C, rows: C, menuLabel: C, style: A, anim: M },
  Team: { title: C, text: C, items: C, menuLabel: C, style: A, anim: M },
  LogoStrip: { title: C, images: C, logosHint: C, menuLabel: C, look: A, style: A, anim: M },
  BeforeAfter: { title: C, text: C, items: C, menuLabel: C, layout: A, style: A, anim: M },
  Events: {
    title: C,
    text: C,
    items: C,
    menuLabel: C,
    past: C,
    countdown: C,
    style: A,
    anim: M,
  },
  CallToAction: {
    layout: C,
    stripNotice: C,
    tag: C,
    title: C,
    text: C,
    button: C,
    menuLabel: C,
    style: A,
    anim: M,
  },
  Contact: {
    title: C,
    text: C,
    notice: C,
    show: C,
    featured: C,
    map: C,
    menuLabel: C,
    style: A,
    anim: M,
  },
  LinkList: { title: C, text: C, items: C, menuLabel: C, style: A, anim: M },
  Columns: {
    pieces: C,
    column1: C,
    column2: C,
    column3: C,
    column4: C,
    menuLabel: C,
    layout: A,
    mobileOrder: A,
    align: A,
    style: A,
    anim: M,
  },
  RichText: { title: C, body: C, menuLabel: C, style: A, anim: M },
  Video: { title: C, videoId: C, caption: C, cover: C, menuLabel: C, style: A, anim: M },
  Form: { title: C, text: C, form: C, successMessage: C, menuLabel: C, style: A, anim: M },
  Privacy: { title: C, notice: C, menuLabel: C, style: A, anim: M },
  ColumnTitle: { title: C },
  ColumnText: { title: C, text: C },
  ColumnImage: { image: C, caption: C },
  ColumnButton: { button: C },
}

// "Onde aparece" (E3): em toda seção, no fim de Aparência.
for (const type of Object.keys(SECTION_LABELS) as (keyof typeof SECTION_LABELS)[]) {
  FIELD_TABS[type].devices = A
}

/** A aba de um campo. Campo fora da tabela (não deveria haver) cai em Conteúdo, nunca some. */
export const tabOf = (type: string, field: string): FieldTabName =>
  (FIELD_TABS as Record<string, Record<string, FieldTabName> | undefined>)[type]?.[field] ?? C

/**
 * `renderFields` de uma seção: separa os campos já desenhados pelo Puck nas abas da tabela, na
 * ordem em que aparecem. Com uma aba só, mostra os campos sem a fileira de abas.
 */
type FieldsProps = { fields: Partial<Record<string, React.ReactNode>> }

export const tabbedFields = (
  type: keyof Components,
): ((props: FieldsProps) => React.ReactElement) => {
  const TabbedFields = ({ fields }: FieldsProps) => {
    const groups: Record<FieldTabName, React.ReactNode[]> = {
      conteudo: [],
      aparencia: [],
      animacao: [],
    }
    for (const [name, node] of Object.entries(fields)) {
      groups[tabOf(type, name)].push(<React.Fragment key={name}>{node}</React.Fragment>)
    }
    const used = FIELD_TAB_ORDER.filter((tab) => groups[tab].length > 0)
    if (used.length < 2) return <>{Object.values(fields)}</>
    return (
      <>
        {used.map((tab) => (
          <FieldTab key={tab} label={FIELD_TAB_LABELS[tab]} value={tab}>
            {groups[tab]}
          </FieldTab>
        ))}
      </>
    )
  }
  TabbedFields.displayName = `TabbedFields(${type})`
  return TabbedFields
}
