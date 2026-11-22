'use client'

import { type Config, type CustomField, type Field, FieldLabel } from '@puckeditor/core'
import React from 'react'

import {
  AlignField,
  ArrayItemMoves,
  ContactChannelsField,
  FormField,
  HighlightField,
  CategoryField,
  IconPicker,
  RadioChoice,
  LinkField,
  MenuLabelField,
  Notice,
  OnlyWhen,
  PhotoField,
  PhotoListField,
  StripNotice,
  VideoField,
} from '@/components/editor/fields'
import { AnimField } from '@/components/editor/AnimField'
import { DevicesField } from '@/components/editor/DevicesField'
import { MapField } from '@/components/editor/MapField'
import { TableField } from '@/components/editor/TableField'
import { EventDateField, EventTimeField } from '@/components/editor/EventFields'
import { measureTrim } from '@/components/editor/logoTrim'
import { ColumnPiecesField, ColumnTag, EmptyColumn } from '@/components/editor/ColumnPieces'
import {
  featureProblem,
  ItemSummary,
  linkProblem,
  productProblem,
} from '@/components/editor/ItemSummary'
import { InlineTextMenu, TextMenu } from '@/components/editor/RichTextTools'
import { ChoiceThumb, type ChoiceThumbName } from '@/components/editor/ChoiceThumbs'
import { SitePreviewRoot } from '@/components/editor/SitePreview'
import { Tap } from '@/components/editor/Tap'
import { VisualChoiceField } from '@/components/editor/VisualChoiceField'
import { type AnimatedSection, type SectionAnimOf } from '@/lib/motion'
import { SECTION_MIN_WIDTH } from '@/lib/photoSize'
import { PRIVACY_TITLE } from '@/lib/privacy'

import {
  FeatureIcon,
  FEATURE_ICON_LABELS,
  findIcons,
  ICON_THEMES,
  type IconTheme,
} from './components/FeatureIcon'
import { Columns } from './components/sections'
import { tabbedFields } from './fieldTabs'
import type { ContentMetadata } from './references'
import { type Components, COLUMN_PIECES, renderConfig, SECTION_LABELS } from './config'
import {
  type ButtonValue,
  CONTACT_CHANNELS,
  FEATURE_ICONS,
  FEATURES_MAX,
  BEFORE_AFTER_MAX,
  EVENTS_MAX,
  LOGOS_MAX,
  TEAM_MAX,
  PRODUCT_EXTRA_PHOTOS,
  PRODUCTS_MAX,
  type FeatureMarker,
  HERO_EXTRA_SLIDES,
  HERO_INTERVALS,
  HERO_SLIDE_DEFAULTS,
  type GalleryImage,
  INSTAGRAM_MAX_PHOTOS,
  type LinkRef,
  type PhotoRef,
  type SectionDevices,
} from './schema'

// Configuração do editor: a mesma de desenhar (`renderConfig`), mais os campos que o leigo mexe e
// o conteúdo inicial de cada seção (ficha das seções). Textos se editam na própria página
// (`contentEditable`); o painel da direita fica só com as escolhas.

// Campos próprios (`custom`) não ganham título sozinhos no Puck: o `FieldLabel` coloca.

const text = (label: string): Field => ({ type: 'text', label, contentEditable: true })
const textarea = (label: string): Field => ({ type: 'textarea', label, contentEditable: true })

const menuLabel: CustomField<string> = {
  type: 'custom',
  label: 'Nome no menu (opcional)',
  render: (props) => (
    <FieldLabel el="div" label={props.field.label ?? ''}>
      <MenuLabelField {...props} />
    </FieldLabel>
  ),
}

/**
 * Uma foto da biblioteca. `minWidth`: a largura que ela precisa ter para não ficar borrada no
 * computador; `banner`, a do banner, só quando o fundo escolhido mostra a foto. Sem ele, sem aviso
 * de foto pequena, como nas fotinhas dos depoimentos.
 */
const photo = (
  label: string,
  minWidth?: number | 'banner',
  /** Proporção do espaço (largura / altura): com ela, "Preencher" ou "Foto inteira" (C2). */
  frame?: number,
): CustomField<PhotoRef> => ({
  type: 'custom',
  label,
  render: (props) => (
    <FieldLabel el="div" label={props.field.label ?? ''}>
      <PhotoField {...props} frame={frame} minWidth={minWidth} />
    </FieldLabel>
  ),
})

/**
 * Campo que só aparece quando a escolha `prop` da seção é uma de `values` (achado 11.5): fora dela
 * ele não muda nada no site, e só deixava o painel comprido.
 */
