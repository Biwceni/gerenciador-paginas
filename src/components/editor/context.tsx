'use client'

import { createContext, useContext } from 'react'

import type { Media } from '@/payload-types'
import type { SiteInfo } from '@/puck/references'

/** Uma página do site, como o seletor de links precisa: nome, situação e seções com nome no menu. */
export type EditorPageSummary = {
  id: number
  title: string
  slug: string
  published: boolean
  sections: { id: string; label: string }[]
}

export type EditorContextValue = {
  apiRoute: string
  pageId: number
  homepageId: number | null
  site: SiteInfo
  whatsappHref: string | null
  photos: Media[]
  photoById: Record<number, Media>
  pages: EditorPageSummary[]
  /** Abre a biblioteca de fotos; `onPick` recebe a foto escolhida ou enviada na hora. */
  pickPhoto: (onPick: (photo: Media) => void) => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

export const EditorProvider = EditorContext.Provider

export function useEditor(): EditorContextValue {
  const value = useContext(EditorContext)
  if (!value) throw new Error('useEditor fora do editor')
  return value
}

/** Miniatura da foto (400 px) para listas e campos; a foto inteira se não houver. */
export function thumbnailURL(photo: Media): string | undefined {
  return photo.sizes?.thumbnail?.url || photo.url || undefined
}
