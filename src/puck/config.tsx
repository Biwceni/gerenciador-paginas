import type { Config, Fields, Slot } from '@puckeditor/core'
import React from 'react'

import {
  CallToAction,
  ColumnButton,
  ColumnImage,
  Columns,
  ColumnText,
  Contact,
  Faq,
  Features,
  Gallery,
  Hero,
  LinkList,
  RichText,
  Testimonials,
  TextImage,
  Video,
} from './components/sections'
import type { ContentMetadata } from './references'
import type {
  CallToActionProps,
  ColumnButtonProps,
  ColumnImageProps,
  ColumnsProps,
  ColumnTextProps,
  ContactProps,
  FaqProps,
  FeaturesProps,
  GalleryProps,
  HeroProps,
  LinkListProps,
  RichTextProps,
  TestimonialsProps,
  TextImageProps,
  VideoProps,
} from './schema'

type Props<P> = Omit<P, 'id'>

export type Components = {
  Hero: Props<HeroProps>
  TextImage: Props<TextImageProps>
  Features: Props<FeaturesProps>
  Testimonials: Props<TestimonialsProps>
  Faq: Props<FaqProps>
  Gallery: Props<GalleryProps>
  CallToAction: Props<CallToActionProps>
  Contact: Props<ContactProps>
  LinkList: Props<LinkListProps>
  Columns: Omit<Props<ColumnsProps>, 'column1' | 'column2' | 'column3'> & {
    column1: Slot
    column2: Slot
    column3: Slot
  }
  RichText: Props<RichTextProps>
  Video: Props<VideoProps>
  ColumnText: Props<ColumnTextProps>
  ColumnImage: Props<ColumnImageProps>
  ColumnButton: Props<ColumnButtonProps>
}

/** Nomes das seções, na ordem da lista "Adicionar bloco". */
export const SECTION_LABELS = {
  Hero: 'Banner principal',
  TextImage: 'Texto com foto',
  Features: 'Destaques',
  Testimonials: 'Depoimentos',
  Faq: 'Perguntas frequentes',
  Gallery: 'Galeria de fotos',
  CallToAction: 'Chamada para ação',
  Contact: 'Contato e endereço',
  LinkList: 'Lista de links',
  Columns: 'Colunas',
  RichText: 'Texto simples',
  Video: 'Vídeo do YouTube',
} as const

export const COLUMN_PIECES = ['ColumnText', 'ColumnImage', 'ColumnButton'] as const

export const PIECE_LABELS = {
  ColumnText: 'Título e texto',
  ColumnImage: 'Foto',
  ColumnButton: 'Botão',
} as const

const column = { type: 'slot' as const, allow: [...COLUMN_PIECES] }

// Para desenhar, o Puck só precisa saber quais campos são áreas de peças (slots).
const columnSlots: Partial<Fields<Components['Columns']>> = {
  column1: column,
  column2: column,
  column3: column,
}

const meta = (puck: { metadata: unknown }) => puck.metadata as ContentMetadata

/**
 * Seções do site, só a parte de desenhar (serve no servidor). Os campos que o leigo edita ficam na
 * configuração do editor. Os nomes aqui são os `type` de `schema.ts`.
 */
export const renderConfig: Config<Components> = {
  components: {
    Hero: {
      label: SECTION_LABELS.Hero,
      render: ({ puck, ...props }) => <Hero {...props} metadata={meta(puck)} />,
    },
    TextImage: {
      label: SECTION_LABELS.TextImage,
      render: ({ puck, ...props }) => <TextImage {...props} metadata={meta(puck)} />,
    },
    Features: {
      label: SECTION_LABELS.Features,
      render: ({ puck, ...props }) => <Features {...props} metadata={meta(puck)} />,
    },
    Testimonials: {
      label: SECTION_LABELS.Testimonials,
      render: ({ puck, ...props }) => <Testimonials {...props} metadata={meta(puck)} />,
    },
    Faq: {
      label: SECTION_LABELS.Faq,
      render: ({ puck, ...props }) => <Faq {...props} metadata={meta(puck)} />,
    },
    Gallery: {
      label: SECTION_LABELS.Gallery,
      render: ({ puck, ...props }) => <Gallery {...props} metadata={meta(puck)} />,
    },
    CallToAction: {
      label: SECTION_LABELS.CallToAction,
      render: ({ puck, ...props }) => <CallToAction {...props} metadata={meta(puck)} />,
    },
    Contact: {
      label: SECTION_LABELS.Contact,
      render: ({ puck, ...props }) => <Contact {...props} metadata={meta(puck)} />,
    },
    LinkList: {
      label: SECTION_LABELS.LinkList,
      render: ({ puck, ...props }) => <LinkList {...props} metadata={meta(puck)} />,
    },
    Columns: {
      label: SECTION_LABELS.Columns,
      fields: columnSlots as Fields<Components['Columns']>,
      render: ({ puck, column1: First, column2: Second, column3: Third, ...props }) => (
        <Columns
          {...props}
          columns={[<First key="1" />, <Second key="2" />, <Third key="3" />]}
          metadata={meta(puck)}
        />
      ),
    },
    RichText: {
      label: SECTION_LABELS.RichText,
      render: ({ puck, ...props }) => <RichText {...props} metadata={meta(puck)} />,
    },
    Video: {
      label: SECTION_LABELS.Video,
      render: ({ puck, ...props }) => <Video {...props} metadata={meta(puck)} />,
    },
    ColumnText: {
      label: PIECE_LABELS.ColumnText,
      render: ({ puck: _puck, ...props }) => <ColumnText {...props} />,
    },
    ColumnImage: {
      label: PIECE_LABELS.ColumnImage,
      render: ({ puck, ...props }) => <ColumnImage {...props} metadata={meta(puck)} />,
    },
    ColumnButton: {
      label: PIECE_LABELS.ColumnButton,
      render: ({ puck, ...props }) => <ColumnButton {...props} metadata={meta(puck)} />,
    },
  },
}
