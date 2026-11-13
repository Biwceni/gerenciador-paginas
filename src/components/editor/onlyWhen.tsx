'use client'

import { createUsePuck } from '@puckeditor/core'
import React from 'react'

const usePuck = createUsePuck()

/**
 * Campo que só vale para algumas escolhas da seção (achados 11.5, 3.6 e 4.4): a foto do Banner com
 * o fundo "Foto" ou "Foto ao lado", o ícone e a foto de cada Destaque com o marcador certo. Fora
 * delas, o campo sai do painel (o CSS esconde a caixa dele pela marca `data-ed-off`) e o painel
 * fica mais curto. A lista de campos do Puck não muda: mudar a lista (`resolveFields`) redesenhava
 * o painel a cada escolha e fazia cliques se perderem. O valor guardado fica como está.
 */
export type ShowWhen = { prop: string; values?: readonly unknown[]; filled?: boolean }

export function OnlyWhen({
  prop,
  values,
  filled,
  children,
}: ShowWhen & { children: React.ReactNode }) {
  const current = usePuck((s) => s.selectedItem?.props[prop] as unknown)
  const shown = filled ? Array.isArray(current) && current.length > 0 : values?.includes(current)
  if (!shown) return <span data-ed-off="" hidden />
  return <>{children}</>
}
