'use client'

import { type Config, type CustomField, type Field, FieldLabel } from '@puckeditor/core'
import React from 'react'

import {
  ArrayItemMoves,
  FormField,
  HighlightField,
  IconField,
  LinkField,
  MenuLabelField,
  Notice,
  OnlyWhen,
  PhotoField,
  PhotoListField,
  VideoField,
} from '@/components/editor/fields'
import { AnimField } from '@/components/editor/AnimField'
import { InlineTextMenu, TextMenu } from '@/components/editor/RichTextTools'
import { ChoiceThumb, type ChoiceThumbName } from '@/components/editor/ChoiceThumbs'
import { SitePreviewRoot } from '@/components/editor/SitePreview'
import { VisualChoiceField } from '@/components/editor/VisualChoiceField'
import { type AnimatedSection, type SectionAnimOf } from '@/lib/motion'
import { SECTION_MIN_WIDTH } from '@/lib/photoSize'
import { PRIVACY_TITLE } from '@/lib/privacy'

import { FeatureIcon, FEATURE_ICON_LABELS } from './components/FeatureIcon'
import { type Components, COLUMN_PIECES, renderConfig, SECTION_LABELS } from './config'
import {
  type ButtonValue,
  FEATURE_ICONS,
  type FeatureMarker,
  INSTAGRAM_MAX_PHOTOS,
  type LinkRef,
  type PhotoRef,
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
const photo = (label: string, minWidth?: number | 'banner'): CustomField<PhotoRef> => ({
  type: 'custom',
  label,
  render: (props) => (
    <FieldLabel el="div" label={props.field.label ?? ''}>
      <PhotoField {...props} minWidth={minWidth} />
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
])

// O Ícone e a Foto de cada Destaque só aparecem com o marcador deles (achado 4.4). A lista de
// campos não muda (`onlyWhen`): mudar a lista redesenhava o painel e fazia cliques se perderem.
const featureIcon: CustomField<(typeof FEATURE_ICONS)[number]> = {
  type: 'custom',
  label: 'Ícone',
  render: ({ field, name, onChange, readOnly, value }) => (
    <FieldLabel el="div" label={field.label ?? ''}>
      <IconField
        label="Ícone"
        name={name}
        onChange={onChange}
        options={FEATURE_ICONS.map((icon) => ({
          value: icon,
          label: FEATURE_ICON_LABELS[icon],
          icon: <FeatureIcon name={icon} />,
        }))}
        readOnly={readOnly}
        value={value}
      />
    </FieldLabel>
  ),
}

const featureItems: Field = {
  type: 'array',
  label: 'Destaques',
  min: 1,
  max: 6,
  arrayFields: {
    title: text('Título'),
    text: textarea('Texto'),
    icon: onlyWhen(featureIcon, 'marker', ['icon']),
    photo: onlyWhen(photo('Foto'), 'marker', ['photo']),
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
  getItemSummary: (item: { title?: string }) => itemName(item.title || 'Destaque'),
}

// Produtos da Vitrine. Como nos Destaques, os botões Subir e Descer ficam em cada item.
const productItems: Field = {
  type: 'array',
  label: 'Produtos',
  min: 1,
  max: 12,
  arrayFields: {
    image: photo('Foto (obrigatória para aparecer no site)', SECTION_MIN_WIDTH),
    name: text('Nome'),
    text: textarea('Frase curta'),
    price: text('Preço (opcional)'),
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
  getItemSummary: (item: { name?: string }) => itemName(item.name || 'Produto'),
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
        type: 'radio',
        label: 'Posição do texto',
        options: [
          { label: 'À esquerda', value: 'left' },
          { label: 'No centro', value: 'center' },
        ],
      },
      height: {
        type: 'radio',
        label: 'Altura',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Compacto', value: 'compact' },
        ],
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
    },
    resolveData: ({ props }) => ({ props: withButton(props) }),
  },
  TextImage: {
    fields: {
      title: text('Título'),
      text: textarea('Texto'),
      image: photo('Foto', SECTION_MIN_WIDTH),
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
      text: 'Use este espaço para explicar com calma. Clique no texto para mudar.',
      image: null,
      side: 'right',
      style: 'light',
    },
  },
  Features: {
    fields: {
      title: text('Título'),
      marker: featureMarker,
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
        getItemSummary: (item) => itemName(item.name || 'Depoimento'),
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
        getItemSummary: (item) => itemName(item.question || 'Pergunta'),
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
          label: 'Grade',
          hint: 'Quadrados do mesmo tamanho',
          thumb: 'gallery-grid',
        },
        {
          value: 'masonry',
          label: 'Mosaico',
          hint: 'Cada foto no formato dela; a ordem vai de cima para baixo, coluna por coluna',
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
      style: 'light',
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
          'O preço é texto livre: “R$ 45”, “a partir de R$ 120” ou “sob consulta”. O botão “Pedir pelo WhatsApp” já abre a conversa com o nome do produto. Produto sem foto não aparece no site.',
        ),
      } as object),
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
            defaultItemProps: { name: 'Novo item', description: '', price: 'R$ 0,00' },
            getItemSummary: (item) => itemName(item.name || 'Item'),
          },
        },
        defaultItemProps: {
          name: 'Novo grupo',
          image: null,
          items: [{ name: 'Novo item', description: '', price: 'R$ 0,00' }],
        },
        getItemSummary: (item) => itemName(item.name || 'Grupo'),
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
            { name: 'Nome do item', description: 'Descrição curta', price: 'R$ 0,00' },
            { name: 'Nome do item', description: '', price: 'R$ 0,00' },
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
        getItemSummary: (item) => itemName(item.text || 'Frase'),
      },
      mode: thumbChoice('Movimento', [
        {
          value: 'move',
          label: 'Correndo',
          hint: 'As frases passam pela faixa',
          thumb: 'announce-move',
        },
        { value: 'static', label: 'Parada', hint: 'As frases no centro', thumb: 'announce-static' },
      ]),
      ...({
        announceHint: notice(
          'Use para promoção, temporada ou horário especial. Na prévia a faixa fica parada; no site ela corre e para quando a pessoa passa o mouse ou aperta o botão de parar. Quem pediu ao celular para reduzir movimentos vê a faixa parada.',
        ),
      } as object),
      style: thumbChoice(
        'Fundo',
        [
          { value: 'brand', label: 'Cor do site', thumb: 'bg-brand' },
          { value: 'soft', label: 'Suave', thumb: 'bg-soft' },
          { value: 'light', label: 'Igual ao site', thumb: 'bg-light' },
        ],
        3,
      ),
    },
    defaultProps: {
      items: [{ text: 'Escreva o aviso aqui' }, { text: 'Promoção, horário ou temporada' }],
      mode: 'move',
      style: 'brand',
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
      title: text('Título'),
      text: textarea('Frase'),
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
      anim: animField('Contact'),
    },
    defaultProps: {
      anim: 'site',
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
        getItemSummary: (item) => itemName(item.label || 'Link'),
      },
      style: sectionStyle,
      anim: animField('LinkList'),
    },
    defaultProps: {
      anim: 'site',
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
      ]),
      style: sectionStyle,
      menuLabel,
      column1: { type: 'slot', allow: [...COLUMN_PIECES] },
      column2: { type: 'slot', allow: [...COLUMN_PIECES] },
      column3: { type: 'slot', allow: [...COLUMN_PIECES] },
      anim: animField('Columns'),
    },
    defaultProps: {
      anim: 'site',
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
        label: 'Endereço do vídeo no YouTube',
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
  ColumnText: {
    fields: { title: text('Título'), text: textarea('Texto') },
    defaultProps: { title: 'Título', text: 'Clique no texto para mudar.' },
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
