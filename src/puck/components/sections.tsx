import React from 'react'

import { Photo } from '@/components/site/Photo'

import { type ContentMetadata, getPhoto } from '../references'
import type { CallToActionProps, GalleryProps, HeroProps, TextImageProps } from '../schema'
import { SectionButton } from './Button'

// Desenho das seções conforme o protótipo (docs/prototipo/prototipo-meu-site.html).

type WithMetadata<P> = P & { metadata: ContentMetadata }

/** Parágrafos separados por linha em branco; quebra simples vira quebra de linha. */
function Paragraphs({ text }: { text: string }) {
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

/** Banner principal. No estilo "foto", a foto cobre o fundo, escurecida, com o texto em branco. */
export function Hero(props: WithMetadata<HeroProps>) {
  const { id, title, text, image, button, align, metadata } = props
  const photo = getPhoto(metadata, image)
  // Sem foto, o estilo "foto" vira fundo na cor principal, para o texto branco continuar legível.
  const style = props.style === 'image' && !photo ? 'brand' : props.style
  const isMain = metadata.mainHeadingId === id
  const Heading = isMain ? 'h1' : 'h2'

  return (
    <section
      className={`section section--${style} hero${align === 'center' ? ' hero--center' : ''}`}
    >
      {style === 'image' && photo && (
        <>
          <Photo className="hero__bg" fill media={photo} priority={isMain} sizes="100vw" />
          <div aria-hidden="true" className="hero__shade" />
        </>
      )}
      <div className="container hero__container">
        <div className="hero__inner">
          {title.trim() && <Heading className="hero__title">{title}</Heading>}
          {text.trim() && <p className="hero__text">{text}</p>}
          <SectionButton button={button} metadata={metadata} />
        </div>
      </div>
    </section>
  )
}

export function TextImage({
  title,
  text,
  image,
  side,
  style,
  metadata,
}: WithMetadata<TextImageProps>) {
  const photo = getPhoto(metadata, image)
  if (!title.trim() && !text.trim() && !photo) return null

  return (
    <section className={`section section--${style}`}>
      <div className={`container text-image${side === 'left' ? ' text-image--left' : ''}`}>
        <div className="text-image__text">
          {title.trim() && <h2>{title}</h2>}
          <Paragraphs text={text} />
        </div>
        {photo && (
          <div className="text-image__photo">
            <Photo fill media={photo} sizes="(max-width: 720px) 100vw, 540px" />
          </div>
        )}
      </div>
    </section>
  )
}

export function Gallery({ title, images, style, metadata }: WithMetadata<GalleryProps>) {
  // Fotos apagadas da biblioteca somem da galeria; sem nenhuma, a seção some.
  const photos = images.flatMap((ref) => getPhoto(metadata, ref) ?? [])
  if (!photos.length) return null

  return (
    <section className={`section section--${style}`}>
      <div className="container">
        {title.trim() && <h2 className="section-title">{title}</h2>}
        <ul className="gallery">
          {photos.map((photo, index) => (
            <li key={`${photo.id}-${index}`}>
              <Photo fill media={photo} sizes="(max-width: 720px) 50vw, 340px" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function CallToAction({
  title,
  text,
  button,
  style,
  metadata,
}: WithMetadata<CallToActionProps>) {
  return (
    <section className={`section section--${style}`}>
      <div className="container cta">
        {title.trim() && <h2>{title}</h2>}
        {text.trim() && <p>{text}</p>}
        <SectionButton button={button} metadata={metadata} />
      </div>
    </section>
  )
}
