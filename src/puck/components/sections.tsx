import Image from 'next/image'
import React from 'react'

import { ContactMap } from '@/components/site/ContactMap'
import { Photo } from '@/components/site/Photo'
import { SiteLink } from '@/components/site/SiteLink'
import { mapsURL, telHref, whatsAppURL } from '@/lib/links'
import {
  type Anim,
  animClass,
  type AnimatedSection,
  resolveAnim,
  splitTitleLines,
} from '@/lib/motion'
import { instagramLink } from '@/lib/links'
import { parseVideo, youtubeThumbURL } from '@/lib/youtube'
import { privacyBlocks } from '@/lib/privacy'
import { parseCount } from '@/lib/countUp'
import { splitHighlight } from '@/lib/highlight'
import { initials } from '@/lib/site'
import { parsePrice, productCategories, PRODUCTS_SEARCH_FROM } from '@/lib/products'
import { eventDateParts, eventTimeText, icsHref, renderTime, validDate } from '@/lib/events'
import { logoBox, logoRatio, trimStyle } from '@/lib/logos'

import {
  announcementRun,
  balancedSplit,
  priceGroupWeight,
  testimonialColumns,
  whatsAppMessageHref,
} from '../layout'
import { AnnounceRotate, AnnounceStrip, ANNOUNCE_STILL_MAX } from './AnnounceMotion'
import { AutoRotate } from './AutoRotate'
import { HeroLater, HeroRotate } from './HeroRotate'
import { type ProductCard, ProductDetails, ProductsBrowse } from './ProductsBrowse'
import { BeforeAfterPair } from './BeforeAfter'
import { type EventCard, EventsBrowse } from './EventsBrowse'
import { type ContentMetadata, getHref, getPhoto } from '../references'
import {
  COLUMN_COUNT,
  CONTACT_CHANNELS,
  HERO_SLIDE_DEFAULTS,
  INSTAGRAM_MIN_PHOTOS,
} from '../schema'
import type {
  ButtonValue,
  ColumnTitleProps,
  ContactChannel,
  AnnouncementProps,
  CallToActionProps,
  ColumnButtonProps,
  ColumnImageProps,
  ColumnsProps,
  ColumnTextProps,
  ContactProps,
  FaqProps,
  FeaturesProps,
  FormProps,
  GalleryProps,
  HeroProps,
  InstagramStripProps,
  StatsProps,
  TableProps,
  TeamProps,
  TeamMember,
  LogoStripProps,
  BeforeAfterProps,
  EventsProps,
  EventItem,
  LinkListProps,
  PhotoFit,
  PhotoRef,
  PriceListProps,
  PrivacyProps,
  ProductItem,
  ProductsProps,
  RichTextProps,
  TestimonialsProps,
  TextImageProps,
  VideoProps,
} from '../schema'
import { SectionButton } from './Button'
import { EditorHighlight } from './EditorHighlight'
import { GalleryGrid } from './GalleryGrid'
import { ContactIcon, type ContactIconName, FeatureIcon } from './FeatureIcon'
import { SiteForm } from './SiteForm'
import { VideoPlayer } from './VideoPlayer'

// Desenho das seções conforme o protótipo navegável. Serve no site e na prévia do editor
// (`metadata.editing`): lá, o que está vazio aparece com um aviso, para dar para clicar e preencher.

// A animação é opcional aqui: sem ela, vale "Igual ao site" (como numa página antiga).
type WithMetadata<P> = Omit<P, 'anim'> & {
  anim?: P extends { anim: infer A } ? A : never
  metadata: ContentMetadata
}

/**
 * No editor, o Puck troca os textos editáveis por um elemento (a edição no lugar); no site, são
 * texto. Por isso os textos passam por `filled` e `Paragraphs`.
 */
const filled = (text: React.ReactNode) =>
  typeof text === 'string' ? text.trim() !== '' : text != null

/**
 * Campo opcional na prévia do editor (lá o texto chega como o campo de escrever do Puck, não como
 * texto): sem o "Clique para escrever" o tempo todo (achado 6.5). No site, nada muda.
 */
const optional = (text: React.ReactNode, scope: 'item' | 'section') =>
  typeof text === 'string' ? undefined : scope

/** Parágrafos separados por linha em branco; quebra simples vira quebra de linha. */
function Paragraphs({ text }: { text: React.ReactNode }) {
  if (typeof text !== 'string') return <p className="editable-paragraphs">{text}</p>
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={index}>
        {paragraph.split('\n').map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>
            {lineIndex > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </p>
    ))
}

/** Aviso no lugar do que falta (foto, vídeo, dados de contato). Só aparece no editor. */
/** Campos novos (etapa 3a) que as páginas de antes não têm: o componente usa o valor padrão. */
type Loose<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

function EditorPlaceholder({ children }: { children: React.ReactNode }) {
  return <div className="editor-placeholder">{children}</div>
}

/**
 * Animação que a seção mostra: a dela ou, em "Igual ao site", a da Animação do site
 * (`lib/motion.ts`). Vira a classe `anim--<nome>`; o movimento em si é todo CSS (`styles.css`).
 */
function sectionAnim(
  type: AnimatedSection,
  anim: string | undefined,
  metadata: ContentMetadata,
): Anim | 'none' {
  return resolveAnim({ type, anim }, metadata.site.motion)
}

/** Posição do item, para as animações em sequência (cada item entra um pouco depois). */
const order = (index: number) => ({ '--i': index }) as React.CSSProperties

/** Caixa da seção: fundo, margens, a âncora do "Nome no menu" e a animação. */
function Section({
  id,
  metadata,
  style,
  anim = 'none',
  children,
}: {
  id: string
  metadata: ContentMetadata
  style: string
  anim?: Anim | 'none'
  children: React.ReactNode
}) {
  const classes = ['section', `section--${style}`, animClass(anim)]
  return (
    <section className={classes.filter(Boolean).join(' ')} id={metadata.anchors[id]}>
      {children}
    </section>
  )
}

/**
 * Título que sobe de dentro de uma máscara, linha por linha (Banner com "Linhas e cortina", Chamada
 * com "Título sobe"). No site, o título é dividido em linhas (`splitTitleLines`), com as palavras em
 * destaque; no editor, o título é o campo do Puck e sobe inteiro.
 */
function LinedTitle({ title, words = '' }: { title: React.ReactNode; words?: string }) {
  if (typeof title !== 'string') {
    return (
      <span className="line">
        <span className="anim-part">{title}</span>
      </span>
    )
  }
  const lines = splitTitleLines(title)
  // O destaque é procurado no título já dividido (espaços iguais aos das linhas).
  const parts = splitHighlight(lines.join(' '), words.replace(/\s+/g, ' '))
  const from = parts ? parts[0].length : -1
  const to = parts ? from + parts[1].length : -1
  // Onde cada linha começa no título (as linhas são separadas por um espaço).
  const starts = lines.map((_, index) =>
    lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0),
  )
  return (
    <>
      {lines.map((line, index) => {
        const offset = starts[index]
        const end = offset + line.length
        const a = Math.min(Math.max(from, offset), end) - offset
        const b = Math.min(Math.max(to, offset), end) - offset
        return (
          <span className="line" key={index} style={order(index)}>
            <span className="anim-part">
              {parts && b > a ? (
                <>
                  {line.slice(0, a)}
                  <em>{line.slice(a, b)}</em>
                  {line.slice(b)}
                </>
              ) : (
                line
              )}
              {/* Espaço entre as linhas, para o leitor de tela e para copiar o título. */}
              {index < lines.length - 1 && ' '}
            </span>
          </span>
        )
      })}
    </>
  )
}

function SectionTitle({ title }: { title: React.ReactNode }) {
  return filled(title) ? <h2 className="section-title anim-part">{title}</h2> : null
}

/**
 * Banner principal. No estilo "foto", a foto cobre o fundo, escurecida, com o texto em branco; em
 * "foto ao lado", o texto fica à esquerda e a foto à direita (embaixo do botão, no celular).
 */
/** Título com as palavras em destaque num `<em>` (no site; no editor o título é o campo do Puck). */
function HighlightedTitle({ title, words }: { title: React.ReactNode; words: string }) {
  const parts = typeof title === 'string' ? splitHighlight(title, words) : null
  if (!parts) return <>{title}</>
  return (
    <>
      {parts[0]}
      <em>{parts[1]}</em>
      {parts[2]}
    </>
  )
}

/** O botão aparece? (no editor, sempre que existe; no site, só com texto e destino no ar). */
function showsButton(button: ButtonValue | null, metadata: ContentMetadata) {
  if (metadata.editing) return Boolean(button)
  return Boolean(button?.label.trim() && getHref(metadata, button.link))
}

/**
 * Botões do banner: com o segundo botão (C1), os dois lado a lado, o segundo só com o contorno. Sem
 * ele, o botão de sempre, no mesmo lugar de antes.
 */
function HeroButtons({
  button,
  button2,
  metadata,
}: {
  button: ButtonValue | null
  button2: ButtonValue | null
  metadata: ContentMetadata
}) {
  if (!showsButton(button2, metadata)) {
    return <SectionButton button={button} className="anim-part" metadata={metadata} />
  }
  return (
    <div className="hero__buttons anim-part">
      <SectionButton button={button} metadata={metadata} />
      <SectionButton button={button2} className="button--ghost" metadata={metadata} />
    </div>
  )
}

type HeroCall = {
  title: React.ReactNode
  text: React.ReactNode
  photo: ReturnType<typeof getPhoto>
  fit: PhotoFit | undefined
  button: ButtonValue | null
  button2: ButtonValue | null
}

