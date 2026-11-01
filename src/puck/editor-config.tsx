'use client'

import { type Config, type CustomField, type Field, FieldLabel } from '@puckeditor/core'
import React from 'react'

import {
  FormField,
  LinkField,
  MenuLabelField,
  Notice,
  PhotoField,
  PhotoListField,
  VideoField,
} from '@/components/editor/fields'
import { SitePreviewRoot } from '@/components/editor/SitePreview'

import { type Components, COLUMN_PIECES, renderConfig, SECTION_LABELS } from './config'
import type { ButtonValue, LinkRef, PhotoRef } from './schema'

// Configuração do editor: a mesma de desenhar (`renderConfig`), mais os campos que o leigo mexe e
// o conteúdo inicial de cada seção (ficha das seções). Textos se editam na própria página
// (`contentEditable`); o painel da direita fica só com as escolhas.

// Campos próprios (`custom`) não ganham título sozinhos no Puck: o `FieldLabel` coloca.

const text = (label: string): Field => ({ type: 'text', label, contentEditable: true })
const textarea = (label: string): Field => ({ type: 'textarea', label, contentEditable: true })

const sectionStyle: Field = {
  type: 'radio',
  label: 'Fundo',
  options: [
    { label: 'Claro', value: 'light' },
    { label: 'Suave', value: 'soft' },
    { label: 'Cor do site', value: 'brand' },
  ],
}

const menuLabel: CustomField<string> = {
  type: 'custom',
  label: 'Nome no menu (opcional)',
  render: (props) => (
    <FieldLabel el="div" label={props.field.label ?? ''}>
      <MenuLabelField {...props} />
    </FieldLabel>
  ),
}

const photo = (label: string): CustomField<PhotoRef> => ({
  type: 'custom',
  label,
  render: (props) => (
    <FieldLabel el="div" label={props.field.label ?? ''}>
      <PhotoField {...props} />
    </FieldLabel>
  ),
})

const link: CustomField<LinkRef> = {
  type: 'custom',
  label: 'Leva para',
  render: (props) => (
    <FieldLabel el="div" label={props.field.label ?? ''}>
      <LinkField {...props} />
    </FieldLabel>
  ),
}

const button: Field = {
  type: 'object',
  label: 'Botão',
  objectFields: { label: text('Texto do botão (vazio: sem botão)'), link },
}

const notice = (message: string): CustomField<undefined> => ({
  type: 'custom',
  render: () => <Notice>{message}</Notice>,
})

const whatsapp = { kind: 'whatsapp' } as const

// Botão vazio vira objeto, para o campo de texto do botão aparecer (o formato aceita `null`).
const withButton = <P extends { button: ButtonValue | null }>(props: P): P =>
  props.button ? props : { ...props, button: { label: '', link: null } }

type Section<K extends keyof Components> = Omit<Config<Components>['components'][K], 'render'>

