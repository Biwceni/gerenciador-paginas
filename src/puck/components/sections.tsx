import React from 'react'

import { Photo } from '@/components/site/Photo'
import { SiteLink } from '@/components/site/SiteLink'
import { telHref, whatsAppURL } from '@/lib/links'
import { privacyBlocks } from '@/lib/privacy'
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
import { FeatureIcon } from './FeatureIcon'
import { SiteForm } from './SiteForm'
import { VideoPlayer } from './VideoPlayer'

// Desenho das seções conforme o protótipo navegável. Serve no site e na prévia do editor
// (`metadata.editing`): lá, o que está vazio aparece com um aviso, para dar para clicar e preencher.

type WithMetadata<P> = P & { metadata: ContentMetadata }

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

/** Caixa da seção: fundo, margens e a âncora do "Nome no menu". */
function Section({
  id,
  metadata,
  style,
  children,
}: {
  id: string
  metadata: ContentMetadata
  style: string
  children: React.ReactNode
}) {
  return (
    <section className={`section section--${style}`} id={metadata.anchors[id]}>
      {children}
    </section>
  )
}

function SectionTitle({ title }: { title: React.ReactNode }) {
  return filled(title) ? <h2 className="section-title">{title}</h2> : null
}

/**
 * Banner principal. No estilo "foto", a foto cobre o fundo, escurecida, com o texto em branco; em
 * "foto ao lado", o texto fica à esquerda e a foto à direita (embaixo do botão, no celular).
 */