export function Hero(props: WithMetadata<Loose<HeroProps, keyof typeof HERO_SLIDE_DEFAULTS>>) {
  const { id, title, text, image, button, metadata } = props
  const button2 = props.button2 ?? null
  const highlight = props.highlight ?? ''
  const photo = getPhoto(metadata, image)
  // Banner que pede foto e ainda não tem (como os dos modelos): no editor, o aviso "Escolha uma foto
  // sua" fica no lugar dela.
  const photoSlot =
    metadata.editing && !photo && (props.style === 'image' || props.style === 'side')
  // Sem foto, o estilo "foto" vira fundo na cor principal, para o texto branco continuar legível, e
  // "foto ao lado" vira o fundo suave (no editor, continua ao lado, com o aviso).
  const style =
    props.style === 'image' && !photo
      ? 'brand'
      : props.style === 'side'
        ? photo || photoSlot
          ? 'side'
          : 'soft'
        : props.style
  // Com a foto ao lado, o texto fica num dos lados: "No centro" vale como à esquerda, e "À direita"
  // põe a foto do lado esquerdo (C1, achado Hero-1).
  const align = style === 'side' && props.align === 'center' ? 'left' : props.align
  const isMain = metadata.mainHeadingId === id
  const Heading = isMain ? 'h1' : 'h2'
  const anim = sectionAnim('Hero', props.anim, metadata)
  // Chamadas 2 e 3 (C1): só no site, e só as que têm título ou texto. No editor fica a primeira,
  // com um aviso de que as outras trocam no site.
  const calls: HeroCall[] = [
    { title, text, photo, fit: image?.fit, button, button2 },
    ...(metadata.editing ? [] : (props.slides ?? []))
      .filter((slide) => slide.title.trim() || slide.text.trim())
      .map((slide) => ({
        title: slide.title,
        text: slide.text,
        photo: getPhoto(metadata, slide.image),
        fit: slide.image?.fit,
        button: slide.button,
        button2: slide.button2,
      })),
  ]
  const multi = calls.length > 1
  const classes = [
    'section',
    style === 'side' ? 'section--soft hero--side' : `section--${style}`,
    'hero',
    align === 'center' && 'hero--center',
    align === 'right' && (style === 'side' ? 'hero--photo-left' : 'hero--right'),
    !photo && 'hero--plain',
    // Frase longa no título: tamanho menor que o de uma ou duas palavras, para não ocupar a tela.
    // No editor, o título é o elemento da edição no lugar (não é texto): não dá para medir, e
    // chamar `.trim()` nele derrubava o editor inteiro.
    calls.some((call) => typeof call.title === 'string' && call.title.trim().length > 20) &&
      'hero--long',
    props.height === 'compact' && 'hero--compact',
    multi && `hero--slides hero--${props.transition === 'slide' ? 'slide' : 'fade'}`,
    animClass(anim),
  ]

  /** Camada de uma chamada: a primeira já vem no HTML; as outras, depois que a página carrega. */
  const layer = (index: number, content: React.ReactNode, className: string) => (
    <div
      className={className}
      data-on={index === 0 ? '' : undefined}
      data-slide={index}
      key={index}
    >
      {index === 0 ? content : <HeroLater>{content}</HeroLater>}
    </div>
  )

  const titleOf = (call: HeroCall, index: number) => {
    if (!filled(call.title)) return null
    const Tag = index === 0 ? Heading : 'h2'
    return (
      <Tag className="hero__title">
        {anim === 'linhas' && index === 0 ? (
          <LinedTitle title={call.title} words={highlight} />
        ) : (
          <HighlightedTitle title={call.title} words={highlight} />
        )}
      </Tag>
    )
  }

  const sideSizes = '(max-width: 720px) 100vw, 50vw'

  return (
    <section className={classes.filter(Boolean).join(' ')}>
      {style === 'image' && photo && (
        <>
          {multi ? (
            calls.map((call, index) =>
              layer(
                index,
                call.photo ? (
                  <Photo
                    className="hero__bg anim-part"
                    fill
                    fit={call.fit === 'contain' ? 'contain' : undefined}
                    backdrop="brand"
                    media={call.photo}
                    priority={index === 0 && isMain}
                    sizes="100vw"
                  />
                ) : (
                  <span className="hero__fill" />
                ),
                'hero__layer',
              ),
            )
          ) : (
            <Photo
              className="hero__bg anim-part"
              fill
              media={photo}
              priority={isMain && !metadata.editing}
              sizes="100vw"
            />
          )}
          <div aria-hidden="true" className="hero__shade" />
        </>
      )}
      <div className="container hero__container">
        <div className={`hero__inner anim-part${multi ? ' hero__inner--slides' : ''}`}>
          {multi ? (
            calls.map((call, index) => (
              <div
                aria-hidden={index === 0 ? undefined : true}
                className="hero__copy"
                data-on={index === 0 ? '' : undefined}
                data-slide={index}
                inert={index === 0 ? undefined : true}
                key={index}
              >
                {titleOf(call, index)}
                {filled(call.text) && <p className="hero__text anim-part">{call.text}</p>}
                <HeroButtons button={call.button} button2={call.button2} metadata={metadata} />
              </div>
            ))
          ) : (
            <>
              {titleOf(calls[0], 0)}
              {metadata.editing && highlight.trim() && <EditorHighlight words={highlight} />}
              {filled(text) && <p className="hero__text anim-part">{text}</p>}
              <HeroButtons button={button} button2={button2} metadata={metadata} />
            </>
          )}
          {photoSlot && props.style === 'image' && (
            <div className="hero__slot">
              <EditorPlaceholder>
                Escolha uma foto sua para o fundo, nas opções da seção
              </EditorPlaceholder>
            </div>
          )}
          {metadata.editing && (props.slides?.length ?? 0) > 0 && (
            <div className="hero__slot">
              <EditorPlaceholder>
                Este banner tem {(props.slides?.length ?? 0) + 1} chamadas. Aqui aparece a primeira;
                as outras trocam no site.
              </EditorPlaceholder>
            </div>
          )}
        </div>
        {style === 'side' && photo && (
          <div className="hero__photo anim-part">
            {multi ? (
              calls.map((call, index) =>
                layer(
                  index,
                  <Photo
                    className="anim-part"
                    fill
                    fit={call.fit === 'contain' ? 'contain' : undefined}
                    media={call.photo ?? photo}
                    priority={index === 0 && isMain}
                    sizes={sideSizes}
                  />,
                  'hero__layer',
                ),
              )
            ) : (
              <Photo
                className="anim-part"
                fill
                media={photo}
                priority={isMain && !metadata.editing}
                sizes={sideSizes}
              />
            )}
          </div>
        )}
        {style === 'side' && photoSlot && (
          <div className="hero__photo anim-part">
            <EditorPlaceholder>Escolha uma foto sua nas opções da seção</EditorPlaceholder>
          </div>
        )}
      </div>
      {multi && (
        <HeroRotate
          autoplay={props.autoplay !== false}
          count={calls.length}
          dots={props.dots !== false}
          seconds={Number(props.interval ?? '6') || 6}
        />
      )}
    </section>
  )
}

/** Letras a partir das quais o texto do Texto com foto é longo: a foto acompanha a leitura. */
export const TEXT_IMAGE_LONG = 600

