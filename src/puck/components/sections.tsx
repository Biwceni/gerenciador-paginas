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
import { instagramLink } from '@/lib/links'
import { privacyBlocks } from '@/lib/privacy'
import { splitHighlight } from '@/lib/highlight'
import { initials } from '@/lib/site'

import { announcementRun, testimonialColumns, whatsAppMessageHref } from '../layout'
import { type ContentMetadata, getHref, getPhoto } from '../references'
import { COLUMN_COUNT, INSTAGRAM_MIN_PHOTOS } from '../schema'
import type {
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
  LinkListProps,
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
    // Frase longa no título: tamanho menor que o de uma ou duas palavras, para não ocupar a tela.
    filled(title) && title.trim().length > 20 && 'hero--long',
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
          {photoSlot && props.style === 'image' && (
            <div className="hero__slot">
              <EditorPlaceholder>
                Escolha uma foto sua para o fundo, nas opções da seção
              </EditorPlaceholder>
            </div>
          )}
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
        {style === 'side' && photoSlot && (
          <div className="hero__photo anim-part">
            <EditorPlaceholder>Escolha uma foto sua nas opções da seção</EditorPlaceholder>
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
  // Sem foto no site, o texto fica no centro, na largura de leitura (e não meia tela vazia). No
  // editor continua o aviso "Escolha uma foto" no lugar dela.
  const solo = !photo && !metadata.editing
  const classes = [
    'container text-image anim-part',
    side === 'left' && 'text-image--left',
    solo && 'text-image--solo',
  ]

  return (
    <Section
      anim={sectionAnim('TextImage', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className={classes.filter(Boolean).join(' ')}>
        <div className="text-image__text anim-part">
          {filled(title) && <h2>{title}</h2>}
          <Paragraphs text={text} />
        </div>
        {(photo || metadata.editing) && (
          <div className="text-image__photo anim-part">
            {photo ? (
              <Photo fill media={photo} sizes="(max-width: 720px) 100vw, 540px" />
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
 * Destaques, até três por linha, sem caixa. Marcador: nenhum (padrão), um ícone por item, números
 * (passo a passo, e só então uma lista numerada) ou uma foto pequena e redonda (entrega 4).
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
              {marker === 'photo' && <FeaturePhoto metadata={metadata} photo={item.photo} />}
              {filled(item.title) && <h3>{item.title}</h3>}
              <Paragraphs text={item.text} />
            </li>
          ))}
        </List>
      </div>
    </Section>
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
        <Photo alt="" fill media={media} sizes="72px" />
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

  return (
    <Section
      anim={sectionAnim('Testimonials', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionTitle title={title} />
        {/* 3 depoimentos em 3 colunas; 4 em 2 + 2; a última linha estica (nada fica sozinho). */}
        <ul
          className="testimonials"
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

export function Gallery({
  id,
  title,
  images,
  layout = 'grid',
  showCaptions = false,
  style,
  anim,
  metadata,
}: WithMetadata<GalleryProps>) {
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

// Seções novas da entrega 4 (redesign v3): para vender.

/** Título e frase de abertura da seção. Nas personalidades novas, lado a lado quando cabe. */
function SectionHead({
  title,
  text,
  aside,
}: {
  title: React.ReactNode
  text?: React.ReactNode
  aside?: React.ReactNode
}) {
  if (!filled(title) && !filled(text) && !aside) return null
  return (
    <div className="section-head anim-part">
      <div className="section-head__text">
        {filled(title) && <h2 className="section-title">{title}</h2>}
        {filled(text) && <p className="section-lead">{text}</p>}
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

/** Tamanho da foto do produto em cada arrumação, para o navegador baixar a medida certa. */
const PRODUCT_PHOTO_SIZES = {
  three: '(max-width: 460px) 100vw, (max-width: 720px) 50vw, 380px',
  two: '(max-width: 720px) 100vw, 560px',
  list: '120px',
} as const

/**
 * Vitrine de produtos: foto (4:5), nome, frase curta, preço opcional e um botão por produto. Produto
 * sem foto ou sem nome não aparece no site (o Publicar avisa); no editor, aparece com o aviso.
 */
export function Products({
  id,
  title,
  text = '',
  layout = 'three',
  items,
  style = 'light',
  anim,
  metadata,
}: WithMetadata<ProductsProps>) {
  const shown = metadata.editing
    ? items
    : items.filter((item) => getPhoto(metadata, item.image ?? null) && filled(item.name))
  if (!shown.length) return null

  return (
    <Section
      anim={sectionAnim('Products', anim, metadata)}
      id={id}
      metadata={metadata}
      style={style}
    >
      <div className="container anim-part">
        <SectionHead text={text} title={title} />
        <ul className={`products products--${layout}`} data-count={shown.length}>
          {shown.map((item, index) => {
            const photo = getPhoto(metadata, item.image ?? null)
            const href = metadata.editing ? null : productHref(item, metadata)
            const label = item.button?.label
            return (
              <li className="product anim-part" key={index} style={order(index)}>
                <div className="product__photo">
                  {photo ? (
                    <Photo
                      className="anim-part"
                      fill
                      media={photo}
                      sizes={PRODUCT_PHOTO_SIZES[layout]}
                    />
                  ) : (
                    <EditorPlaceholder>Escolha uma foto sua do produto</EditorPlaceholder>
                  )}
                </div>
                <div className="product__body">
                  {filled(item.name) && <h3 className="product__name">{item.name}</h3>}
                  {filled(item.text) && <p className="product__text">{item.text}</p>}
                  {filled(item.price) && <p className="product__price">{item.price}</p>}
                  {metadata.editing
                    ? item.button && <span className="product__link">{label}</span>
                    : href &&
                      typeof label === 'string' &&
                      label.trim() && (
                        <SiteLink className="product__link" href={href}>
                          {label}
                          {/* Os botões repetem o texto: o nome do produto diz qual é qual. */}
                          {typeof item.name === 'string' && (
                            <span className="visually-hidden">: {item.name}</span>
                          )}
                          <span aria-hidden="true" className="product__arrow">
                            →
                          </span>
                        </SiteLink>
                      )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
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
          {shown.map((group, groupIndex) => {
            const photo = getPhoto(metadata, group.image ?? null)
            return (
              <div className={`price-group${photo ? ' price-group--photo' : ''}`} key={groupIndex}>
                {photo && (
                  <div className="price-group__photo anim-part">
                    <Photo fill media={photo} sizes="(max-width: 720px) 100vw, 320px" />
                  </div>
                )}
                <div className="price-group__body">
                  {filled(group.name) && (
                    <h3 className="price-group__name anim-part">{group.name}</h3>
                  )}
                  <ul className="price-group__items">
                    {group.items.map((item, index) => (
                      <li className="price-item anim-part" key={index} style={order(index)}>
                        <span className="price-item__name">{item.name}</span>
                        <span aria-hidden="true" className="price-item__leader" />
                        <span className="price-item__price">{item.price}</span>
                        {filled(item.description) && (
                          <span className="price-item__description">{item.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}

/**
 * Faixa de aviso: até 5 frases curtas. "Correndo": a faixa corre sem parar e para com o mouse em
 * cima, com o foco ou no botão de parar; quem pediu menos movimento a vê parada (tudo CSS, funciona
 * sem JavaScript). O leitor de tela lê o aviso inteiro uma vez (`aria-label`); a trilha repetida
 * fica escondida dele. "Parada": as frases lado a lado, no centro. No editor, sempre parada.
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
  const classes = ['announce', `announce--${style}`, `announce--${moving ? 'move' : 'static'}`]

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

  if (!moving) {
    return (
      <div className={classes.join(' ')}>
        <div className="container">{still}</div>
      </div>
    )
  }

  const plain = texts.map((text) => String(text).replace(/\s+/g, ' ').trim())
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

  return (
    <div className={classes.join(' ')}>
      <div aria-label={`Aviso: ${plain.join('. ')}`} className="announce__note" role="note">
        {still}
        <div aria-hidden="true" className="announce__track" style={duration}>
          {half(1)}
          {half(2)}
        </div>
      </div>
      {/* Parar a faixa: uma caixa de marcar, para funcionar com o teclado e sem JavaScript. */}
      <label className="announce__pause">
        <input className="announce__toggle" type="checkbox" />
        <svg
          aria-hidden="true"
          className="announce__icon announce__icon--pause"
          height="16"
          viewBox="0 0 24 24"
          width="16"
        >
          <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
        </svg>
        <svg
          aria-hidden="true"
          className="announce__icon announce__icon--play"
          height="16"
          viewBox="0 0 24 24"
          width="16"
        >
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
        <span className="visually-hidden">Parar a faixa de aviso</span>
      </label>
    </div>
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
    desktop: count <= 6 ? Math.max(count, 1) : 4,
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
        <SectionHead aside={follow} text={profile?.label} title={title} />
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