export function Hero(props: WithMetadata<HeroProps>) {
  const { id, title, text, image, button, metadata } = props
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
  const classes = [
    'section',
    style === 'side' ? 'section--soft hero--side' : `section--${style}`,
    'hero',
    align === 'center' && 'hero--center',
    !photo && 'hero--plain',
  ]

  return (
    <section className={classes.filter(Boolean).join(' ')}>
      {style === 'image' && photo && (
        <>
          <Photo
            className="hero__bg"
            fill
            media={photo}
            priority={isMain && !metadata.editing}
            sizes="100vw"
          />
          <div aria-hidden="true" className="hero__shade" />
        </>
      )}
      <div className="container hero__container">
        <div className="hero__inner">
          {filled(title) && <Heading className="hero__title">{title}</Heading>}
          {filled(text) && <p className="hero__text">{text}</p>}
          <SectionButton button={button} metadata={metadata} />
        </div>
        {style === 'side' && photo && (
          <div className="hero__photo">
            <Photo
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
  metadata,
}: WithMetadata<TextImageProps>) {
  const photo = getPhoto(metadata, image)
  if (!metadata.editing && !filled(title) && !filled(text) && !photo) return null

  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className={`container text-image${side === 'left' ? ' text-image--left' : ''}`}>
        <div className="text-image__text">
          {filled(title) && <h2>{title}</h2>}
          <Paragraphs text={text} />
        </div>
        {(photo || metadata.editing) && (
          <div className="text-image__photo">
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
  metadata,
}: WithMetadata<FeaturesProps>) {
  const shown = metadata.editing
    ? items
    : items.filter((item) => filled(item.title) || filled(item.text))
  if (!shown.length) return null
  const two = shown.length % 2 === 0 && shown.length < 6
  const List = marker === 'number' ? 'ol' : 'ul'

  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className="container">
        <SectionTitle title={title} />
        <List className={`features${two ? ' features--two' : ''}`}>
          {shown.map((item, index) => (
            <li className="features__item" key={index}>
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
  metadata,
}: WithMetadata<TestimonialsProps>) {
  const shown = metadata.editing ? items : items.filter((item) => filled(item.quote))
  if (!shown.length) return null

  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className="container">
        <SectionTitle title={title} />
        <ul className="testimonials">
          {shown.map((item, index) => {
            const photo = getPhoto(metadata, item.photo ?? null)
            return (
              <li key={index}>
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
export function Faq({ id, title, items, style, metadata }: WithMetadata<FaqProps>) {
  const shown = metadata.editing ? items : items.filter((item) => filled(item.question))
  if (!shown.length) return null

  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className="container">
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

export function Gallery({ id, title, images, style, metadata }: WithMetadata<GalleryProps>) {
  // Fotos apagadas da biblioteca somem da galeria; sem nenhuma, a seção some.
  const photos = images.flatMap((ref) => getPhoto(metadata, ref) ?? [])
  if (!photos.length && !metadata.editing) return null

  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className="container">
        <SectionTitle title={title} />
        {photos.length ? (
          <ul className={`gallery${photos.length % 2 ? ' gallery--odd' : ''}`}>
            {photos.map((photo, index) => (
              <li key={`${photo.id}-${index}`}>
                <Photo fill media={photo} sizes="(max-width: 720px) 50vw, 340px" />
              </li>
            ))}
          </ul>
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
  metadata,
}: WithMetadata<CallToActionProps>) {
  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className="container cta">
        {filled(title) && <h2>{title}</h2>}
        {filled(text) && <p>{text}</p>}
        <SectionButton button={button} metadata={metadata} />
      </div>
    </Section>
  )
}

/** Busca do endereço no Google Maps, aberta numa aba nova. Nada do Google carrega na página. */
export function mapsURL(address: string): string {
  const query = address.replace(/\s+/g, ' ').trim()
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** Contato e endereço: os dados vêm das configurações e mudam no site todo. */
export function Contact({ id, title, text, style, metadata }: WithMetadata<ContactProps>) {
  const { whatsapp, phone, email, address, hours } = metadata.site.contact
  const whatsappHref = whatsAppURL(whatsapp)
  const items = [
    whatsappHref && { label: 'WhatsApp', value: whatsapp, href: whatsappHref },
    phone && { label: 'Telefone', value: phone, href: telHref(phone) ?? undefined },
    email && { label: 'E-mail', value: email, href: `mailto:${email}` },
    address && { label: 'Endereço', value: address },
    hours && { label: 'Horário', value: hours },
  ].filter((item): item is { label: string; value: string; href?: string } => Boolean(item))

  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className="container contact">
        <div className="contact__intro">
          {filled(title) && <h2 className="section-title">{title}</h2>}
          <Paragraphs text={text} />
        </div>
        {items.length > 0 ? (
          <dl className="contact__list">
            {items.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>
                  {item.href && !metadata.editing ? (
                    <SiteLink href={item.href}>{item.value}</SiteLink>
                  ) : (
                    item.value
                  )}
                  {/* O mapa fica logo abaixo do endereço. */}
                  {item.label === 'Endereço' &&
                    (metadata.editing ? (
                      <span className="contact__map">Ver no mapa</span>
                    ) : (
                      <SiteLink className="contact__map" href={mapsURL(item.value)}>
                        Ver no mapa
                      </SiteLink>
                    ))}
                </dd>
              </div>
            ))}
          </dl>
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
export function Privacy({ id, title, style, metadata }: WithMetadata<PrivacyProps>) {
  const Heading = metadata.mainHeadingId === id ? 'h1' : 'h2'

  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className="container rich-text">
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
    <Section id={id} metadata={metadata} style={style}>
      <div className="container form-section">
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
export function LinkList({ id, title, text, items, style, metadata }: WithMetadata<LinkListProps>) {
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
    <Section id={id} metadata={metadata} style={style}>
      <div className="container link-list">
        <span aria-hidden="true" className="link-list__avatar">
          {logo ? <Photo fill media={logo} sizes="88px" /> : initials(name)}
        </span>
        {filled(title) && <Heading className="link-list__title">{title}</Heading>}
        {filled(text) && <p>{text}</p>}
        {links.length > 0 && (
          <ul className="link-list__links">
            {links.map((link, index) => (
              <li key={index}>
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
  columns,
  metadata,
}: Omit<WithMetadata<ColumnsProps>, 'column1' | 'column2' | 'column3'> & {
  columns: React.ReactNode[]
}) {
  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className={`container columns columns--${layout}`}>
        {columns.slice(0, COLUMN_COUNT[layout]).map((column, index) => (
          <div className="columns__column" key={index}>
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
export function RichText({ id, title, body, style, metadata }: WithMetadata<RichTextProps>) {
  if (!metadata.editing && !filled(title) && !filled(body)) return null
  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className="container rich-text">
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
  metadata,
}: WithMetadata<VideoProps>) {
  if (!videoId && !metadata.editing) return null
  const photo = getPhoto(metadata, cover)
  const coverPhoto = photo ? (
    <Photo fill media={photo} sizes="(max-width: 720px) 100vw, 860px" />
  ) : null

  return (
    <Section id={id} metadata={metadata} style={style}>
      <div className="container video">
        <SectionTitle title={title} />
        <figure>
          <div className="video__box">
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
