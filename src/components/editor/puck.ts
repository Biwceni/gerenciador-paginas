'use client'

import { createUsePuck, type useGetPuck } from '@puckeditor/core'

// O que as peças do editor dividem para falar com o Puck.

export const usePuck = createUsePuck()

export type GetPuck = ReturnType<typeof useGetPuck>

/** A área das seções da página (as colunas têm uma área para cada uma). */
export const ROOT_ZONE = 'root:default-zone'

/** Largura em que a barra de ferramentas do Puck vai para baixo: abaixo disso é celular. */
export const MOBILE_WIDTH = 638

/** Abaixo desta largura não cabem os dois painéis e a prévia: abre um painel por vez. */
export const ONE_PANEL_WIDTH = 1280
