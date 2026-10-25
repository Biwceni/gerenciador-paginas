import type { Config } from '@puckeditor/core'
import React from 'react'

import { CallToAction, Gallery, Hero, TextImage } from './components/sections'
import type { ContentMetadata } from './references'
import type { CallToActionProps, GalleryProps, HeroProps, TextImageProps } from './schema'

type Components = {
  Hero: Omit<HeroProps, 'id'>
  TextImage: Omit<TextImageProps, 'id'>
  Gallery: Omit<GalleryProps, 'id'>
  CallToAction: Omit<CallToActionProps, 'id'>
}

/**
 * Seções do site, só a parte de desenhar (serve no servidor). Os campos que o leigo edita
 * entram na fase 2, junto com o editor. Os nomes aqui são os `type` de `schema.ts`.
 */
export const renderConfig: Config<Components> = {
  components: {
    Hero: {
      label: 'Banner principal',
      render: ({ puck, ...props }) => (
        <Hero {...props} metadata={puck.metadata as ContentMetadata} />
      ),
    },
    TextImage: {
      label: 'Texto com foto',
      render: ({ puck, ...props }) => (
        <TextImage {...props} metadata={puck.metadata as ContentMetadata} />
      ),
    },
    Gallery: {
      label: 'Galeria de fotos',
      render: ({ puck, ...props }) => (
        <Gallery {...props} metadata={puck.metadata as ContentMetadata} />
      ),
    },
    CallToAction: {
      label: 'Chamada para ação',
      render: ({ puck, ...props }) => (
        <CallToAction {...props} metadata={puck.metadata as ContentMetadata} />
      ),
    },
  },
}