export function TextImage({
  id,
  title,
  text,
  image,
  side,
  style,
  anim,
  button = null,
  metadata,
}: WithMetadata<Loose<TextImageProps, 'button'>>) {
  const photo = getPhoto(metadata, image)
  if (!metadata.editing && !filled(title) && !filled(text) && !photo) return null
  // Sem foto no site, o texto fica no centro, na largura de leitura (e não meia tela vazia). No
  // editor continua o aviso "Escolha uma foto" no lugar dela.
  const solo = !photo && !metadata.editing
  // Só a foto (C5, achado TextImage-1): no centro e mais larga, sem meia tela vazia ao lado.
  const photoOnly =
    Boolean(photo) &&
    !metadata.editing &&
    !filled(title) &&
    !filled(text) &&
    !showsButton(button, metadata)
  // Texto longo (achado TextImage-3): a foto fica parada no topo enquanto o texto passa.
  const long = typeof text === 'string' && text.trim().length > TEXT_IMAGE_LONG
  const classes = [
    'container text-image anim-part',
    side === 'left' && 'text-image--left',
    solo && 'text-image--solo',
    photoOnly && 'text-image--photo-only',
    long && !photoOnly && 'text-image--long',
  ]

  return (
    <Section
      anim={sectionAnim('TextImage', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className={classes.filter(Boolean).join(' ')}>
        {!photoOnly && (
          <div className="text-image__text anim-part">
            {filled(title) && <h2>{title}</h2>}
            <Paragraphs text={text} />
            {/* Botão do Texto com foto (C4): na largura do texto dele, à esquerda. */}
            <SectionButton button={button} className="text-image__button" metadata={metadata} />
          </div>
        )}
        {(photo || metadata.editing) && (
          <div className="text-image__photo anim-part">
            {photo ? (
              <Photo
                backdrop={image?.backdrop}
                fill
                fit={image?.fit}
                media={photo}
                sizes={
                  photoOnly ? '(max-width: 720px) 100vw, 960px' : '(max-width: 720px) 100vw, 540px'
                }
              />
            ) : (
              <EditorPlaceholder>Escolha uma foto sua nas opções da seção</EditorPlaceholder>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}

/**
 * Arrumação dos Destaques pela quantidade: 2 ou 4 em duas colunas, 8 ou 12 em quatro, o resto em
 * três. Assim a última linha não fica com um item sozinho num canto quando dá para evitar.
 */
export function featureColumns(count: number): 2 | 3 | 4 {
  if (count === 2 || count === 4) return 2
  if (count >= 8 && count % 4 === 0) return 4
  return 3
}

/** O link de um Destaque (C3): o texto escolhido, ou "Saiba mais". */
export const featureLinkLabel = (button: ButtonValue | null | undefined) =>
  String(button?.label ?? '').trim() || 'Saiba mais'

/**
 * Destaques, até três por linha (quatro com 8 ou 12), sem caixa. Marcador: nenhum (padrão), um
 * ícone por item, números (passo a passo, e só então uma lista numerada), uma foto pequena e
 * redonda (entrega 4) ou "Foto grande" (C3), em que a foto ocupa o item e o título fica branco
 * embaixo. Cada item pode ter um link (C3): o item todo fica clicável, com "Saiba mais →".
 */
export function Features({
  id,
  title,
  items,
  marker = 'none',
  steps = 'grid',
  style,
  anim,
  metadata,
}: WithMetadata<FeaturesProps>) {
  const shown = metadata.editing
    ? items
    : items.filter(
        (item) =>
          filled(item.title) ||
          filled(item.text) ||
          (marker === 'cover' && getPhoto(metadata, item.photo ?? null)),
      )
  if (!shown.length) return null
  const cols = featureColumns(shown.length)
  const List = marker === 'number' ? 'ol' : 'ul'
  // Linha de passos (C6, L-Features): os números ligados por uma linha, um passo em cada coluna.
  // Até 6 passos: com mais, cada coluna ficaria estreita demais, e os passos voltam para a grade.
  const lined = marker === 'number' && steps === 'line' && shown.length > 1 && shown.length <= 6
  const cover = marker === 'cover'

  return (
    <Section
      anim={sectionAnim('Features', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionTitle title={title} />
        <List
          className={`features${cols === 2 ? ' features--two' : ''}${cols === 4 ? ' features--four' : ''}${lined ? ' features--steps' : ''}${cover ? ' features--cover' : ''}`}
          data-count={shown.length}
          style={lined ? ({ '--n': shown.length } as React.CSSProperties) : undefined}
        >
          {shown.map((item, index) => {
            const href = metadata.editing ? null : getHref(metadata, item.button?.link ?? null)
            const linked = Boolean(item.button && (metadata.editing || href))
            const label = featureLinkLabel(item.button)
            return (
              <li
                className={`features__item anim-part${linked ? ' features__item--linked' : ''}`}
                key={index}
                style={order(index)}
              >
                {marker === 'number' && (
                  <span aria-hidden="true" className="features__number">
                    {index + 1}
                  </span>
                )}
                {marker === 'icon' && <FeatureIcon name={item.icon ?? 'check'} />}
                {marker === 'photo' && <FeaturePhoto metadata={metadata} photo={item.photo} />}
                {cover && <FeatureCover metadata={metadata} photo={item.photo} />}
                {filled(item.title) && <h3>{item.title}</h3>}
                <Paragraphs text={item.text} />
                {linked &&
                  (href ? (
                    <SiteLink className="features__link" href={href}>
                      {label}
                      <span aria-hidden="true"> →</span>
                      {typeof item.title === 'string' && item.title.trim() && (
                        <span className="visually-hidden">: {item.title}</span>
                      )}
                    </SiteLink>
                  ) : (
                    <span className="features__link">
                      {label}
                      <span aria-hidden="true"> →</span>
                    </span>
                  ))}
              </li>
            )
          })}
        </List>
      </div>
    </Section>
  )
}

/**
 * Foto que ocupa o Destaque todo ("Foto grande", C3), com uma sombra embaixo para o título branco
 * ser lido em foto clara. Sem foto, fica a cor escura do site.
 */
function FeatureCover({ photo, metadata }: { photo?: PhotoRef; metadata: ContentMetadata }) {
  const media = getPhoto(metadata, photo ?? null)
  return (
    <span aria-hidden="true" className={`features__cover${media ? '' : ' features__cover--empty'}`}>
      {media && (
        <Photo
          alt=""
          backdrop={photo?.backdrop}
          fill
          fit={photo?.fit}
          media={media}
          sizes="(max-width: 720px) 50vw, 400px"
        />
      )}
    </span>
  )
}

/**
 * Foto pequena e redonda no lugar do ícone (marcador "Foto"). O título ao lado já diz o que é, então
 * a foto não é lida de novo pelo leitor de tela.
 */
function FeaturePhoto({ photo, metadata }: { photo?: PhotoRef; metadata: ContentMetadata }) {
  const media = getPhoto(metadata, photo ?? null)
  if (media) {
    return (
      <span className="features__photo">
        <Photo alt="" backdrop={photo?.backdrop} fill fit={photo?.fit} media={media} sizes="72px" />
      </span>
    )
  }
  return metadata.editing ? (
    <span className="features__photo features__photo--empty">Foto</span>
  ) : null
}

/** Colunas pela quantidade, numa variável do CSS (`--cols` no computador, `--cols-sm` no celular). */
const columns = (desktop: number, mobile?: number) =>
  ({ '--cols': desktop, ...(mobile ? { '--cols-sm': mobile } : {}) }) as React.CSSProperties

export function Testimonials({
  id,
  title,
  items,
  style,
  anim,
  metadata,
}: WithMetadata<TestimonialsProps>) {
  const shown = metadata.editing ? items : items.filter((item) => filled(item.quote))
  if (!shown.length) return null
  // C7: com 3 ou mais, o primeiro em destaque, grande, e os outros em duas colunas. Quando algum
  // tem foto, todos guardam a altura dela, e os nomes ficam alinhados.
  const listClass = [
    'testimonials',
    shown.length >= 3 && 'testimonials--featured',
    shown.some((item) => getPhoto(metadata, item.photo ?? null)) && 'testimonials--photos',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Section
      anim={sectionAnim('Testimonials', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionTitle title={title} />
        {/* 3 depoimentos em 3 colunas; 4 em 2 + 2; a última linha estica (nada fica sozinho). No
            celular, uma faixa que desliza e troca sozinha (A7, achado G5); no editor, parada. */}
        {metadata.editing ? (
          <ul
            className={listClass}
            data-count={shown.length}
            style={columns(testimonialColumns(shown.length))}
          >
            {shown.map((item, index) => {
              const photo = getPhoto(metadata, item.photo ?? null)
              return (
                <li className="anim-part" key={index} style={order(index)}>
                  <figure>
                    <span aria-hidden="true" className="testimonials__mark">
                      “
                    </span>
                    <blockquote>
                      <p>{item.quote}</p>
                    </blockquote>
                    {(filled(item.name) || photo) && (
                      <figcaption>
                        {photo && (
                          <span className="testimonials__photo">
                            <Photo fill media={photo} sizes="48px" />
                          </span>
                        )}
                        {item.name}
                      </figcaption>
                    )}
                  </figure>
                </li>
              )
            })}
          </ul>
        ) : (
          <AutoRotate count={shown.length} label="depoimentos">
            <ul
              className={listClass}
              data-count={shown.length}
              style={columns(testimonialColumns(shown.length))}
            >
              {shown.map((item, index) => {
                const photo = getPhoto(metadata, item.photo ?? null)
                return (
                  <li className="anim-part" key={index} style={order(index)}>
                    <figure>
                      <span aria-hidden="true" className="testimonials__mark">
                        “
                      </span>
                      <blockquote>
                        <p>{item.quote}</p>
                      </blockquote>
                      {(filled(item.name) || photo) && (
                        <figcaption>
                          {photo && (
                            <span className="testimonials__photo">
                              <Photo fill media={photo} sizes="48px" />
                            </span>
                          )}
                          {item.name}
                        </figcaption>
                      )}
                    </figure>
                  </li>
                )
              })}
            </ul>
          </AutoRotate>
        )}
      </div>
    </Section>
  )
}

/** Perguntas que abrem a resposta ao clicar (sem JavaScript: `details`). */
export function Faq({ id, title, items, style, anim, metadata }: WithMetadata<FaqProps>) {
  const shown = metadata.editing ? items : items.filter((item) => filled(item.question))
  if (!shown.length) return null

  return (
    <Section anim={sectionAnim('Faq', anim, metadata)} id={id} metadata={metadata} style={style}>
      {/* C8 (L-Faq): no computador, o título à esquerda, parado, e as perguntas à direita. */}
      <div className={`container anim-part${filled(title) ? ' faq-layout' : ''}`}>
        <SectionTitle title={title} />
        <div className="faq">
          {shown.map((item, index) => (
            // No editor as respostas ficam abertas, para dar para escrever nelas.
            <details className="faq__item" key={index} open={metadata.editing || undefined}>
              <summary>
                <span>{item.question}</span>
                <svg
                  aria-hidden="true"
                  className="faq__arrow"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="faq__answer">
                <Paragraphs text={item.answer} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </Section>
  )
}

export function Gallery({
  id,
  title,
  images,
  layout = 'grid',
  showCaptions = false,
  fit = 'cover',
  style,
  anim,
  metadata,
}: WithMetadata<Loose<GalleryProps, 'fit'>>) {
  // Fotos apagadas da biblioteca somem da galeria; sem nenhuma, a seção some. A legenda vazia usa a
  // descrição da foto.
  const photos = images.flatMap((ref) => {
    const photo = getPhoto(metadata, ref)
    return photo ? [{ photo, caption: ref.caption?.trim() || photo.alt?.trim() || '' }] : []
  })
  if (!photos.length && !metadata.editing) return null

  return (
    <Section
      anim={sectionAnim('Gallery', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionTitle title={title} />
        {photos.length ? (
          // No site, cada foto abre em tela cheia (GalleryGrid); no editor, o clique escolhe a seção.
          <GalleryGrid
            fit={fit}
            items={photos}
            layout={layout}
            showCaptions={showCaptions}
            viewer={!metadata.editing}
          />
        ) : (
          <EditorPlaceholder>
            Escolha suas fotos para a galeria, nas opções da seção
          </EditorPlaceholder>
        )}
      </div>
    </Section>
  )
}

export function CallToAction({
  id,
  title,
  text,
  button,
  layout = 'block',
  tag = '',
  style,
  anim,
  metadata,
}: WithMetadata<Loose<CallToActionProps, 'layout' | 'tag'>>) {
  const shown = sectionAnim('CallToAction', anim, metadata)
  // Toda vazia (sem título, frase e botão que leve a algum lugar), ela sumia numa faixa colorida
  // vazia (B1, achado CallToAction-1): no site, some. O Publicar avisa (hiddenSections.ts).
  // No editor o texto chega como o campo de escrever do Puck, não como texto: lá ela sempre aparece.
  if (!metadata.editing) {
    const buttonShows = Boolean(
      button && filled(button.label) && getHref(metadata, button.link) !== null,
    )
    // Na faixa fina, a frase não aparece: sem título e sem botão, ela também some.
    if (!filled(title) && (layout === 'strip' || !filled(text)) && !buttonShows) return null
  }
  // Faixa fina (C4): etiqueta curta, o título e o botão numa linha só (no celular, quebra). A frase
  // fica de fora: a faixa é um lembrete, não um bloco.
  if (layout === 'strip') {
    return (
      <Section anim={shown} id={id} metadata={metadata} style={style}>
        <div className="container cta cta--strip anim-part">
          {filled(tag) && <span className="cta__tag">{tag}</span>}
          {filled(title) && <h2 className="cta__title">{title}</h2>}
          <SectionButton button={button} className="anim-part" metadata={metadata} />
        </div>
      </Section>
    )
  }
  return (
    <Section anim={shown} id={id} metadata={metadata} style={style}>
      <div className="container cta anim-part">
        {filled(title) && <h2>{shown === 'subir' ? <LinedTitle title={title} /> : title}</h2>}
        {filled(text) && <p className="anim-part">{text}</p>}
        <SectionButton button={button} className="anim-part" metadata={metadata} />
      </div>
    </Section>
  )
}

export { mapsURL }

/** Contato e endereço: os dados vêm das configurações e mudam no site todo. */
/** O que o botão do canal em destaque diz. */
const FEATURED_ACTION: Record<string, string> = {
  whatsapp: 'Chamar no WhatsApp',
  phone: 'Ligar agora',
  email: 'Mandar um e-mail',
}

/**
 * Contato e endereço: os dados vêm das configurações e mudam no site todo. A seção escolhe quais
 * canais mostra e qual fica em destaque, num bloco na cor do site com botão (C11, L-Contact).
 */
export function Contact({
  id,
  title,
  text,
  show = [...CONTACT_CHANNELS],
  featured = 'whatsapp',
  map = false,
  style,
  anim,
  metadata,
}: WithMetadata<ContactProps>) {
  const { whatsapp, phone, email, address, hours } = metadata.site.contact
  const whatsappHref = whatsAppURL(whatsapp)
  type Item = {
    key: ContactChannel
    icon: ContactIconName
    label: string
    value: string
    href?: string
    extra?: string
  }
  const all: Item[] = []
  if (whatsapp && whatsappHref) {
    all.push({
      key: 'whatsapp',
      icon: 'whatsapp',
      label: 'WhatsApp',
      value: whatsapp,
      href: whatsappHref,
    })
  }
  if (phone) {
    all.push({
      key: 'phone',
      icon: 'phone',
      label: 'Telefone',
      value: phone,
      href: telHref(phone) ?? undefined,
    })
  }
  if (email) {
    all.push({ key: 'email', icon: 'mail', label: 'E-mail', value: email, href: `mailto:${email}` })
  }
  // O endereço abre o mapa: a linha inteira é o link.
  if (address) {
    all.push({
      key: 'address',
      icon: 'map',
      label: 'Endereço',
      value: address,
      href: mapsURL(address),
      // Com o mapa embaixo, o "Ver no mapa" fica só nele (sem repetir aqui).
      ...(map ? {} : { extra: 'Ver no mapa' }),
    })
  }
  if (hours) all.push({ key: 'hours', icon: 'clock', label: 'Horário', value: hours })
  const items = all.filter((item) => show.includes(item.key))
  // O destaque só vale para um canal mostrado e preenchido; sem ele, todos ficam em linhas.
  const highlight = items.find((item) => item.key === featured && item.href)
  const rows = items.filter((item) => item !== highlight)

  return (
    <Section
      anim={sectionAnim('Contact', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container contact anim-part">
        <div className="contact__intro">
          {filled(title) && <h2 className="section-title">{title}</h2>}
          <Paragraphs text={text} />
        </div>
        {items.length > 0 ? (
          <div className="contact__channels">
            {highlight && (
              <div className="contact__featured">
                <span className="contact__featured-label">
                  <ContactIcon name={highlight.icon} />
                  {highlight.label}
                </span>
                <span className="contact__featured-value">{highlight.value}</span>
                {metadata.editing ? (
                  <span className="button contact__featured-button">
                    {FEATURED_ACTION[highlight.key]}
                  </span>
                ) : (
                  <SiteLink className="button contact__featured-button" href={highlight.href ?? ''}>
                    {FEATURED_ACTION[highlight.key]}
                  </SiteLink>
                )}
              </div>
            )}
            {rows.length > 0 && (
              <ul className="contact__list">
                {rows.map((item) => {
                  // A linha inteira (ícone, rótulo e valor) é a área de toque, com pelo menos 44 px.
                  const body = (
                    <>
                      <ContactIcon name={item.icon} />
                      <span className="contact__text">
                        <span className="contact__label">{item.label}</span>
                        <span className="contact__value">{item.value}</span>
                        {item.extra && <span className="contact__map">{item.extra}</span>}
                      </span>
                    </>
                  )
                  return (
                    <li key={item.key}>
                      {item.href && !metadata.editing ? (
                        <SiteLink className="contact__item contact__item--link" href={item.href}>
                          {body}
                        </SiteLink>
                      ) : (
                        <div className={`contact__item${item.href ? ' contact__item--link' : ''}`}>
                          {body}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : (
          metadata.editing && (
            <EditorPlaceholder>
              {all.length
                ? 'Nenhum canal marcado em "Mostrar nesta seção".'
                : 'WhatsApp, telefone, e-mail, endereço e horário aparecem aqui quando forem preenchidos nas Configurações do site.'}
            </EditorPlaceholder>
          )
        )}
        {map && address && <ContactMap address={address} editing={metadata.editing} />}
      </div>
    </Section>
  )
}

/** Política de privacidade: o texto sai das configurações na hora de mostrar (`lib/privacy.ts`). */
export function Privacy({ id, title, style, anim, metadata }: WithMetadata<PrivacyProps>) {
  const Heading = metadata.mainHeadingId === id ? 'h1' : 'h2'
  // Os subtítulos ficam um nível abaixo do título: sem pular do h1 para o h3.
  const Sub = Heading === 'h1' ? 'h2' : 'h3'

  return (
    <Section
      anim={sectionAnim('Privacy', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container rich-text anim-part">
        {filled(title) && <Heading className="section-title">{title}</Heading>}
        <div>
          {privacyBlocks(metadata.site).map((block, index) => (
            <React.Fragment key={index}>
              {block.heading && <Sub className="rich-text__sub">{block.heading}</Sub>}
              <p>{block.text}</p>
              {block.details && block.details.length > 0 && (
                <ul>
                  {block.details.map((detail) => (
                    <li key={detail.label}>
                      {detail.label}:{' '}
                      {detail.href && !metadata.editing ? (
                        <SiteLink href={detail.href}>{detail.value}</SiteLink>
                      ) : (
                        detail.value
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </Section>
  )
}

/** Formulário: título e frase de um lado, os campos do formulário escolhido do outro. */
export function Form(props: WithMetadata<FormProps>) {
  const { id, title, text, form, successMessage, style, metadata } = props
  const definition = form ? metadata.forms[form.formId] : undefined

  return (
    <Section
      anim={sectionAnim('Form', props.anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container form-section anim-part">
        <div className="form-section__intro">
          <SectionTitle title={title} />
          <Paragraphs text={text} />
        </div>
        {definition ? (
          <SiteForm
            form={definition}
            pageId={metadata.pageId}
            preview={metadata.editing}
            privacyHref={metadata.site.privacyHref}
            successMessage={successMessage}
          />
        ) : (
          metadata.editing && (
            <EditorPlaceholder>
              Escolha qual formulário aparece aqui, no painel da direita.
            </EditorPlaceholder>
          )
        )}
      </div>
    </Section>
  )
}

/** Lista de links, como o "link na bio": logo ou iniciais, título, frase e botões grandes. */
export function LinkList({
  id,
  title,
  text,
  items,
  style,
  anim,
  metadata,
}: WithMetadata<LinkListProps>) {
  const { logo, name } = metadata.site
  const Heading = metadata.mainHeadingId === id ? 'h1' : 'h2'
  // No editor aparecem todos (o texto é editado ali mesmo); no site, só os que têm destino no ar.
  const links = items.flatMap((item) => {
    const href = metadata.editing ? '' : getHref(metadata, item.link)
    return href !== null && (metadata.editing || filled(item.label))
      ? [{ label: item.label, href }]
      : []
  })

  return (
    <Section
      anim={sectionAnim('LinkList', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container link-list anim-part">
        <span aria-hidden="true" className="link-list__avatar">
          {logo ? <Photo fill media={logo} sizes="88px" /> : initials(name)}
        </span>
        {filled(title) && <Heading className="link-list__title">{title}</Heading>}
        {filled(text) && <p>{text}</p>}
        {links.length > 0 && (
          <ul className="link-list__links">
            {links.map((link, index) => (
              <li className="anim-part" key={index} style={order(index)}>
                {metadata.editing ? (
                  <span className="link-list__button">{link.label}</span>
                ) : (
                  <SiteLink className="link-list__button" href={link.href}>
                    {link.label}
                  </SiteLink>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}

/** Colunas em modelos fixos. As peças de cada coluna chegam já desenhadas pelo Puck. */
export function Columns({
  id,
  layout,
  mobileOrder = 'first',
  align = 'start',
  style,
  anim,
  columns,
  metadata,
  emptyColumn,
  columnTag,
}: Omit<
  WithMetadata<ColumnsProps>,
  'column1' | 'column2' | 'column3' | 'column4' | 'mobileOrder' | 'align'
> &
  Partial<Pick<ColumnsProps, 'mobileOrder' | 'align'>> & {
    columns: React.ReactNode[]
    /** Só no editor: o quadro da coluna vazia, ou o "+ Peça nesta coluna" (C13, C1). */
    emptyColumn?: (n: number) => React.ReactNode
    /** Só no editor: o selo "Coluna 1" em cima de cada coluna (C1, C5). */
    columnTag?: (n: number) => React.ReactNode
  }) {
  const classes = [
    'container',
    'columns',
    `columns--${layout}`,
    mobileOrder === 'last' && 'columns--mobile-last',
    align !== 'start' && `columns--align-${align}`,
    'anim-part',
  ]
  return (
    <Section
      anim={sectionAnim('Columns', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className={classes.filter(Boolean).join(' ')}>
        {columns.slice(0, COLUMN_COUNT[layout]).map((column, index) => (
          <div className="columns__column anim-part" key={index} style={order(index)}>
            {metadata.editing && columnTag?.(index + 1)}
            {column}
            {metadata.editing && emptyColumn?.(index + 1)}
          </div>
        ))}
      </div>
    </Section>
  )
}

/** Peça Título (C13): um título sozinho na coluna. */
export function ColumnTitle({ title }: ColumnTitleProps) {
  if (!filled(title)) return null
  return <h3 className="column-title">{title}</h3>
}

export function ColumnText({ title, text }: ColumnTextProps) {
  // No editor os textos chegam como elementos editáveis, então a peça sempre aparece.
  if (!filled(title) && !filled(text)) return null
  return (
    <div className="column-text">
      {filled(title) && <h3>{title}</h3>}
      <Paragraphs text={text} />
    </div>
  )
}

export function ColumnImage({ image, caption, metadata }: WithMetadata<ColumnImageProps>) {
  const photo = getPhoto(metadata, image)
  if (!photo) {
    return metadata.editing ? (
      <EditorPlaceholder>Escolha uma foto nas opções da peça</EditorPlaceholder>
    ) : null
  }
  return (
    <figure className="column-image">
      <Photo media={photo} sizes="(max-width: 720px) 100vw, 540px" />
      {filled(caption) && (
        <figcaption data-optional={optional(caption, 'section')}>{caption}</figcaption>
      )}
    </figure>
  )
}

export function ColumnButton({ button, metadata }: WithMetadata<ColumnButtonProps>) {
  return (
    <div className="column-button">
      <SectionButton button={button} metadata={metadata} />
    </div>
  )
}

/** Texto simples. O HTML já chega limpo (lista fechada de marcações, em `schema.ts`). */
export function RichText({ id, title, body, style, anim, metadata }: WithMetadata<RichTextProps>) {
  if (!metadata.editing && !filled(title) && !filled(body)) return null
  return (
    <Section
      anim={sectionAnim('RichText', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container rich-text anim-part">
        <SectionTitle title={title} />
        {/* No editor, o Puck entrega o próprio editor de texto no lugar do HTML. */}
        {typeof body === 'string' ? (
          <div dangerouslySetInnerHTML={{ __html: body }} />
        ) : (
          <div>{body}</div>
        )}
      </div>
    </Section>
  )
}

export function Video({
  id,
  title,
  videoId,
  caption,
  cover,
  style,
  anim,
  metadata,
}: WithMetadata<VideoProps>) {
  if (!videoId && !metadata.editing) return null
  const photo = getPhoto(metadata, cover)
  const video = parseVideo(videoId)
  // Sem foto de capa, a miniatura do próprio YouTube (C15, achado Video-1), pelo nosso servidor. O
  // Vimeo não tem endereço fixo de miniatura: sem capa escolhida, fica a cor do site com o play.
  const coverPhoto = photo ? (
    <Photo fill media={photo} sizes="(max-width: 720px) 100vw, 860px" />
  ) : video?.provider === 'youtube' ? (
    <Image
      alt=""
      className="video__thumb"
      fill
      sizes="(max-width: 720px) 100vw, 860px"
      src={youtubeThumbURL(video.id)}
    />
  ) : null

  return (
    <Section anim={sectionAnim('Video', anim, metadata)} id={id} metadata={metadata} style={style}>
      <div className="container video anim-part">
        <SectionTitle title={title} />
        <figure>
          <div className="video__box anim-part">
            {metadata.editing ? (
              // No editor o vídeo não toca: aparece a capa (a escolhida, ou a do próprio YouTube, para
              // a pessoa conferir que colou o vídeo certo, achado 5.2) e um aviso.
              <>
                {coverPhoto}
                <EditorPlaceholder>
                  {videoId
                    ? 'No site, o vídeo toca quando a pessoa clica.'
                    : 'Cole o endereço do vídeo do YouTube ou do Vimeo nas opções da seção'}
                </EditorPlaceholder>
              </>
            ) : (
              <VideoPlayer cover={coverPhoto} title={title} videoId={videoId} />
            )}
          </div>
          {filled(caption) && (
            <figcaption data-optional={optional(caption, 'section')}>{caption}</figcaption>
          )}
        </figure>
      </div>
    </Section>
  )
}

// Seções novas da entrega 4 (redesign v3): para vender.

/** Título e frase de abertura da seção. Nas personalidades novas, lado a lado quando cabe. */
function SectionHead({
  title,
  text,
  aside,
  stacked,
}: {
  title: React.ReactNode
  text?: React.ReactNode
  aside?: React.ReactNode
  /** A frase fica sempre embaixo do título (o @ do Instagram, A5), nunca ao lado. */
  stacked?: boolean
}) {
  if (!filled(title) && !filled(text) && !aside) return null
  return (
    <div className={`section-head anim-part${stacked ? ' section-head--stacked' : ''}`}>
      <div className="section-head__text">
        {filled(title) && <h2 className="section-title">{title}</h2>}
        {filled(text) && (
          <p className="section-lead" data-optional={optional(text, 'section')}>
            {text}
          </p>
        )}
      </div>
      {aside}
    </div>
  )
}

/**
 * Para onde o botão do produto leva. "Pedir pelo WhatsApp" já abre a conversa com "Olá! Quero saber
 * sobre: <nome do produto>". Sem destino no ar, não há botão.
 */
function productHref(item: ProductItem, metadata: ContentMetadata): string | null {
  const link = item.button?.link ?? null
  if (link?.kind === 'whatsapp') {
    return whatsAppMessageHref(
      metadata.whatsappHref,
      typeof item.name === 'string' ? item.name : '',
    )
  }
  return getHref(metadata, link)
}

/** Preço até este tamanho cabe ao lado de tudo; maior ("a partir de R$ 1.200,00") fica menor, numa linha só. */
export const PRODUCT_PRICE_SHORT = 14

/** Frase do produto até este tamanho cabe no cartão estreito do celular (2 por linha, A4). */
export const PRODUCT_TEXT_SHORT = 60

/** Tamanho da foto do produto em cada arrumação, para o navegador baixar a medida certa. */
const PRODUCT_PHOTO_SIZES = {
  three: '(max-width: 460px) 100vw, (max-width: 720px) 50vw, 380px',
  two: '(max-width: 720px) 100vw, 560px',
  list: '120px',
} as const

/** Situação do item que aparece escrita no cartão (B2). Disponível não precisa dizer nada. */
const PRODUCT_STATUS_TEXT = { soldout: 'Esgotado', consult: 'Sob consulta' } as const

/**
 * Preço do item: o antigo riscado ao lado do novo (B2), na segunda cor do site quando há oferta.
 * "Sob consulta" troca o preço. O leitor de tela ouve "De R$ 79,90 por R$ 55,90".
 */
function ProductPrice({ item }: { item: ProductItem }) {
  const price = typeof item.price === 'string' ? item.price.trim() : ''
  const old = typeof item.oldPrice === 'string' ? item.oldPrice.trim() : ''
  if (item.status === 'consult') {
    return <p className="product__price product__price--consult">Sob consulta</p>
  }
  if (!price && !old) return null
  return (
    <p
      className={`product__price${old && price ? ' product__price--sale' : ''}`}
      data-long={price.length + old.length > PRODUCT_PRICE_SHORT || undefined}
      data-optional={optional(item.price, 'item')}
    >
      {old && (
        <s className="product__old">
          <span className="visually-hidden">De </span>
          {item.oldPrice}
        </s>
      )}
      {old && price && <span className="visually-hidden"> por </span>}
      {old ? price && <span className="product__now">{item.price}</span> : item.price}
    </p>
  )
}

/**
 * Vitrine de produtos: foto (4:5), selo, nome, frase curta, preço (com o antigo riscado), situação,
 * "Mais detalhes" numa janela e um botão por item (B2). Com categorias, filtro e, a partir de 12
 * itens, busca e "Ordenar" (B3), até 60 itens. Item sem foto ou sem nome não aparece no site (o
 * Publicar avisa); no editor, aparece com o aviso.
 */
export function Products({
  id,
  title,
  text = '',
  layout = 'three',
  badgeBelow = false,
  sort = 'manual',
  items,
  style = 'light',
  anim,
  metadata,
}: WithMetadata<ProductsProps>) {
  const shown = metadata.editing
    ? items
    : items.filter((item) => getPhoto(metadata, item.image ?? null) && filled(item.name))
  if (!shown.length) return null

  const cards: ProductCard[] = shown.map((item) => {
    const name = typeof item.name === 'string' ? item.name : ''
    const category = typeof item.category === 'string' ? item.category.trim() : ''
    const badge = typeof item.badge === 'string' ? item.badge.trim() : ''
    return {
      node: (
        <ProductCardBody badgeBelow={badgeBelow} item={item} layout={layout} metadata={metadata} />
      ),
      name,
      category,
      price: item.status === 'consult' ? null : parsePrice(item.price),
      search: [name, item.text, category, badge].filter(Boolean).join(' '),
    }
  })

  return (
    <Section
      anim={sectionAnim('Products', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionHead text={text} title={title} />
        <ProductsBrowse
          cards={cards}
          categories={productCategories(cards.map((card) => card.category))}
          className={`products products--${layout}`}
          editing={metadata.editing}
          sort={sort}
          tools={shown.length >= PRODUCTS_SEARCH_FROM}
          // Frase longa num cartão: no celular estreito, um por linha (A4).
          wordy={shown.some((item) => String(item.text ?? '').trim().length > PRODUCT_TEXT_SHORT)}
        />
      </div>
    </Section>
  )
}

/** O que vai dentro de cada cartão da Vitrine (o `<li>` é da lista, que filtra e ordena). */
function ProductCardBody({
  item,
  layout,
  badgeBelow,
  metadata,
}: {
  item: ProductItem
  layout: keyof typeof PRODUCT_PHOTO_SIZES
  badgeBelow: boolean
  metadata: ContentMetadata
}) {
  const photo = getPhoto(metadata, item.image ?? null)
  const name = typeof item.name === 'string' ? item.name : ''
  const soldOut = item.status === 'soldout'
  const href = metadata.editing || soldOut ? null : productHref(item, metadata)
  const label = item.button?.label
  const whats = item.button?.link?.kind === 'whatsapp'
  const badge = typeof item.badge === 'string' ? item.badge.trim() : ''
  const status = item.status && item.status !== 'available' ? item.status : null
  const extraPhotos = (item.photos ?? [])
    .map((entry) => ({ ref: entry.image, media: getPhoto(metadata, entry.image ?? null) }))
    .filter((entry) => entry.media)
  const details = typeof item.details === 'string' ? item.details.trim() : ''
  // Botão cheio, com o ícone do WhatsApp quando abre a conversa (C3, achado Products-3).
  const buttonInside = (
    <>
      {whats && <ContactIcon name="whatsapp" />}
      <span className="product__link-text">{label}</span>
    </>
  )
  const orderButton = metadata.editing
    ? item.button &&
      !soldOut && (
        <span className={`product__link${whats ? ' product__link--whats' : ''}`}>
          {buttonInside}
        </span>
      )
    : href &&
      typeof label === 'string' &&
      label.trim() && (
        <SiteLink className={`product__link${whats ? ' product__link--whats' : ''}`} href={href}>
          {buttonInside}
          {/* Os botões repetem o texto: o nome do produto diz qual é qual. */}
          {name && <span className="visually-hidden">: {name}</span>}
        </SiteLink>
      )
  const badgeTag = badge && (
    <span className={`product__badge${badgeBelow ? ' product__badge--below' : ''}`}>{badge}</span>
  )
  const statusTag = status === 'soldout' && (
    <p className="product__status">{PRODUCT_STATUS_TEXT.soldout}</p>
  )

  return (
    <>
      <div className="product__photo">
        {photo ? (
          <Photo
            backdrop={item.image?.backdrop}
            className="anim-part"
            fill
            fit={item.image?.fit}
            media={photo}
            sizes={PRODUCT_PHOTO_SIZES[layout]}
          />
        ) : (
          <EditorPlaceholder>Escolha uma foto sua do produto</EditorPlaceholder>
        )}
        {!badgeBelow && badgeTag}
      </div>
      <div className="product__body">
        {badgeBelow && badgeTag}
        {filled(item.name) && <h3 className="product__name">{item.name}</h3>}
        {filled(item.text) && <p className="product__text">{item.text}</p>}
        <ProductPrice item={item} />
        {statusTag}
        {(details || extraPhotos.length > 0) && (
          <ProductDetails editing={metadata.editing} name={name}>
            {(photo || extraPhotos.length > 0) && (
              <div
                aria-label={extraPhotos.length ? 'Fotos' : undefined}
                className="product-dialog__photos"
                data-count={extraPhotos.length + (photo ? 1 : 0)}
                role={extraPhotos.length ? 'group' : undefined}
                tabIndex={extraPhotos.length ? 0 : undefined}
              >
                {photo && (
                  <span className="product-dialog__photo">
                    <Photo
                      backdrop={item.image?.backdrop}
                      fill
                      fit={item.image?.fit ?? 'contain'}
                      media={photo}
                      sizes="(max-width: 720px) 100vw, 640px"
                    />
                  </span>
                )}
                {extraPhotos.map((entry, index) => (
                  <span className="product-dialog__photo" key={index}>
                    <Photo
                      backdrop={entry.ref?.backdrop}
                      fill
                      fit={entry.ref?.fit ?? 'contain'}
                      media={entry.media!}
                      sizes="(max-width: 720px) 100vw, 640px"
                    />
                  </span>
                ))}
              </div>
            )}
            {badge && <span className="product__badge product__badge--below">{badge}</span>}
            <ProductPrice item={item} />
            {statusTag}
            {details && (
              <div className="product-dialog__text">
                <Paragraphs text={details} />
              </div>
            )}
            {orderButton}
          </ProductDetails>
        )}
        {orderButton}
      </div>
    </>
  )
}

/**
 * Cardápio com preços: grupos ("Ovos de colher", "Natal") com nome, descrição curta e preço,
 * alinhados por um pontilhado ou uma linha, com números do mesmo tamanho. Foto opcional ao lado do
 * grupo. No site, item sem nome e grupo vazio não aparecem.
 */
export function PriceList({
  id,
  title,
  text = '',
  columns: layout = 'two',
  leader = 'dots',
  groups,
  style = 'light',
  anim,
  metadata,
}: WithMetadata<PriceListProps>) {
  const shown = groups.flatMap((group) => {
    const items = metadata.editing ? group.items : group.items.filter((item) => filled(item.name))
    return items.length || metadata.editing ? [{ ...group, items }] : []
  })
  if (!shown.length) return null
  // Um grupo só ocupa a largura de leitura, mesmo com "Duas colunas".
  const single = layout === 'one' || shown.length === 1
  const split = balancedSplit(
    shown.map((group) => priceGroupWeight(group.items.length, Boolean(group.image))),
  )
  const renderGroup = (group: (typeof shown)[number], groupIndex: number) => {
    const photo = getPhoto(metadata, group.image ?? null)
    return (
      <div className={`price-group${photo ? ' price-group--photo' : ''}`} key={groupIndex}>
        {photo && (
          <div className="price-group__photo anim-part">
            <Photo fill media={photo} sizes="(max-width: 720px) 100vw, 320px" />
          </div>
        )}
        <div className="price-group__body">
          {filled(group.name) && <h3 className="price-group__name anim-part">{group.name}</h3>}
          <ul className="price-group__items">
            {group.items.map((item, index) => (
              <li className="price-item anim-part" key={index} style={order(index)}>
                <span className="price-item__name">{item.name}</span>
                <span aria-hidden="true" className="price-item__leader" />
                <span className="price-item__price">{item.price}</span>
                {filled(item.description) && (
                  <span
                    className="price-item__description"
                    data-optional={optional(item.description, 'item')}
                  >
                    {item.description}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <Section
      anim={sectionAnim('PriceList', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionHead text={text} title={title} />
        <div className={`prices prices--${leader}${single ? ' prices--one' : ''}`}>
          {single
            ? shown.map(renderGroup)
            : // Duas colunas equilibradas, na ordem: os primeiros grupos à esquerda (C4).
              [shown.slice(0, split), shown.slice(split)].map((column, columnIndex) => (
                <div className="prices__column" key={columnIndex}>
                  {column.map((group, index) =>
                    renderGroup(group, index + (columnIndex ? split : 0)),
                  )}
                </div>
              ))}
        </div>
      </div>
    </Section>
  )
}

/**
 * Faixa de aviso: até 5 frases curtas. "Correndo": a faixa corre sem parar e para com o mouse em
 * cima, o dedo encostado ou o foco do teclado; quem pediu menos movimento a vê parada. O leitor de tela lê o aviso inteiro uma vez (`aria-label`); a trilha repetida
 * fica escondida dele. "Parada": até duas frases lado a lado, no centro; com mais, uma por vez. No editor, sempre parada.
 */
export function Announcement({
  items,
  mode = 'move',
  style = 'brand',
  metadata,
}: WithMetadata<AnnouncementProps>) {
  const texts = metadata.editing
    ? items.map((item) => item.text)
    : items.map((item) => item.text).filter((text) => filled(text))
  if (!texts.length) return null
  const moving = mode === 'move' && !metadata.editing
  // Fundo próprio (e não `section--*`): a faixa fina não muda o espaço da seção seguinte.
  const className = `announce announce--${style} announce--${moving ? 'move' : 'static'}`
  const plain = texts.map((text) => String(text).replace(/\s+/g, ' ').trim())
  const label = `Aviso: ${plain.join('. ')}`
  // Parada com mais de duas frases: no site, uma por vez (C2, achado Announcement-2).
  const rotating = mode === 'static' && texts.length > ANNOUNCE_STILL_MAX

  const still = (
    <p aria-hidden={moving || undefined} className="announce__still">
      {texts.map((text, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span aria-hidden="true" className="announce__mark">
              ✦
            </span>
          )}
          <span className="announce__item">{text}</span>
        </React.Fragment>
      ))}
    </p>
  )

  if (rotating && !metadata.editing) {
    return (
      <AnnounceStrip className={className} label={label}>
        <AnnounceRotate texts={plain} />
      </AnnounceStrip>
    )
  }

  if (!moving) {
    return (
      <div className={className}>
        <div className="container">{still}</div>
        {/* No editor a faixa fica parada para dar para escrever nela: o selo diz o que ela faz no
            site, e "Correndo" e "Parada" deixam de parecer iguais (achado 11.6). */}
        {metadata.editing && mode === 'move' && (
          <span className="announce__editor-tag">Correndo no site →</span>
        )}
        {metadata.editing && rotating && (
          <span className="announce__editor-tag">Uma por vez no site</span>
        )}
      </div>
    )
  }

  const run = announcementRun(plain)
  // Mesma velocidade com textos curtos ou longos: ~0,2 s por letra de cada metade (~60 px/s).
  const letters = run.reduce((sum, text) => sum + text.length + 4, 0)
  const duration = {
    '--duration': `${Math.max(20, Math.round(letters * 0.2))}s`,
  } as React.CSSProperties
  const half = (copy: number) => (
    <span className="announce__half">
      {run.map((text, index) => (
        <React.Fragment key={`${copy}-${index}`}>
          <span className="announce__item">{text}</span>
          <span className="announce__mark">✦</span>
        </React.Fragment>
      ))}
    </span>
  )

  // Sem botão de parar (C2): a faixa para com o mouse em cima, o dedo encostado ou o foco.
  return (
    <AnnounceStrip className={className} label={label}>
      {still}
      <div aria-hidden="true" className="announce__track" style={duration}>
        {half(1)}
        {half(2)}
      </div>
    </AnnounceStrip>
  )
}

/** Ícone do Instagram, no traço dos outros ícones do site. */
function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect height="17" rx="5" width="17" x="3.5" y="3.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" fill="currentColor" r=".6" />
    </svg>
  )
}

/** Colunas da faixa do Instagram: até 6 numa linha; 7 e 8 em 4 + 3 e 4 + 4. No celular, 2 a 4. */
export function instagramColumns(count: number): { desktop: number; mobile: number } {
  return {
    // Com 6, 3+3 (C9, achado InstagramStrip-1): 6 numa linha ficavam pequenas.
    desktop: count === 6 ? 3 : count <= 6 ? Math.max(count, 1) : 4,
    mobile: count === 4 ? 2 : count >= 7 ? 4 : 3,
  }
}

/**
 * Instagram, sem ligar no Instagram: fotos escolhidas da biblioteca (não mudam sozinhas), o @ das
 * Configurações e o botão "Seguir no Instagram". Sem o @, as fotos aparecem sem o botão.
 */
export function InstagramStrip({
  id,
  title,
  images,
  style = 'light',
  anim,
  metadata,
}: WithMetadata<InstagramStripProps>) {
  const photos = images.flatMap((ref) => getPhoto(metadata, ref) ?? [])
  if (!photos.length && !metadata.editing) return null
  const profile = instagramLink(metadata.site.instagram)
  const grid = instagramColumns(photos.length)
  const follow = !profile ? null : metadata.editing ? (
    <span className="button button--ghost insta__follow">
      <InstagramIcon />
      Seguir no Instagram
    </span>
  ) : (
    <SiteLink className="button button--ghost insta__follow" href={profile.url}>
      <InstagramIcon />
      Seguir no Instagram
      <span className="visually-hidden"> ({profile.label})</span>
    </SiteLink>
  )

  return (
    <Section
      anim={sectionAnim('InstagramStrip', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionHead aside={follow} stacked text={profile?.label} title={title} />
        {metadata.editing && !profile && (
          <EditorPlaceholder>
            O @ e o botão “Seguir no Instagram” aparecem quando o Instagram for preenchido nas
            Configurações do site.
          </EditorPlaceholder>
        )}
        {photos.length > 0 && (
          <ul
            className="insta"
            data-count={photos.length}
            style={columns(grid.desktop, grid.mobile)}
          >
            {photos.map((photo, index) => (
              <li className="anim-part" key={`${photo.id}-${index}`} style={order(index)}>
                <Photo
                  className="anim-part"
                  fill
                  media={photo}
                  sizes="(max-width: 720px) 33vw, 200px"
                />
              </li>
            ))}
          </ul>
        )}
        {metadata.editing && photos.length < INSTAGRAM_MIN_PHOTOS && (
          <EditorPlaceholder>
            {photos.length
              ? `Escolha mais ${INSTAGRAM_MIN_PHOTOS - photos.length} foto(s): a faixa pede de 4 a 8.`
              : 'Escolha de 4 a 8 fotos nas opções da seção'}
          </EditorPlaceholder>
        )}
      </div>
    </Section>
  )
}

/**
 * "Números do negócio" (Elementor, E10): 2 a 4 números grandes, cada um com a frase embaixo. O
 * número já vem escrito no HTML (o Google e quem está sem JavaScript leem o valor certo); a
 * contagem do zero é só o efeito, ligado com a animação do site (`startReveal`).
 */
/**
 * O número que conta, com o que vem antes e depois ("R$ ", " milhão") fora da contagem: os
 * algarismos têm todos a mesma largura (não tremem ao contar), e os espaços continuam estreitos
 * (com a largura fixa, "R$ 1,2 milhão" ficava com buracos entre as palavras, C4).
 */
function StatValue({ value }: { value: string }) {
  const target = parseCount(value)
  if (!target) return <span className="stats__value">{value}</span>
  const number = value.slice(target.before.length, value.length - target.after.length)
  return (
    <span className="stats__value">
      {target.before && <span className="stats__affix">{target.before}</span>}
      <span className="stats__number" data-countup={number}>
        {number}
      </span>
      {target.after && <span className="stats__affix">{target.after}</span>}
    </span>
  )
}

export function Stats({ id, title, items, style, anim, metadata }: WithMetadata<StatsProps>) {
  const shown = metadata.editing
    ? items
    : items.filter((item) => filled(item.value) || filled(item.text))
  if (!shown.length) return null
  return (
    <Section anim={sectionAnim('Stats', anim, metadata)} id={id} metadata={metadata} style={style}>
      <div className="container anim-part">
        <SectionTitle title={title} />
        <ul className="stats" data-items={shown.length}>
          {shown.map((item, index) => (
            <li className="stats__item anim-part" key={index} style={order(index)}>
              {/* No editor o número é o campo do Puck (não um texto): a contagem é só no site. */}
              {!metadata.editing && typeof item.value === 'string' ? (
                <StatValue value={item.value} />
              ) : (
                <span className="stats__value">{item.value}</span>
              )}
              {filled(item.text) && <span className="stats__label">{item.text}</span>}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

// Seções novas da etapa 4a (C5, B5).

/** Só o texto, para conferir se a célula ou o campo está vazio (no editor pode chegar outra coisa). */
const plainText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** Número, preço ou porcentagem ("R$ 45", "1.200", "30%", "4,9"): a coluna inteira assim alinha à direita. */
const NUMBER_CELL = /^[-+]?(R\$\s?)?\d[\d.,\s]*(%|h|min|kg|g|ml|l|m²|un\.?)?$/i

/**
 * Tabela (C5): linhas e colunas simples. A primeira linha é o nome das colunas e a primeira coluna
 * é o nome de cada linha (cabeçalho para o leitor de tela). No celular, a tabela rola para o lado
 * dentro da própria caixa, com a primeira coluna parada. Coluna só de números alinha à direita.
 * No site, linhas e colunas vazias saem.
 */
export function Table({
  id,
  title,
  text = '',
  head,
  rows,
  style,
  anim,
  metadata,
}: WithMetadata<TableProps>) {
  const width = head.length
  const cell = (row: string[], column: number) => plainText(row[column])
  const keptRows = metadata.editing
    ? rows
    : rows.filter((row) => head.some((_, column) => cell(row, column)))
  const keptColumns = head
    .map((_, column) => column)
    .filter(
      (column) =>
        metadata.editing || cell(head, column) || keptRows.some((row) => cell(row, column)),
    )
  if (!keptColumns.length || (!metadata.editing && !keptRows.length)) return null
  const numeric = keptColumns.map(
    (column) =>
      column > 0 &&
      keptRows.some((row) => cell(row, column)) &&
      keptRows.every((row) => !cell(row, column) || NUMBER_CELL.test(cell(row, column))),
  )
  const label = plainText(title) || 'Tabela'

  return (
    <Section anim={sectionAnim('Table', anim, metadata)} id={id} metadata={metadata} style={style}>
      <div className="container anim-part">
        <SectionHead text={text} title={title} />
        <div
          aria-label={label}
          className="table-box anim-part"
          role="region"
          // A caixa rola para o lado no celular: com o teclado, as setas rolam depois do Tab.
          tabIndex={0}
        >
          <table className="table" data-cols={width}>
            <thead>
              <tr>
                {keptColumns.map((column, index) => (
                  <th data-num={numeric[index] || undefined} key={column} scope="col">
                    {head[column]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keptRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {keptColumns.map((column, index) =>
                    index === 0 ? (
                      <th key={column} scope="row">
                        {row[column]}
                      </th>
                    ) : (
                      <td data-num={numeric[index] || undefined} key={column}>
                        {row[column]}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {metadata.editing && !rows.length && (
          <EditorPlaceholder>Escreva ou cole a tabela no painel ao lado.</EditorPlaceholder>
        )}
      </div>
    </Section>
  )
}

/** Colunas da Equipe no computador: até 4 por linha; 5 e 6 ficam em 3, e a última linha centraliza. */
export function teamColumns(count: number): 1 | 2 | 3 | 4 {
  if (count <= 1) return 1
  if (count === 2) return 2
  if (count === 3 || count === 5 || count === 6 || count === 9) return 3
  return 4
}

/** Equipe (C5): foto (ou as iniciais), cargo em cima do nome, uma frase e um contato opcional. */
export function Team({
  id,
  title,
  text = '',
  items,
  style,
  anim,
  metadata,
}: WithMetadata<TeamProps>) {
  const shown = metadata.editing ? items : items.filter((item) => filled(item.name))
  if (!shown.length) return null
  const cols = teamColumns(shown.length)
  return (
    <Section anim={sectionAnim('Team', anim, metadata)} id={id} metadata={metadata} style={style}>
      <div className="container anim-part">
        <SectionHead text={text} title={title} />
        <ul className="team" data-count={shown.length} style={columns(cols)}>
          {shown.map((item, index) => (
            <li className="team__item anim-part" key={index} style={order(index)}>
              <TeamCard item={item} metadata={metadata} single={shown.length === 1} />
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

function TeamCard({
  item,
  metadata,
  single,
}: {
  item: TeamMember
  metadata: ContentMetadata
  single: boolean
}) {
  const media = getPhoto(metadata, item.photo ?? null)
  const name = plainText(item.name)
  const contact = item.contact ?? null
  const href = contact && !metadata.editing ? getHref(metadata, contact.link) : null
  const contactLabel = plainText(contact?.label) || 'Falar comigo'
  return (
    <article className="team__card">
      <div className={`team__photo${media ? '' : ' team__photo--empty'}`}>
        {media ? (
          <Photo
            alt=""
            backdrop={item.photo?.backdrop}
            fill
            fit={item.photo?.fit}
            media={media}
            sizes={single ? '(max-width: 720px) 60vw, 320px' : '(max-width: 720px) 50vw, 260px'}
          />
        ) : (
          <span aria-hidden="true" className="team__initials">
            {name ? initials(name) : metadata.editing ? 'Foto' : ''}
          </span>
        )}
      </div>
      <div className="team__text">
        {filled(item.role) && (
          <p className="team__role" data-optional={optional(item.role, 'item')}>
            {item.role}
          </p>
        )}
        <h3 className="team__name">{item.name}</h3>
        {filled(item.text) && (
          <p className="team__about" data-optional={optional(item.text, 'item')}>
            {item.text}
          </p>
        )}
        {contact &&
          (href ? (
            <SiteLink className="team__contact" href={href}>
              {contactLabel}
              {name && <span className="visually-hidden">: {name}</span>}
            </SiteLink>
          ) : metadata.editing ? (
            <span className="team__contact">{contactLabel}</span>
          ) : null)}
      </div>
    </article>
  )
}

/**
 * Faixa de logos (C5): parceiros, clientes, marcas. Sem a sobra em volta (medida no editor) e todos
 * com a mesma área, para nenhum parecer maior. Coloridos, em cinza (a cor volta ao passar o mouse)
 * ou em cartões brancos (para logos escuros num fundo escuro). Logo sem descrição é lido como
 * "Logo"; a descrição da foto vira o nome da marca.
 */
export function LogoStrip({
  id,
  title,
  images,
  look = 'color',
  style,
  anim,
  metadata,
}: WithMetadata<LogoStripProps>) {
  const logos = images
    .map((ref) => ({ ref, media: getPhoto(metadata, { mediaId: ref.mediaId }) }))
    .filter((logo) => logo.media)
  if (!logos.length) {
    return metadata.editing ? (
      <Section id={id} metadata={metadata} style={style}>
        <div className="container">
          <SectionTitle title={title} />
          <EditorPlaceholder>Escolha os logos no painel ao lado.</EditorPlaceholder>
        </div>
      </Section>
    ) : null
  }
  return (
    <Section
      anim={sectionAnim('LogoStrip', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionTitle title={title} />
        <ul className={`logos logos--${look}`} data-count={logos.length}>
          {logos.map(({ ref, media }, index) => {
            const photo = media!
            const ratio = logoRatio(photo.width ?? 1, photo.height ?? 1, ref.trim)
            const box = logoBox(ratio)
            const crop = trimStyle(ref.trim)
            const alt = plainText(photo.alt) || 'Logo'
            return (
              <li
                className="logos__item anim-part"
                key={`${ref.mediaId}-${index}`}
                style={order(index)}
              >
                <span
                  className="logos__logo"
                  style={
                    {
                      '--logo-w': `${box.width}px`,
                      '--logo-h': `${box.height}px`,
                    } as React.CSSProperties
                  }
                >
                  <span className="logos__crop" style={crop ?? undefined}>
                    <Photo
                      alt={alt}
                      fill
                      fit="contain"
                      backdrop="none"
                      media={photo}
                      sizes={`${Math.ceil(box.width / (ref.trim?.w ?? 1)) * 2}px`}
                    />
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}

/**
 * Antes e depois (C5): pares de fotos com legenda. Padrão: lado a lado no computador e deslizante
 * no celular; "Deslizante" usa o controle nos dois. Par sem uma das fotos não aparece no site.
 */
export function BeforeAfter({
  id,
  title,
  text = '',
  layout = 'auto',
  items,
  style,
  anim,
  metadata,
}: WithMetadata<BeforeAfterProps>) {
  const shown = metadata.editing
    ? items
    : items.filter(
        (item) => getPhoto(metadata, item.before ?? null) && getPhoto(metadata, item.after ?? null),
      )
  if (!shown.length) return null
  const sizes =
    layout === 'slider' ? '(max-width: 720px) 100vw, 900px' : '(max-width: 720px) 100vw, 520px'
  const side = (ref: PhotoRef | undefined, label: string) => {
    const media = getPhoto(metadata, ref ?? null)
    return media ? (
      <Photo
        alt={plainText(media.alt) || label}
        fill
        fit={ref?.fit}
        backdrop={ref?.backdrop}
        media={media}
        sizes={sizes}
      />
    ) : (
      <span className="ba__empty">{metadata.editing ? `Foto de ${label.toLowerCase()}` : ''}</span>
    )
  }
  return (
    <Section
      anim={sectionAnim('BeforeAfter', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionHead text={text} title={title} />
        <ul className="ba-list" data-count={shown.length} data-layout={layout}>
          {shown.map((item, index) => (
            <li className="ba-list__item anim-part" key={index} style={order(index)}>
              <figure className="ba-figure">
                <BeforeAfterPair
                  after={side(item.after, 'Depois')}
                  before={side(item.before, 'Antes')}
                  caption={plainText(item.caption)}
                  layout={layout}
                />
                {filled(item.caption) && (
                  <figcaption data-optional={optional(item.caption, 'item')}>
                    {item.caption}
                  </figcaption>
                )}
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

/**
 * Agenda (B5): datas com título, local, horário, frase e botão. Os próximos primeiro; os que
 * passaram saem sozinhos ou vão para "Já aconteceu" (`EventsBrowse`). Contagem opcional até a
 * próxima data, só em dias e horas. Cada data tem "Adicionar à agenda", que abre a agenda do
 * celular. Data sem dia ou sem título não aparece no site (o Publicar avisa).
 */
export function Events({
  id,
  title,
  text = '',
  items,
  past = 'hide',
  countdown = false,
  style,
  anim,
  metadata,
}: WithMetadata<EventsProps>) {
  const shown = metadata.editing
    ? items
    : items.filter((item) => validDate(item.date) && filled(item.title))
  const now = renderTime()
  const year = new Date(now).getUTCFullYear()
  const cards: EventCard[] = shown.map((item) => ({
    node: <EventCardBody item={item} metadata={metadata} year={year} />,
    date: item.date,
    time: item.time,
    title: plainText(item.title),
  }))
  return (
    <Section anim={sectionAnim('Events', anim, metadata)} id={id} metadata={metadata} style={style}>
      <div className="container anim-part">
        <SectionHead text={text} title={title} />
        <EventsBrowse
          cards={cards}
          countdown={countdown}
          editing={metadata.editing}
          now={now}
          past={past}
        />
      </div>
    </Section>
  )
}

function EventCardBody({
  item,
  metadata,
  year,
}: {
  item: EventItem
  metadata: ContentMetadata
  year: number
}) {
  const parts = eventDateParts(item.date)
  const time = eventTimeText(item.time)
  const ics = metadata.editing
    ? null
    : icsHref({
        date: item.date,
        time: item.time,
        title: plainText(item.title),
        place: plainText(item.place),
        text: plainText(item.text),
      })
  return (
    <article className="event">
      {parts ? (
        <time
          className="event__date"
          dateTime={item.time ? `${item.date}T${item.time}-03:00` : item.date}
        >
          <span aria-hidden="true" className="event__weekday">
            {parts.weekday}
          </span>
          <span aria-hidden="true" className="event__day">
            {parts.day}
          </span>
          <span aria-hidden="true" className="event__month">
            {parts.month}
            {Number(parts.year) !== year && ` ${parts.year}`}
          </span>
          <span className="visually-hidden">{parts.full}</span>
        </time>
      ) : (
        <span className="event__date event__date--empty">{metadata.editing ? 'Dia?' : ''}</span>
      )}
      <div className="event__body">
        <h3 className="event__title">{item.title}</h3>
        {(time || filled(item.place)) && (
          <p className="event__meta">
            {time && <span className="event__time">{time}</span>}
            {filled(item.place) && (
              <span className="event__place" data-optional={optional(item.place, 'item')}>
                {item.place}
              </span>
            )}
          </p>
        )}
        {filled(item.text) && (
          <p className="event__text" data-optional={optional(item.text, 'item')}>
            {item.text}
          </p>
        )}
        {metadata.editing && <span className="event__gone">Já passou</span>}
        <div className="event__actions">
          <SectionButton button={item.button ?? null} metadata={metadata} />
          {ics ? (
            <a
              aria-label={`Adicionar à agenda: ${plainText(item.title)}`}
              className="event__ics"
              href={ics}
              rel="nofollow"
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
                width="18"
              >
                <rect height="16" rx="2.5" width="17" x="3.5" y="5" />
                <path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
              </svg>
              Adicionar à agenda
            </a>
          ) : (
            metadata.editing && <span className="event__ics">Adicionar à agenda</span>
          )}
        </div>
      </div>
    </article>
  )
}