const sections: { [K in keyof Components]: Section<K> } = {
  Hero: {
    fields: {
      title: text('Título'),
      text: textarea('Frase'),
      button,
      style: {
        type: 'radio',
        label: 'Fundo',
        options: [
          { label: 'Foto', value: 'image' },
          { label: 'Claro', value: 'light' },
          { label: 'Suave', value: 'soft' },
          { label: 'Cor do site', value: 'brand' },
        ],
      },
      image: photo('Foto do fundo (com o fundo "Foto")'),
      align: {
        type: 'radio',
        label: 'Posição do texto',
        options: [
          { label: 'À esquerda', value: 'left' },
          { label: 'No centro', value: 'center' },
        ],
      },
    },
    defaultProps: {
      title: 'Escreva aqui um título chamativo',
      text: 'Uma frase curta que explica o que você oferece.',
      button: { label: 'Fale com a gente', link: whatsapp },
      image: null,
      style: 'image',
      align: 'left',
    },
    resolveData: ({ props }) => ({ props: withButton(props) }),
  },
  TextImage: {
    fields: {
      title: text('Título'),
      text: textarea('Texto'),
      image: photo('Foto'),
      side: {
        type: 'radio',
        label: 'Lado da foto',
        options: [
          { label: 'Esquerda', value: 'left' },
          { label: 'Direita', value: 'right' },
        ],
      },
      style: sectionStyle,
      menuLabel,
    },
    defaultProps: {
      menuLabel: '',
      title: 'Conte um pouco mais',
      text: 'Use este espaço para explicar com calma. Clique no texto para mudar.',
      image: null,
      side: 'right',
      style: 'light',
    },
  },
  Features: {
    fields: {
      title: text('Título'),
      items: {
        type: 'array',
        label: 'Destaques',
        min: 1,
        max: 6,
        arrayFields: { title: text('Título'), text: textarea('Texto') },
        defaultItemProps: { title: 'Novo destaque', text: 'Explique em uma ou duas frases.' },
        getItemSummary: (item) => item.title || 'Destaque',
      },
      style: sectionStyle,
      menuLabel,
    },
    defaultProps: {
      menuLabel: '',
      title: 'Por que escolher a gente',
      items: ['Primeiro', 'Segundo', 'Terceiro'].map((name) => ({
        title: `${name} destaque`,
        text: 'Explique em uma ou duas frases.',
      })),
      style: 'light',
    },
  },
  Testimonials: {
    fields: {
      title: text('Título'),
      items: {
        type: 'array',
        label: 'Depoimentos',
        min: 1,
        max: 8,
        arrayFields: { quote: textarea('O que o cliente disse'), name: text('Nome') },
        defaultItemProps: { quote: 'Escreva aqui o que o cliente disse.', name: 'Nome do cliente' },
        getItemSummary: (item) => item.name || 'Depoimento',
      },
      style: sectionStyle,
      menuLabel,
    },
    defaultProps: {
      menuLabel: '',
      title: 'O que dizem nossos clientes',
      items: [
        {
          quote: 'Atendimento excelente do começo ao fim. Recomendo para todo mundo.',
          name: 'Nome do cliente',
        },
        {
          quote: 'Fui muito bem recebido desde o primeiro contato. Voltarei com certeza.',
          name: 'Nome do cliente',
        },
      ],
      style: 'soft',
    },
  },
  Faq: {
    fields: {
      title: text('Título'),
      items: {
        type: 'array',
        label: 'Perguntas',
        min: 1,
        max: 12,
        arrayFields: { question: text('Pergunta'), answer: textarea('Resposta') },
        defaultItemProps: { question: 'Nova pergunta?', answer: 'Escreva a resposta aqui.' },
        getItemSummary: (item) => item.question || 'Pergunta',
      },
      style: sectionStyle,
      menuLabel,
    },
    defaultProps: {
      menuLabel: '',
      title: 'Perguntas frequentes',
      items: [
        {
          question: 'Como faço para falar com vocês?',
          answer: 'Pelo WhatsApp, no horário de atendimento.',
        },
        {
          question: 'Quais formas de pagamento vocês aceitam?',
          answer: 'Cartão de crédito e débito, Pix e dinheiro.',
        },
        { question: 'Vocês atendem aos sábados?', answer: 'Sim. Confira o horário no rodapé.' },
      ],
      style: 'light',
    },
  },
  Gallery: {
    fields: {
      title: text('Título'),
      images: {
        type: 'custom',
        label: 'Fotos da galeria',
        render: (props) => (
          <FieldLabel el="div" label={props.field.label ?? ''}>
            <PhotoListField {...props} />
          </FieldLabel>
        ),
      },
      style: sectionStyle,
      menuLabel,
    },
    defaultProps: { menuLabel: '', title: 'Nosso dia a dia', images: [], style: 'light' },
  },
  CallToAction: {
    fields: {
      title: text('Título'),
      text: textarea('Frase'),
      button,
      style: sectionStyle,
      menuLabel,
    },
    defaultProps: {
      menuLabel: '',
      title: 'Vamos conversar?',
      text: 'Chame a gente no WhatsApp.',
      button: { label: 'Chamar no WhatsApp', link: whatsapp },
      style: 'brand',
    },
    resolveData: ({ props }) => ({ props: withButton(props) }),
  },
  Contact: {
    fields: {
      title: text('Título'),
      text: textarea('Frase'),
      // Campo que não guarda nada: só o aviso de onde vêm os dados.
      ...({
        notice: notice(
          'WhatsApp, telefone, e-mail, endereço e horário vêm das Configurações do site e mudam no site todo. O botão "Ver no mapa" abre o endereço no Google Maps.',
        ),
      } as object),
      style: sectionStyle,
      menuLabel,
    },
    defaultProps: {
      menuLabel: '',
      title: 'Venha nos visitar',
      text: 'Será um prazer receber você.',
      style: 'soft',
    },
  },
  LinkList: {
    fields: {
      title: text('Título'),
      text: textarea('Frase'),
      items: {
        type: 'array',
        label: 'Links',
        min: 1,
        max: 12,
        arrayFields: { label: text('Texto do botão'), link },
        defaultItemProps: { label: 'Novo link', link: null },
        getItemSummary: (item) => item.label || 'Link',
      },
      style: sectionStyle,
    },
    defaultProps: {
      title: 'Nome do seu negócio',
      text: 'Uma frase curta sobre você.',
      items: [
        { label: 'Falar no WhatsApp', link: whatsapp },
        { label: 'Instagram', link: { kind: 'url', url: 'https://instagram.com/' } },
      ],
      style: 'soft',
    },
  },
  Columns: {
    fields: {
      layout: {
        type: 'radio',
        label: 'Modelo',
        options: [
          { label: 'Duas iguais', value: 'half' },
          { label: 'Três iguais', value: 'thirds' },
          { label: 'Larga e estreita', value: 'wide-left' },
          { label: 'Estreita e larga', value: 'wide-right' },
        ],
      },
      style: sectionStyle,
      menuLabel,
      column1: { type: 'slot', allow: [...COLUMN_PIECES] },
      column2: { type: 'slot', allow: [...COLUMN_PIECES] },
      column3: { type: 'slot', allow: [...COLUMN_PIECES] },
    },
    defaultProps: {
      menuLabel: '',
      layout: 'half',
      style: 'light',
      column1: [
        {
          type: 'ColumnText',
          props: { title: 'Primeira coluna', text: 'Clique no texto para mudar.' },
        },
      ],
      column2: [
        {
          type: 'ColumnText',
          props: { title: 'Segunda coluna', text: 'Clique no texto para mudar.' },
        },
      ],
      column3: [
        {
          type: 'ColumnText',
          props: { title: 'Terceira coluna', text: 'Clique no texto para mudar.' },
        },
      ],
    },
  },
  RichText: {
    fields: {
      title: text('Título'),
      body: {
        type: 'richtext',
        label: 'Texto',
        contentEditable: true,
        // Só o que o site aceita (a mesma lista do servidor, em `lib/richtext.ts`).
        options: {
          heading: { levels: [3] },
          blockquote: false,
          code: false,
          codeBlock: false,
          horizontalRule: false,
          textAlign: false,
        },
      },
      style: sectionStyle,
      menuLabel,
    },
    defaultProps: {
      menuLabel: '',
      title: 'Título do texto',
      body: '<p>Escreva aqui. Dá para usar <strong>negrito</strong>, <em>itálico</em>, listas e links.</p>',
      style: 'light',
    },
  },
  Video: {
    fields: {
      title: text('Título'),
      videoId: {
        type: 'custom',
        label: 'Endereço do vídeo no YouTube',
        render: (props) => (
          <FieldLabel el="div" label={props.field.label ?? ''}>
            <VideoField {...props} />
          </FieldLabel>
        ),
      },
      caption: text('Legenda'),
      cover: photo('Foto de capa (opcional)'),
      style: sectionStyle,
      menuLabel,
    },
    defaultProps: {
      menuLabel: '',
      title: 'Assista ao nosso vídeo',
      videoId: '',
      caption: '',
      cover: null,
      style: 'light',
    },
  },
  Form: {
    fields: {
      title: text('Título'),
      text: textarea('Frase'),
      form: {
        type: 'custom',
        label: 'Formulário',
        render: (props) => (
          <FieldLabel el="div" label={props.field.label ?? ''}>
            <FormField {...props} />
          </FieldLabel>
        ),
      },
      // A frase agora se escreve na tela de Formulários. A desta seção continua valendo para os
      // formulários que não têm a dele, mas sem campo aqui.
      successMessage: { type: 'custom', render: () => <></> },
      style: sectionStyle,
      menuLabel,
    },
    defaultProps: {
      menuLabel: '',
      title: 'Fale com a gente',
      text: 'Deixe seus dados e respondemos em pouco tempo.',
      form: null,
      successMessage: 'Recebemos sua mensagem! Respondemos em breve.',
      style: 'soft',
    },
  },
  ColumnText: {
    fields: { title: text('Título'), text: textarea('Texto') },
    defaultProps: { title: 'Título', text: 'Clique no texto para mudar.' },
  },
  ColumnImage: {
    fields: { image: photo('Foto'), caption: text('Legenda (opcional)') },
    defaultProps: { image: null, caption: '' },
  },
  ColumnButton: {
    fields: { button },
    defaultProps: { button: { label: 'Fale com a gente', link: whatsapp } },
    resolveData: ({ props }) => ({ props: withButton(props) }),
  },
}

const merge = <K extends keyof Components>(type: K) => ({
  ...renderConfig.components[type],
  ...sections[type],
})

export const editorConfig: Config<Components> = {
  // Sem campos da "página" do Puck: nome, endereço e Google ficam em "Página e Google".
  root: {
    // A prévia mostra a página inteira: topo e rodapé do site (travados) em volta das seções.
    render: ({ children }) => <SitePreviewRoot>{children}</SitePreviewRoot>,
    fields: {
      ...({
        notice: notice(
          'Clique numa seção da página para ver as opções dela. Para mudar um texto, clique nele e digite. Nome, endereço e Google ficam em "Página e Google".',
        ),
      } as object),
    },
  },
  categories: {
    sections: { title: 'Seções', components: Object.keys(SECTION_LABELS) as (keyof Components)[] },
    pieces: { title: 'Peças para as Colunas', components: [...COLUMN_PIECES] },
  },
  components: Object.fromEntries(
    (Object.keys(sections) as (keyof Components)[]).map((type) => [type, merge(type)]),
  ) as Config<Components>['components'],
}