const onlyWhen = <V,>(
  custom: CustomField<V>,
  prop: string,
  values: readonly unknown[],
): CustomField<V> => ({
  ...custom,
  render: (props) => (
    <OnlyWhen prop={prop} values={values}>
      {custom.render(props)}
    </OnlyWhen>
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

/**
 * Escolha por miniatura (um desenho de cada opção), para as variações visuais das seções: a pessoa
 * vê a arrumação antes de escolher, em vez de ler o nome numa lista.
 */
/**
 * Nome do item na lista do painel, num elemento próprio: comprido, ele corta com reticências e não
 * empurra Duplicar e Remover para fora do painel (achado 4.6).
 */
const itemName = (name: string) => <span className="ed-item-name">{name}</span>

const thumbChoice = <V extends string>(
  label: string,
  options: { value: V; label: string; hint?: string; thumb: ChoiceThumbName }[],
  columns: 2 | 3 = 2,
): CustomField<V> => ({
  type: 'custom',
  label,
  render: ({ field, name, onChange, readOnly, value }) => (
    <FieldLabel el="div" label={field.label ?? ''}>
      <VisualChoiceField
        columns={columns}
        label={label}
        name={name}
        onChange={(next) => onChange(next as V)}
        options={options.map((option) => ({
          ...option,
          thumb: <ChoiceThumb name={option.thumb} />,
        }))}
        readOnly={readOnly}
        value={value ?? options[0].value}
      />
    </FieldLabel>
  ),
})

/**
 * Fundo da seção: Igual ao site, Suave ou Cor do site, cada um desenhado nas cores do site. O
 * primeiro se chamava "Claro" e confundia num site de fundo escuro.
 */
const sectionStyle = thumbChoice(
  'Fundo',
  [
    { value: 'light', label: 'Igual ao site', thumb: 'bg-light' },
    { value: 'soft', label: 'Suave', thumb: 'bg-soft' },
    { value: 'brand', label: 'Cor do site', thumb: 'bg-brand' },
  ],
  3,
)

const featureMarker = thumbChoice<FeatureMarker>('Marcador', [
  { value: 'none', label: 'Nenhum', hint: 'Só o título e o texto', thumb: 'marker-none' },
  { value: 'icon', label: 'Ícone', hint: 'Um desenho em cima de cada um', thumb: 'marker-icon' },
  { value: 'number', label: 'Números', hint: 'Passo a passo: 1, 2, 3', thumb: 'marker-number' },
  { value: 'photo', label: 'Foto', hint: 'Uma foto pequena e redonda', thumb: 'marker-photo' },
  {
    value: 'cover',
    label: 'Foto grande',
    hint: 'A foto ocupa o destaque, com o título em cima',
    thumb: 'marker-cover',
  },
])

// O Ícone e a Foto de cada Destaque só aparecem com o marcador deles (achado 4.4). A lista de
// campos não muda (`onlyWhen`): mudar a lista redesenhava o painel e fazia cliques se perderem.
const featureIcon: CustomField<(typeof FEATURE_ICONS)[number]> = {
  type: 'custom',
  label: 'Ícone',
  render: ({ field, name, onChange, readOnly, value }) => (
    <FieldLabel el="div" label={field.label ?? ''}>
      <IconPicker
        draw={(icon) => <FeatureIcon name={icon} />}
        find={(query, theme) => findIcons(query, theme as IconTheme | 'todos')}
        label="Ícone"
        name={name}
        names={FEATURE_ICON_LABELS}
        onChange={onChange}
        readOnly={readOnly}
        themes={ICON_THEMES}
        value={value}
      />
    </FieldLabel>
  ),
}

const featureItems: Field = {
  type: 'array',
  label: 'Destaques',
  min: 1,
  max: FEATURES_MAX,
  arrayFields: {
    title: text('Título'),
    text: textarea('Texto'),
    icon: onlyWhen(featureIcon, 'marker', ['icon']),
    photo: onlyWhen(photo('Foto', undefined, 1), 'marker', ['photo', 'cover']),
    // Link do item (C3): vazio, o texto do link é "Saiba mais".
    button: {
      type: 'object',
      label: 'Link (opcional)',
      objectFields: { label: text('Texto do link (vazio: “Saiba mais”)'), link },
      invite: ['+ Pôr um link (opcional)', 'Com link, o destaque todo leva para lá.'],
    } as Field,
    // Só botões: não guarda nada no item.
    move: {
      type: 'custom',
      label: 'Ordem',
      render: ({ field, name }) => (
        <FieldLabel el="div" label={field.label ?? ''}>
          <ArrayItemMoves name={name} noun="Destaque" />
        </FieldLabel>
      ),
    },
  },
  defaultItemProps: {
    title: 'Novo destaque',
    text: 'Explique em uma ou duas frases.',
    icon: 'check',
    photo: null,
  },
  getItemSummary: (item: { title?: string; text?: string }) => (
    <ItemSummary
      detail={item.text}
      fallback="Destaque"
      field="items"
      item={item}
      nameKey="title"
      problem={featureProblem}
    />
  ),
}

// Números do negócio (E10): de 1 a 4. Com um só (C4), o número fica grande, com a frase ao lado.
const statItems: Field = {
  type: 'array',
  label: 'Números (de 1 a 4)',
  min: 1,
  max: 4,
  arrayFields: {
    value: text('Número (ex.: 12, +3.000, 4,9)'),
    text: text('Frase embaixo do número'),
    move: {
      type: 'custom',
      label: 'Ordem',
      render: ({ field, name }) => (
        <FieldLabel el="div" label={field.label ?? ''}>
          <ArrayItemMoves name={name} noun="Número" />
        </FieldLabel>
      ),
    },
  },
  defaultItemProps: { value: '100', text: 'clientes atendidos' },
  getItemSummary: (item: { value?: string; text?: string }) => (
    <ItemSummary detail={item.text} fallback="Número" field="items" item={item} nameKey="value" />
  ),
}

// Equipe (C5): de 1 a 24 pessoas. Contato opcional, como o link dos Destaques.
const teamItems: Field = {
  type: 'array',
  label: `Pessoas (até ${TEAM_MAX})`,
  min: 1,
  max: TEAM_MAX,
  arrayFields: {
    photo: photo('Foto (opcional: sem ela, as iniciais)', undefined, 4 / 5),
    role: text('Cargo (aparece em cima do nome)'),
    name: text('Nome'),
    text: textarea('Frase (opcional)'),
    contact: {
      type: 'object',
      label: 'Contato (opcional)',
      objectFields: { label: text('Texto do link (vazio: “Falar comigo”)'), link },
      invite: ['+ Pôr um contato (opcional)', 'WhatsApp, e-mail, Instagram ou outro link.'],
    } as Field,
    move: {
      type: 'custom',
      label: 'Ordem',
      render: ({ field, name }) => (
        <FieldLabel el="div" label={field.label ?? ''}>
          <ArrayItemMoves label="name" name={name} noun="Pessoa" />
        </FieldLabel>
      ),
    },
  },
  defaultItemProps: { photo: null, role: 'Cargo', name: 'Nome da pessoa', text: '', contact: null },
  getItemSummary: (item: { name?: string; role?: string }) => (
    <ItemSummary detail={item.role} fallback="Pessoa" field="items" item={item} nameKey="name" />
  ),
}

// Antes e depois (C5): pares de fotos com legenda.
const beforeAfterItems: Field = {
  type: 'array',
  label: `Comparações (até ${BEFORE_AFTER_MAX})`,
  min: 1,
  max: BEFORE_AFTER_MAX,
  arrayFields: {
    before: photo('Foto de antes', SECTION_MIN_WIDTH, 4 / 3),
    after: photo('Foto de depois', SECTION_MIN_WIDTH, 4 / 3),
    caption: text('Legenda (opcional)'),
    move: {
      type: 'custom',
      label: 'Ordem',
      render: ({ field, name }) => (
        <FieldLabel el="div" label={field.label ?? ''}>
          <ArrayItemMoves label="caption" name={name} noun="Comparação" />
        </FieldLabel>
      ),
    },
  },
  defaultItemProps: { before: null, after: null, caption: '' },
  getItemSummary: (item: { caption?: string }, index?: number) => (
    <ItemSummary
      fallback={`Comparação ${(index ?? 0) + 1}`}
      field="items"
      item={item}
      nameKey="caption"
    />
  ),
}

// Agenda (B5): até 40 datas, com o calendário e o relógio do aparelho.
const eventItems: Field = {
  type: 'array',
  label: `Datas (até ${EVENTS_MAX})`,
  min: 1,
  max: EVENTS_MAX,
  arrayFields: {
    date: {
      type: 'custom',
      label: 'Dia',
      render: ({ field, onChange, readOnly, value }) => (
        <FieldLabel el="div" label={field.label ?? ''}>
          <EventDateField label="Dia" onChange={onChange} readOnly={readOnly} value={value} />
        </FieldLabel>
      ),
    } as CustomField<string>,
    time: {
      type: 'custom',
      label: 'Horário (opcional, de Brasília)',
      render: ({ field, onChange, readOnly, value }) => (
        <FieldLabel el="div" label={field.label ?? ''}>
          <EventTimeField label="Horário" onChange={onChange} readOnly={readOnly} value={value} />
        </FieldLabel>
      ),
    } as CustomField<string>,
    title: text('Título'),
    place: text('Local (opcional)'),
    text: textarea('Frase (opcional)'),
    button: {
      ...button,
      label: 'Botão (opcional)',
      invite: ['+ Pôr um botão (opcional)', 'Ingresso, inscrição, WhatsApp.'],
    } as Field,
    move: {
      type: 'custom',
      label: 'Ordem',
      render: ({ field, name }) => (
        <FieldLabel el="div" label={field.label ?? ''}>
          <ArrayItemMoves label="title" name={name} noun="Data" />
        </FieldLabel>
      ),
    },
  },
  defaultItemProps: { date: '', time: '', title: 'Nova data', place: '', text: '', button: null },
  getItemSummary: (item: { title?: string; date?: string; time?: string }) => (
    <ItemSummary
      detail={[item.date?.split('-').reverse().join('/'), item.time].filter(Boolean).join(' ')}
      fallback="Data"
      field="items"
      item={item}
      nameKey="title"
    />
  ),
}

/** Escolha em botões redondos que já vem marcada para itens e seções salvos antes da opção. */
const radioChoice = <V extends string | boolean>(
  label: string,
  options: readonly { label: string; value: V }[],
  fallback: V,
): CustomField<V | undefined> => ({
  type: 'custom',
  label,
  render: ({ field, name, onChange, readOnly, value }) => (
    <FieldLabel el="div" label={field.label ?? ''}>
      <RadioChoice
        fallback={fallback}
        label={label}
        name={name}
        onChange={(next) => onChange(next)}
        options={options}
        readOnly={readOnly}
        value={value}
      />
    </FieldLabel>
  ),
})

// Fotos a mais de um produto (B2): aparecem em "Mais detalhes", depois da foto principal.
const productPhotos: Field = {
  type: 'array',
  label: `Mais fotos (até ${PRODUCT_EXTRA_PHOTOS}, aparecem em “Mais detalhes”)`,
  max: PRODUCT_EXTRA_PHOTOS,
  arrayFields: { image: photo('Foto', SECTION_MIN_WIDTH, 4 / 3) },
  defaultItemProps: { image: null },
  getItemSummary: (_item: unknown, index?: number) => itemName(`Foto ${(index ?? 0) + 1}`),
}

// Produtos da Vitrine. Como nos Destaques, os botões Subir e Descer ficam em cada item.
const productItems: Field = {
  type: 'array',
  label: 'Produtos',
  min: 1,
  max: PRODUCTS_MAX,
  arrayFields: {
    image: photo('Foto (obrigatória para aparecer no site)', SECTION_MIN_WIDTH, 1),
    name: text('Nome'),
    text: textarea('Frase curta'),
    price: text('Preço (opcional)'),
    oldPrice: text('Preço antigo, riscado (opcional)'),
    badge: text('Selo (opcional): “-30%”, “Novo”, “Mais vendido”'),
    status: radioChoice(
      'Situação',
      [
        { label: 'Disponível', value: 'available' },
        { label: 'Esgotado', value: 'soldout' },
        { label: 'Sob consulta', value: 'consult' },
      ],
      'available',
    ),
    category: {
      type: 'custom',
      label: 'Categoria (opcional)',
      render: ({ field, name, onChange, readOnly, value }) => (
        <FieldLabel el="div" label={field.label ?? ''}>
          <CategoryField name={name} onChange={onChange} readOnly={readOnly} value={value} />
        </FieldLabel>
      ),
    } as CustomField<string>,
    details: textarea('Mais detalhes (opcional, abre numa janela no site)'),
    photos: productPhotos,
    button,
    move: {
      type: 'custom',
      label: 'Ordem',
      render: ({ field, name }) => (
        <FieldLabel el="div" label={field.label ?? ''}>
          <ArrayItemMoves label="name" name={name} noun="Produto" />
        </FieldLabel>
      ),
    },
  },
  defaultItemProps: {
    image: null,
    name: 'Nome do produto',
    text: 'Uma frase sobre ele.',
    price: '',
    button: { label: 'Pedir pelo WhatsApp', link: { kind: 'whatsapp' } },
  },
  getItemSummary: (item: { name?: string; text?: string }) => (
    <ItemSummary
      detail={item.text}
      fallback="Produto"
      field="items"
      item={item}
      nameKey="name"
      problem={productProblem}
    />
  ),
}

// Chamadas 2 e 3 do Banner (C1). A primeira é a do próprio banner (título, frase, foto e botões).
// No editor aparece só a primeira; as outras trocam no site.
const heroSlides: Field = {
  type: 'array',
  label: 'Mais chamadas (até 2, trocam no site)',
  max: HERO_EXTRA_SLIDES,
  arrayFields: {
    title: { type: 'text', label: 'Título' },
    text: { type: 'textarea', label: 'Frase' },
    image: onlyWhen(photo('Foto', 'banner'), 'style', ['image', 'side']),
    button,
    button2: { ...button, label: 'Segundo botão (opcional)' } as Field,
    move: {
      type: 'custom',
      label: 'Ordem',
      render: ({ field, name }) => (
        <FieldLabel el="div" label={field.label ?? ''}>
          <ArrayItemMoves label="title" name={name} noun="Chamada" />
        </FieldLabel>
      ),
    },
  },
  defaultItemProps: {
    title: 'Mais uma chamada',
    text: 'Uma frase curta sobre outra coisa que você oferece.',
    image: null,
    button: { label: 'Saiba mais', link: null },
    button2: { label: '', link: null },
  },
  getItemSummary: (item: { title?: string; text?: string }) => (
    <ItemSummary detail={item.text} fallback="Chamada" field="slides" item={item} nameKey="title" />
  ),
}

/** Animação da seção (redesign v3, entrega 2): no fim das opções, escolhida por miniatura. */
const animField = <K extends AnimatedSection>(section: K): CustomField<SectionAnimOf<K>> => ({
  type: 'custom',
  label: 'Animação',
  render: ({ field, name, onChange, readOnly, value }) => (
    <FieldLabel el="div" label={field.label ?? ''}>
      <AnimField
        name={name}
        onChange={(next) => onChange(next as SectionAnimOf<K>)}
        readOnly={readOnly}
        section={section}
        value={value}
      />
    </FieldLabel>
  ),
})

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
      // Não é escrito: a pessoa toca nas palavras do título (achados 11.4 e 3.4).
      highlight: {
        type: 'custom',
        label: 'Palavras em destaque (opcional)',
        render: (props) => (
          <FieldLabel el="div" label={props.field.label ?? ''}>
            <HighlightField {...props} />
          </FieldLabel>
        ),
      },
      text: textarea('Frase'),
      button,
      button2: { ...button, label: 'Segundo botão (opcional)' } as Field,
      style: thumbChoice(
        'Fundo',
        [
          { value: 'image', label: 'Foto', thumb: 'hero-image' },
          { value: 'side', label: 'Foto ao lado', thumb: 'hero-side' },
          { value: 'light', label: 'Igual ao site', thumb: 'bg-light' },
          { value: 'soft', label: 'Suave', thumb: 'bg-soft' },
          { value: 'brand', label: 'Cor do site', thumb: 'bg-brand' },
        ],
        3,
      ),
      image: onlyWhen(photo('Foto', 'banner'), 'style', ['image', 'side']),
      align: {
        type: 'custom',
        label: 'Posição do texto',
        render: (props) => (
          <FieldLabel el="div" label={props.field.label ?? ''}>
            <AlignField {...props} />
          </FieldLabel>
        ),
      },
      height: {
        type: 'radio',
        label: 'Altura',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Compacto', value: 'compact' },
        ],
      },
      slides: heroSlides,
      autoplay: {
        type: 'radio',
        label: 'Trocar sozinho',
        options: [
          { label: 'Sim', value: true },
          { label: 'Não', value: false },
        ],
        ...({ showWhen: { prop: 'slides', filled: true } } as object),
      },
      interval: {
        type: 'radio',
        label: 'Tempo de cada chamada',
        options: HERO_INTERVALS.map((value) => ({ label: `${value} s`, value })),
        ...({ showWhen: { prop: 'slides', filled: true } } as object),
      },
      transition: {
        type: 'radio',
        label: 'Jeito de trocar',
        options: [
          { label: 'Esmaecer', value: 'fade' },
          { label: 'Deslizar', value: 'slide' },
        ],
        ...({ showWhen: { prop: 'slides', filled: true } } as object),
      },
      dots: {
        type: 'radio',
        label: 'Bolinhas embaixo',
        options: [
          { label: 'Mostrar', value: true },
          { label: 'Esconder', value: false },
        ],
        ...({ showWhen: { prop: 'slides', filled: true } } as object),
      },
      anim: animField('Hero'),
    },
    defaultProps: {
      anim: 'site',
      title: 'Escreva aqui um título chamativo',
      text: 'Uma frase curta que explica o que você oferece.',
      button: { label: 'Fale com a gente', link: whatsapp },
      image: null,
      style: 'image',
      align: 'left',
      height: 'normal',
      highlight: '',
      ...HERO_SLIDE_DEFAULTS,
    },
    resolveData: ({ props }) => ({ props: withButton(props) }),
  },
  TextImage: {
    fields: {
      title: text('Título'),
      text: textarea('Texto'),
      button,
      image: photo('Foto', SECTION_MIN_WIDTH, 4 / 3),
      side: thumbChoice('Lado da foto', [
        { value: 'left', label: 'Esquerda', thumb: 'side-left' },
        { value: 'right', label: 'Direita', thumb: 'side-right' },
      ]),
      style: sectionStyle,
      menuLabel,
      anim: animField('TextImage'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Conte um pouco mais',
      text: 'Use este espaço para explicar com calma.',
      button: null,
      image: null,
      side: 'right',
      style: 'light',
    },
  },
  Features: {
    fields: {
      title: text('Título'),
      marker: featureMarker,
      steps: onlyWhen(
        thumbChoice<'grid' | 'line'>('Arrumação dos passos', [
          { value: 'grid', label: 'Grade', hint: 'Lado a lado, em linhas', thumb: 'steps-grid' },
          {
            value: 'line',
            label: 'Linha de passos',
            hint: 'Os números ligados por uma linha',
            thumb: 'steps-line',
          },
        ]),
        'marker',
        ['number'],
      ),
      items: featureItems,
      style: sectionStyle,
      menuLabel,
      anim: animField('Features'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Por que escolher a gente',
      marker: 'none',
      steps: 'grid',
      items: ['Primeiro', 'Segundo', 'Terceiro'].map((name) => ({
        title: `${name} destaque`,
        text: 'Explique em uma ou duas frases.',
        icon: 'check' as const,
        photo: null,
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
        arrayFields: {
          quote: textarea('O que o cliente disse'),
          name: text('Nome'),
          photo: photo('Foto do cliente (opcional)'),
        },
        defaultItemProps: {
          quote: 'Escreva aqui o que o cliente disse.',
          name: 'Nome do cliente',
          photo: null,
        },
        getItemSummary: (item) => (
          <ItemSummary
            detail={item.quote}
            fallback="Depoimento"
            field="items"
            item={item}
            nameKey="name"
          />
        ),
      },
      style: sectionStyle,
      menuLabel,
      anim: animField('Testimonials'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'O que dizem nossos clientes',
      items: [
        {
          quote: 'Atendimento excelente do começo ao fim. Recomendo para todo mundo.',
          name: 'Nome do cliente',
          photo: null,
        },
        {
          quote: 'Fui muito bem recebido desde o primeiro contato. Voltarei com certeza.',
          name: 'Nome do cliente',
          photo: null,
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
        getItemSummary: (item) => (
          <ItemSummary
            detail={item.answer}
            fallback="Pergunta"
            field="items"
            item={item}
            nameKey="question"
          />
        ),
      },
      style: sectionStyle,
      menuLabel,
      anim: animField('Faq'),
    },
    defaultProps: {
      anim: 'site',
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
            <PhotoListField {...props} captions minWidth={SECTION_MIN_WIDTH} />
          </FieldLabel>
        ),
      },
      layout: thumbChoice('Arrumação', [
        {
          value: 'grid',
          label: 'Grade igual',
          hint: 'Todas as fotos do mesmo tamanho',
          thumb: 'gallery-grid',
        },
        {
          value: 'masonry',
          label: 'Mosaico',
          hint: 'A primeira foto grande e as outras em volta (a partir de 3 fotos)',
          thumb: 'gallery-masonry',
        },
      ]),
      // Sem fotos, a escolha não muda nada: só aparece com a primeira foto (achado 11.6).
      showCaptions: {
        type: 'radio',
        label: 'Legendas embaixo das fotos',
        options: [
          { label: 'Esconder', value: false },
          { label: 'Mostrar', value: true },
        ],
        ...({ showWhen: { prop: 'images', filled: true } } as object),
      },
      // C2: fotos inteiras (sem cortar no quadrado), com o fundo neutro nas sobras.
      fit: {
        type: 'radio',
        label: 'Como as fotos ocupam o espaço',
        options: [
          { label: 'Preencher', value: 'cover' },
          { label: 'Foto inteira', value: 'contain' },
        ],
        ...({ showWhen: { prop: 'images', filled: true } } as object),
      },
      ...({
        captionsHint: {
          type: 'custom',
          render: () => (
            <OnlyWhen filled prop="images">
              <Notice>
                Sem legenda escrita, vale a descrição da foto. Na tela cheia, a legenda aparece
                sempre.
              </Notice>
            </OnlyWhen>
          ),
        },
      } as object),
      style: sectionStyle,
      menuLabel,
      anim: animField('Gallery'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Nosso dia a dia',
      images: [],
      layout: 'grid',
      showCaptions: false,
      fit: 'cover',
      style: 'light',
    },
    // A primeira legenda escrita liga "Legendas embaixo das fotos" sozinha (A5, achado ODO7): antes
    // ela ficava escondida no site até a pessoa achar a outra opção. Desligar depois continua valendo.
    resolveData: ({ props }, { changed, lastData }) => {
      const captioned = (images: GalleryImage[] | undefined) =>
        Boolean(images?.some((image) => image.caption?.trim()))
      const first = changed.images && captioned(props.images) && !captioned(lastData?.props.images)
      return { props: first && !props.showCaptions ? { ...props, showCaptions: true } : props }
    },
  },
  Products: {
    fields: {
      title: text('Título'),
      text: textarea('Frase (opcional)'),
      layout: thumbChoice('Arrumação', [
        { value: 'three', label: '3 por linha', thumb: 'products-three' },
        { value: 'two', label: '2 grandes', thumb: 'products-two' },
        { value: 'list', label: 'Lista com foto', thumb: 'products-list' },
      ]),
      items: productItems,
      ...({
        productsHint: notice(
          'O preço é texto livre: “R$ 45”, “a partir de R$ 120” ou “sob consulta”. O botão “Pedir pelo WhatsApp” já abre a conversa com o nome do produto. Produto sem foto não aparece no site. Com 12 ou mais produtos, o site mostra uma busca.',
        ),
      } as object),
      badgeBelow: radioChoice(
        'Onde fica o selo',
        [
          { label: 'Em cima da foto', value: false },
          { label: 'Embaixo da foto', value: true },
        ],
        false,
      ),
      sort: radioChoice(
        'Ordem no site',
        [
          { label: 'A da lista', value: 'manual' },
          { label: 'Por nome', value: 'name' },
          { label: 'Por preço', value: 'price' },
          { label: 'Mais novos primeiro', value: 'newest' },
        ],
        'manual',
      ),
      style: sectionStyle,
      menuLabel,
      anim: animField('Products'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Nossos produtos',
      text: '',
      layout: 'three',
      items: [1, 2, 3].map(() => ({
        image: null,
        name: 'Nome do produto',
        text: 'Uma frase sobre ele.',
        // Vazio: um "R$ 0,00" esquecido mostraria o produto de graça no site.
        price: '',
        button: { label: 'Pedir pelo WhatsApp', link: whatsapp },
      })),
      style: 'light',
    },
    resolveData: ({ props }) => ({
      // Botão vazio vira objeto, para o campo de texto do botão aparecer (o formato aceita `null`).
      props: {
        ...props,
        items: props.items.map((item) =>
          item.button ? item : { ...item, button: { label: '', link: null } },
        ),
      },
    }),
  },
  PriceList: {
    fields: {
      title: text('Título'),
      text: textarea('Frase (opcional)'),
      columns: thumbChoice('Colunas', [
        { value: 'two', label: 'Duas colunas', thumb: 'prices-two' },
        { value: 'one', label: 'Uma coluna', thumb: 'prices-one' },
      ]),
      leader: thumbChoice('Entre o nome e o preço', [
        { value: 'dots', label: 'Pontilhado', thumb: 'leader-dots' },
        { value: 'line', label: 'Linha', thumb: 'leader-line' },
      ]),
      groups: {
        type: 'array',
        label: 'Grupos',
        min: 1,
        max: 8,
        arrayFields: {
          name: text('Nome do grupo'),
          image: photo('Foto ao lado do grupo (opcional)'),
          items: {
            type: 'array',
            label: 'Itens',
            min: 1,
            max: 30,
            arrayFields: {
              name: text('Nome'),
              description: text('Descrição curta (opcional)'),
              price: text('Preço'),
            },
            // Preço vazio, como na Vitrine (A6, achado PriceList-3): um "R$ 0,00" esquecido ia ao ar.
            defaultItemProps: { name: 'Novo item', description: '', price: '' },
            getItemSummary: (item) => itemName(item.name || 'Item'),
          },
        },
        defaultItemProps: {
          name: 'Novo grupo',
          image: null,
          items: [{ name: 'Novo item', description: '', price: '' }],
        },
        getItemSummary: (item) => (
          <ItemSummary fallback="Grupo" field="groups" item={item} nameKey="name" />
        ),
      },
      ...({
        pricesHint: notice(
          'Escreva o preço como quiser: “R$ 12”, “R$ 45 o kg” ou “sob consulta”. Os números ficam alinhados.',
        ),
      } as object),
      style: sectionStyle,
      menuLabel,
      anim: animField('PriceList'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Preços',
      text: '',
      columns: 'two',
      leader: 'dots',
      groups: [
        {
          name: 'Nome do grupo',
          image: null,
          items: [
            { name: 'Nome do item', description: 'Descrição curta', price: '' },
            { name: 'Nome do item', description: '', price: '' },
          ],
        },
      ],
      style: 'light',
    },
  },
  Announcement: {
    fields: {
      items: {
        type: 'array',
        label: 'Frases',
        min: 1,
        max: 5,
        arrayFields: { text: text('Frase curta') },
        defaultItemProps: { text: 'Escreva o aviso aqui' },
        getItemSummary: (item) => (
          <ItemSummary fallback="Frase" field="items" item={item} nameKey="text" />
        ),
      },
      mode: thumbChoice('Movimento', [
        {
          value: 'move',
          label: 'Correndo',
          hint: 'As frases passam pela faixa',
          thumb: 'announce-move',
        },
        {
          value: 'static',
          label: 'Parada',
          hint: 'Até 2 frases no centro; com mais, uma por vez',
          thumb: 'announce-static',
        },
      ]),
      ...({
        announceHint: notice(
          'Use para promoção, temporada ou horário especial. Na prévia a faixa fica parada; no site ela se mexe e para quando a pessoa passa o mouse, encosta o dedo ou chega nela pelo teclado. Quem pediu ao celular para reduzir movimentos vê a faixa parada, com todas as frases.',
        ),
      } as object),
      style: thumbChoice(
        'Fundo',
        [
          { value: 'brand', label: 'Cor do site', thumb: 'bg-brand' },
          { value: 'second', label: 'Segunda cor', thumb: 'bg-second' },
          { value: 'soft', label: 'Suave', thumb: 'bg-soft' },
          { value: 'light', label: 'Igual ao site', thumb: 'bg-light' },
        ],
        2,
      ),
    },
    defaultProps: {
      items: [{ text: 'Escreva o aviso aqui' }, { text: 'Promoção, horário ou temporada' }],
      // Começa parada (rodada 2, F13): faixa correndo sem parar chama a atenção o tempo todo e o
      // Impeccable aponta como "marquee". Quem quiser movimento escolhe Correndo.
      mode: 'static',
      style: 'brand',
    },
  },
  Stats: {
    fields: {
      title: text('Título (opcional)'),
      items: statItems,
      ...({
        statsHint: notice(
          'No site, cada número conta do zero até o valor quando aparece na tela, uma vez só. Quem pediu menos movimento no aparelho vê o número parado. Escreva o número como quer que apareça: “+3.000”, “4,9”, “24h”.',
        ),
      } as object),
      style: sectionStyle,
      menuLabel,
      anim: animField('Stats'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: '',
      items: [
        { value: '10', text: 'anos de experiência' },
        { value: '+500', text: 'clientes atendidos' },
        { value: '4,9', text: 'de nota no Google' },
      ],
      style: 'soft',
    },
  },
  Table: {
    fields: {
      title: text('Título (opcional)'),
      text: textarea('Frase (opcional)'),
      // O nome das colunas é editado junto com as linhas, no quadro da Tabela.
      head: { type: 'custom', render: () => <></> },
      rows: {
        type: 'custom',
        label: 'Tabela',
        render: ({ field, readOnly }) => (
          <FieldLabel el="div" label={field.label ?? ''}>
            <TableField readOnly={readOnly} />
          </FieldLabel>
        ),
      },
      style: sectionStyle,
      menuLabel,
      anim: animField('Table'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Planos e valores',
      text: '',
      head: ['Plano', 'O que inclui', 'Valor'],
      rows: [
        ['Básico', 'Um atendimento por mês', 'R$ 90'],
        ['Completo', 'Dois atendimentos por mês', 'R$ 160'],
        ['Premium', 'Atendimento toda semana', 'R$ 290'],
      ],
      style: 'light',
    },
  },
  Team: {
    fields: {
      title: text('Título'),
      text: textarea('Frase (opcional)'),
      items: teamItems,
      style: sectionStyle,
      menuLabel,
      anim: animField('Team'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Nossa equipe',
      text: '',
      items: [1, 2, 3].map(() => ({
        photo: null,
        role: 'Cargo',
        name: 'Nome da pessoa',
        text: '',
        contact: null,
      })),
      style: 'light',
    },
  },
  LogoStrip: {
    fields: {
      title: text('Título (opcional)'),
      images: {
        type: 'custom',
        label: `Logos (até ${LOGOS_MAX})`,
        render: (props) => (
          <FieldLabel el="div" label={props.field.label ?? ''}>
            <PhotoListField
              {...props}
              max={LOGOS_MAX}
              noun="logo"
              prepare={async (item, picked) => {
                const trim = await measureTrim(picked)
                return trim ? { ...item, trim } : item
              }}
            />
          </FieldLabel>
        ),
      },
      ...({
        logosHint: notice(
          'A sobra em volta de cada logo (fundo branco ou transparente) é cortada sozinha, e todos ficam do mesmo tamanho. A descrição da foto vira o nome da marca para quem usa leitor de tela.',
        ),
      } as object),
      look: radioChoice(
        'Jeito dos logos',
        [
          { label: 'Coloridos', value: 'color' },
          { label: 'Em cinza (a cor volta ao passar o mouse)', value: 'gray' },
          { label: 'Em cartões brancos (para fundo escuro)', value: 'card' },
        ],
        'color',
      ),
      style: sectionStyle,
      menuLabel,
      anim: animField('LogoStrip'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Quem confia na gente',
      images: [],
      style: 'light',
    },
  },
  BeforeAfter: {
    fields: {
      title: text('Título'),
      text: textarea('Frase (opcional)'),
      items: beforeAfterItems,
      layout: radioChoice(
        'Jeito',
        [
          { label: 'Lado a lado no computador, de arrastar no celular', value: 'auto' },
          { label: 'De arrastar no computador e no celular', value: 'slider' },
        ],
        'auto',
      ),
      style: sectionStyle,
      menuLabel,
      anim: animField('BeforeAfter'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Antes e depois',
      text: '',
      items: [{ before: null, after: null, caption: '' }],
      style: 'light',
    },
  },
  Events: {
    fields: {
      title: text('Título'),
      text: textarea('Frase (opcional)'),
      items: eventItems,
      past: radioChoice(
        'Datas que já passaram',
        [
          { label: 'Saem sozinhas do site', value: 'hide' },
          { label: 'Vão para “Já aconteceu”', value: 'list' },
        ],
        'hide',
      ),
      countdown: radioChoice(
        'Contagem até a próxima data',
        [
          { label: 'Sem contagem', value: false },
          { label: 'Mostrar “Faltam 3 dias e 4 horas”', value: true },
        ],
        false,
      ),
      style: sectionStyle,
      menuLabel,
      anim: animField('Events'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Agenda',
      text: '',
      items: [{ date: '', time: '', title: 'Nova data', place: '', text: '', button: null }],
      style: 'light',
    },
  },
  InstagramStrip: {
    fields: {
      title: text('Título'),
      images: {
        type: 'custom',
        label: 'Fotos (de 4 a 8)',
        render: (props) => (
          <FieldLabel el="div" label={props.field.label ?? ''}>
            <PhotoListField {...props} max={INSTAGRAM_MAX_PHOTOS} />
          </FieldLabel>
        ),
      },
      ...({
        instagramHint: notice(
          'As fotos não atualizam sozinhas: escolha aqui as que quer mostrar e troque quando quiser. O @ e o botão “Seguir no Instagram” vêm das Configurações do site.',
        ),
      } as object),
      style: sectionStyle,
      menuLabel,
      anim: animField('InstagramStrip'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'No Instagram',
      images: [],
      style: 'light',
    },
  },
  CallToAction: {
    fields: {
      layout: thumbChoice('Jeito', [
        { value: 'block', label: 'Bloco', hint: 'Título grande no centro', thumb: 'cta-block' },
        {
          value: 'strip',
          label: 'Faixa fina',
          hint: 'Uma linha só, entre as seções (uma por página)',
          thumb: 'cta-strip',
        },
      ]),
      ...({
        stripNotice: { type: 'custom', render: () => <StripNotice /> },
      } as object),
      tag: {
        ...text('Etiqueta (opcional, ex.: Novidade)'),
        ...({ showWhen: { prop: 'layout', values: ['strip'] } } as object),
      } as Field,
      title: text('Título'),
      text: {
        ...textarea('Frase'),
        ...({ showWhen: { prop: 'layout', values: ['block'] } } as object),
      } as Field,
      button,
      style: sectionStyle,
      menuLabel,
      anim: animField('CallToAction'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Vamos conversar?',
      text: 'Chame a gente no WhatsApp.',
      button: { label: 'Chamar no WhatsApp', link: whatsapp },
      style: 'brand',
      layout: 'block',
      tag: '',
    },
    resolveData: ({ props }) => ({ props: withButton(props) }),
  },
  Units: {
    fields: {
      title: text('Título'),
      text: textarea('Frase (opcional)'),
      // Campo que não guarda nada: só o aviso de onde vêm os dados.
      ...({
        notice: notice(
          'As unidades vêm de Configurações › Contato: nome, endereço, telefones, WhatsApp, horário e feriados. Mudou lá, muda no site todo.',
        ),
      } as object),
      map: radioChoice(
        'Mapa de cada unidade',
        [
          { label: 'Botão “Ver no mapa”', value: true },
          { label: 'Sem mapa', value: false },
        ],
        true,
      ),
      style: sectionStyle,
      menuLabel,
      anim: animField('Units'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Nossas unidades',
      text: '',
      map: true,
      style: 'light',
    },
  },
  Contact: {
    fields: {
      title: text('Título'),
      text: textarea('Frase'),
      // Campo que não guarda nada: só o aviso de onde vêm os dados.
      ...({
        notice: notice(
          'WhatsApp, telefone, e-mail, endereço e horário vêm das Configurações do site e mudam no site todo. O "Ver no mapa" abre o endereço no Google Maps; com o mapa ligado, quem faz isso é o "Como chegar".',
        ),
      } as object),
      show: {
        type: 'custom',
        label: 'Mostrar nesta seção',
        render: (props) => (
          <FieldLabel el="div" label={props.field.label ?? ''}>
            <ContactChannelsField {...props} />
          </FieldLabel>
        ),
      },
      featured: {
        type: 'radio',
        label: 'Canal em destaque',
        options: [
          { label: 'WhatsApp', value: 'whatsapp' },
          { label: 'Telefone', value: 'phone' },
          { label: 'E-mail', value: 'email' },
          { label: 'Nenhum', value: 'none' },
        ],
      },
      map: {
        type: 'custom',
        label: 'Mapa',
        render: (props) => (
          <FieldLabel el="div" label={props.field.label ?? ''}>
            <MapField {...props} />
          </FieldLabel>
        ),
      },
      style: sectionStyle,
      menuLabel,
      anim: animField('Contact'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Venha nos visitar',
      text: 'Será um prazer receber você.',
      show: [...CONTACT_CHANNELS],
      featured: 'whatsapp',
      map: false,
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
        getItemSummary: (item) => (
          <ItemSummary
            fallback="Link"
            field="items"
            item={item}
            nameKey="label"
            problem={linkProblem}
          />
        ),
      },
      style: sectionStyle,
      menuLabel,
      anim: animField('LinkList'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
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
      layout: thumbChoice('Modelo', [
        { value: 'half', label: 'Duas iguais', thumb: 'cols-half' },
        { value: 'thirds', label: 'Três iguais', thumb: 'cols-thirds' },
        { value: 'wide-left', label: 'Larga e estreita', thumb: 'cols-wide-left' },
        { value: 'wide-right', label: 'Estreita e larga', thumb: 'cols-wide-right' },
        { value: 'fourths', label: 'Quatro iguais', thumb: 'cols-fourths' },
      ]),
      // No celular as colunas ficam uma embaixo da outra; a pessoa escolhe qual vem primeiro (C6).
      mobileOrder: {
        type: 'radio',
        label: 'No celular, qual coluna vem primeiro?',
        options: [
          { label: 'Coluna 1', value: 'first' },
          { label: 'A última', value: 'last' },
        ],
      },
      // Só no computador, onde ficam lado a lado (C7).
      align: {
        type: 'radio',
        label: 'Alinhar as colunas',
        options: [
          { label: 'No alto', value: 'start' },
          { label: 'No meio', value: 'center' },
          { label: 'Embaixo', value: 'end' },
        ],
      },
      // Campo que não guarda nada: as peças de cada coluna e os atalhos para pôr mais (C13).
      ...({
        pieces: {
          type: 'custom',
          label: 'Peças',
          render: () => <ColumnPiecesField />,
        },
      } as object),
      style: sectionStyle,
      menuLabel,
      column1: { type: 'slot', allow: [...COLUMN_PIECES] },
      column2: { type: 'slot', allow: [...COLUMN_PIECES] },
      column3: { type: 'slot', allow: [...COLUMN_PIECES] },
      column4: { type: 'slot', allow: [...COLUMN_PIECES] },
      anim: animField('Columns'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      layout: 'half',
      mobileOrder: 'first',
      align: 'start',
      style: 'light',
      column1: [
        {
          type: 'ColumnText',
          props: { title: 'Primeira coluna', text: 'Escreva aqui o texto desta coluna.' },
        },
      ],
      column2: [
        {
          type: 'ColumnText',
          props: { title: 'Segunda coluna', text: 'Escreva aqui o texto desta coluna.' },
        },
      ],
      column3: [
        {
          type: 'ColumnText',
          props: { title: 'Terceira coluna', text: 'Escreva aqui o texto desta coluna.' },
        },
      ],
      column4: [
        {
          type: 'ColumnText',
          props: { title: 'Quarta coluna', text: 'Escreva aqui o texto desta coluna.' },
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
        // Barra com nomes e botão de link (achados 7.1, 7.5) e cola do Word arrumada (7.4).
        renderMenu: (props) => <TextMenu {...props} />,
        renderInlineMenu: (props) => <InlineTextMenu {...props} />,
      },
      style: sectionStyle,
      menuLabel,
      anim: animField('RichText'),
    },
    defaultProps: {
      anim: 'site',
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
        label: 'Endereço do vídeo (YouTube ou Vimeo)',
        render: (props) => (
          <FieldLabel el="div" label={props.field.label ?? ''}>
            <VideoField {...props} />
          </FieldLabel>
        ),
      },
      caption: text('Legenda'),
      cover: photo('Foto de capa (opcional)', SECTION_MIN_WIDTH),
      style: sectionStyle,
      menuLabel,
      anim: animField('Video'),
    },
    defaultProps: {
      anim: 'site',
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
      anim: animField('Form'),
    },
    defaultProps: {
      anim: 'site',
      menuLabel: '',
      title: 'Fale com a gente',
      text: 'Deixe seus dados e respondemos em pouco tempo.',
      form: null,
      successMessage: 'Recebemos sua mensagem! Respondemos em breve.',
      style: 'soft',
    },
  },
  Privacy: {
    fields: {
      title: text('Título'),
      // Campo que não guarda nada: só o aviso de onde vêm os dados.
      ...({
        notice: notice(
          'O texto é um modelo pronto. O nome, o e-mail e o endereço vêm das Configurações do site e mudam sozinhos aqui.',
        ),
      } as object),
      style: sectionStyle,
      menuLabel,
      anim: animField('Privacy'),
    },
    defaultProps: { anim: 'site', menuLabel: '', title: PRIVACY_TITLE, style: 'light' },
  },
  ColumnTitle: {
    fields: { title: text('Título') },
    defaultProps: { title: 'Título' },
  },
  // Com a peça Título (C13), o Texto chega sem título; o campo continua, para quem quiser os dois.
  ColumnText: {
    fields: { title: text('Título (opcional)'), text: textarea('Texto') },
    defaultProps: { title: '', text: 'Escreva aqui o texto desta coluna.' },
  },
  ColumnImage: {
    fields: { image: photo('Foto', SECTION_MIN_WIDTH), caption: text('Legenda (opcional)') },
    defaultProps: { image: null, caption: '' },
  },
  ColumnButton: {
    fields: { button },
    defaultProps: { button: { label: 'Fale com a gente', link: whatsapp } },
    resolveData: ({ props }) => ({ props: withButton(props) }),
  },
}

/** Desenhos só do editor. Colunas: a coluna vazia vira um quadro tracejado com atalhos (C13). */
const editorRenders: {
  [K in keyof Components]?: Config<Components>['components'][K]['render']
} = {
  Columns: ({ puck, column1: A, column2: B, column3: C, column4: D, ...props }) => (
    <Columns
      {...props}
      columnTag={(n) => <ColumnTag n={n} sectionId={props.id} />}
      columns={[<A key="1" />, <B key="2" />, <C key="3" />, <D key="4" />]}
      emptyColumn={(n) => <EmptyColumn n={n} sectionId={props.id} />}
      metadata={puck.metadata as ContentMetadata}
    />
  ),
}

/** "Onde aparece" (E3), no fim de Aparência de toda seção (as peças das Colunas não têm). */
const devicesField: CustomField<SectionDevices | undefined> = {
  type: 'custom',
  label: 'Onde aparece',
  render: (props) => (
    <FieldLabel el="div" label={props.field.label ?? ''}>
      <DevicesField {...props} />
    </FieldLabel>
  ),
}

const isSection = (type: string) => type in SECTION_LABELS

const merge = <K extends keyof Components>(type: K) => ({
  ...renderConfig.components[type],
  ...sections[type],
  ...(isSection(type)
    ? {
        fields: { ...sections[type].fields, devices: devicesField },
        defaultProps: { ...sections[type].defaultProps, devices: 'all' },
      }
    : {}),
  ...(editorRenders[type] ? { render: editorRenders[type] } : {}),
  // Painel em abas: Conteúdo, Aparência e Animação (tabela única em `fieldTabs.tsx`).
  renderFields: tabbedFields(type),
})

export const editorConfig: Config<Components> = {
  // Sem campos da "página" do Puck: nome, endereço e Google ficam em "Página e Google".
  root: {
    // A prévia mostra a página inteira: topo e rodapé do site (travados) em volta das seções.
    render: ({ children }) => <SitePreviewRoot>{children}</SitePreviewRoot>,
    fields: {
      ...({
        notice: {
          type: 'custom',
          render: () => (
            <Notice>
              <Tap /> numa seção da página para ver as opções dela. Para mudar um texto,{' '}
              <Tap lower /> nele e digite. Nome, endereço e Google ficam em &ldquo;Página e
              Google&rdquo;.
            </Notice>
          ),
        },
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
