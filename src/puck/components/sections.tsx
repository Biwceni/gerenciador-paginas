import React from 'react'

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
import { privacyBlocks } from '@/lib/privacy'
import { splitHighlight } from '@/lib/highlight'
import { initials } from '@/lib/site'

import { type ContentMetadata, getHref, getPhoto } from '../references'
import { COLUMN_COUNT } from '../schema'
import type {
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
  LinkListProps,
  PrivacyProps,
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

export function Hero(props: WithMetadata<HeroProps>) {
  const { id, title, text, image, button, metadata } = props
  const highlight = props.highlight ?? ''
  const photo = getPhoto(metadata, image)
  // Sem foto, o estilo "foto" vira fundo na cor principal, para o texto branco continuar legível, e
  // "foto ao lado" vira o fundo suave.
  const style =
    props.style === 'image' && !photo
      ? 'brand'
      : props.style === 'side'
        ? photo
          ? 'side'
          : 'soft'
        : props.style
  // Com a foto ao lado, o texto fica sempre à esquerda.
  const align = style === 'side' ? 'left' : props.align
  const isMain = metadata.mainHeadingId === id
  const Heading = isMain ? 'h1' : 'h2'
  const anim = sectionAnim('Hero', props.anim, metadata)
  const classes = [
    'section',
    style === 'side' ? 'section--soft hero--side' : `section--${style}`,
    'hero',
    align === 'center' && 'hero--center',
    !photo && 'hero--plain',
    props.height === 'compact' && 'hero--compact',
    animClass(anim),
  ]

  return (
    <section className={classes.filter(Boolean).join(' ')}>
      {style === 'image' && photo && (
        <>
          <Photo
            className="hero__bg anim-part"
            fill
            media={photo}
            priority={isMain && !metadata.editing}
            sizes="100vw"
          />
          <div aria-hidden="true" className="hero__shade" />
        </>
      )}
      <div className="container hero__container">
        <div className="hero__inner anim-part">
          {filled(title) && (
            <Heading className="hero__title">
              {anim === 'linhas' ? (
                <LinedTitle title={title} words={highlight} />
              ) : (
                <HighlightedTitle title={title} words={highlight} />
              )}
            </Heading>
          )}
          {metadata.editing && highlight.trim() && <EditorHighlight words={highlight} />}
          {filled(text) && <p className="hero__text anim-part">{text}</p>}
          <SectionButton button={button} className="anim-part" metadata={metadata} />
        </div>
        {style === 'side' && photo && (
          <div className="hero__photo anim-part">
            <Photo
              className="anim-part"
              fill
              media={photo}
              priority={isMain && !metadata.editing}
              sizes="(max-width: 720px) 100vw, 480px"
            />
          </div>
        )}
      </div>
    </section>
  )
}

export function TextImage({
  id,
  title,
  text,
  image,
  side,
  style,
  anim,
  metadata,
}: WithMetadata<TextImageProps>) {
  const photo = getPhoto(metadata, image)
  if (!metadata.editing && !filled(title) && !filled(text) && !photo) return null

  return (
    <Section
      anim={sectionAnim('TextImage', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div
        className={`container text-image anim-part${side === 'left' ? ' text-image--left' : ''}`}
      >
        <div className="text-image__text anim-part">
          {filled(title) && <h2>{title}</h2>}
          <Paragraphs text={text} />
        </div>
        {(photo || metadata.editing) && (
          <div className="text-image__photo anim-part">
            {photo ? (
              <Photo fill media={photo} sizes="(max-width: 720px) 100vw, 540px" />
            ) : (
              <EditorPlaceholder>Escolha uma foto nas opções da seção</EditorPlaceholder>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}

/**
 * Destaques, até três por linha, sem caixa. Marcador: nenhum (padrão), um ícone por item ou
 * números (passo a passo, e só então uma lista numerada).
 */
export function Features({
  id,
  title,
  items,
  marker = 'none',
  style,
  anim,
  metadata,
}: WithMetadata<FeaturesProps>) {
  const shown = metadata.editing
    ? items
    : items.filter((item) => filled(item.title) || filled(item.text))
  if (!shown.length) return null
  const two = shown.length % 2 === 0 && shown.length < 6
  const List = marker === 'number' ? 'ol' : 'ul'

  return (
    <Section
      anim={sectionAnim('Features', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionTitle title={title} />
        <List className={`features${two ? ' features--two' : ''}`}>
          {shown.map((item, index) => (
            <li className="features__item anim-part" key={index} style={order(index)}>
              {marker === 'number' && (
                <span aria-hidden="true" className="features__number">
                  {index + 1}
                </span>
              )}
              {marker === 'icon' && <FeatureIcon name={item.icon ?? 'check'} />}
              {filled(item.title) && <h3>{item.title}</h3>}
              <Paragraphs text={item.text} />
            </li>
          ))}
        </List>
      </div>
    </Section>
  )
}

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

  return (
    <Section
      anim={sectionAnim('Testimonials', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionTitle title={title} />
        <ul className="testimonials">
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
      <div className="container anim-part">
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
                  height="20"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="20"
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

export function Gallery({ id, title, images, style, anim, metadata }: WithMetadata<GalleryProps>) {
  // Fotos apagadas da biblioteca somem da galeria; sem nenhuma, a seção some.
  const photos = images.flatMap((ref) => getPhoto(metadata, ref) ?? [])
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
          <GalleryGrid photos={photos} viewer={!metadata.editing} />
        ) : (
          <EditorPlaceholder>Escolha as fotos da galeria nas opções da seção</EditorPlaceholder>
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
  style,
  anim,
  metadata,
}: WithMetadata<CallToActionProps>) {
  const shown = sectionAnim('CallToAction', anim, metadata)
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
export function Contact({ id, title, text, style, anim, metadata }: WithMetadata<ContactProps>) {
  const { whatsapp, phone, email, address, hours } = metadata.site.contact
  const whatsappHref = whatsAppURL(whatsapp)
  type Item = { icon: ContactIconName; label: string; value: string; href?: string; extra?: string }
  const items: Item[] = []
  if (whatsapp && whatsappHref) {
    items.push({ icon: 'whatsapp', label: 'WhatsApp', value: whatsapp, href: whatsappHref })
  }
  if (phone) {
    items.push({
      icon: 'phone',
      label: 'Telefone',
      value: phone,
      href: telHref(phone) ?? undefined,
    })
  }
  if (email) items.push({ icon: 'mail', label: 'E-mail', value: email, href: `mailto:${email}` })
  // O endereço abre o mapa: a linha inteira é o link.
  if (address) {
    items.push({
      icon: 'map',
      label: 'Endereço',
      value: address,
      href: mapsURL(address),
      extra: 'Ver no mapa',
    })
  }
  if (hours) items.push({ icon: 'clock', label: 'Horário', value: hours })

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
          <ul className="contact__list">
            {items.map((item) => {
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
                <li key={item.label}>
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
        ) : (
          metadata.editing && (
            <EditorPlaceholder>
              WhatsApp, telefone, e-mail, endereço e horário aparecem aqui quando forem preenchidos
              nas Configurações do site.
            </EditorPlaceholder>
          )
        )}
      </div>
    </Section>
  )
}

/** Política de privacidade: o texto sai das configurações na hora de mostrar (`lib/privacy.ts`). */
export function Privacy({ id, title, style, anim, metadata }: WithMetadata<PrivacyProps>) {
  const Heading = metadata.mainHeadingId === id ? 'h1' : 'h2'

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
              {block.heading && <h3>{block.heading}</h3>}
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
  style,
  anim,
  columns,
  metadata,
}: Omit<WithMetadata<ColumnsProps>, 'column1' | 'column2' | 'column3'> & {
  columns: React.ReactNode[]
}) {
  return (
    <Section
      anim={sectionAnim('Columns', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className={`container columns columns--${layout} anim-part`}>
        {columns.slice(0, COLUMN_COUNT[layout]).map((column, index) => (
          <div className="columns__column anim-part" key={index} style={order(index)}>
            {column}
          </div>
        ))}
      </div>
    </Section>
  )
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
      {filled(caption) && <figcaption>{caption}</figcaption>}
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
  const coverPhoto = photo ? (
    <Photo fill media={photo} sizes="(max-width: 720px) 100vw, 860px" />
  ) : null

  return (
    <Section anim={sectionAnim('Video', anim, metadata)} id={id} metadata={metadata} style={style}>
      <div className="container video anim-part">
        <SectionTitle title={title} />
        <figure>
          <div className="video__box anim-part">
            {metadata.editing ? (
              // No editor o vídeo não toca: aparece a capa e um aviso.
              <>
                {coverPhoto}
                <EditorPlaceholder>
                  {videoId
                    ? 'No site, o vídeo toca quando a pessoa clica.'
                    : 'Cole o endereço do vídeo do YouTube nas opções da seção'}
                </EditorPlaceholder>
              </>
            ) : (
              <VideoPlayer cover={coverPhoto} title={title} videoId={videoId} />
            )}
          </div>
          {filled(caption) && <figcaption>{caption}</figcaption>}
        </figure>
      </div>
    </Section>
  )
}
