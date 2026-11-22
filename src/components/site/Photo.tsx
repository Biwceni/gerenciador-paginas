import Image from 'next/image'
import React from 'react'

import { isTemplatePhotoURL } from '@/lib/templates'
import type { Media } from '@/payload-types'

type Props = {
  media: Media
  sizes: string
  priority?: boolean
  className?: string
  /** Preenche o espaço do elemento pai (que precisa de `position: relative`). */
  fill?: boolean
  /** No lugar da descrição da foto: `""` quando o texto ao lado já diz o que ela mostra. */
  alt?: string
  /**
   * Como a foto ocupa o espaço (C2): `cover` preenche (pode cortar, no ponto de foco) e `contain`
   * mostra a foto inteira, com o fundo `backdrop` nas sobras.
   */
  fit?: 'cover' | 'contain'
  backdrop?: 'neutral' | 'brand' | 'none'
}

/** Cor atrás da foto inteira: neutra do visual, a cor do site ou nenhuma. */
const BACKDROPS = {
  neutral: 'var(--color-surface)',
  brand: 'var(--color-primary)',
  none: 'transparent',
} as const

/** Foto da biblioteca, com o texto alternativo dela e o ponto de foco escolhido no painel. */
export function Photo({
  media,
  sizes,
  priority,
  className,
  fill,
  alt: ownAlt,
  fit,
  backdrop,
}: Props) {
  if (!media.url) return null

  // Sem descrição: `alt=""`, e o leitor de tela pula a foto em vez de ler o nome do arquivo.
  const alt = ownAlt ?? media.alt ?? ''

  // Foto de um modelo ainda no banco de fotos (só nas prévias do início guiado) ou guardada no
  // próprio servidor (sem o Storage configurado, só no computador e nos testes): vai direto, sem o
  // otimizador de imagens do site, que só aceita o nosso Storage.
  // A ilustração das prévias dos modelos (`lib/illustration.ts`) é um desenho `data:`, também direto.
  const unoptimized =
    isTemplatePhotoURL(media.url) ||
    media.url.includes('/api/media/file/') ||
    media.url.startsWith('data:')
  const objectPosition =
    media.focalX != null && media.focalY != null ? `${media.focalX}% ${media.focalY}%` : undefined
  // Foto inteira: sem corte, centrada, com o fundo escolhido nas sobras (o fundo do próprio `<img>`
  // aparece em volta da foto com `object-fit: contain`).
  const whole: React.CSSProperties | undefined =
    fit === 'contain'
      ? {
          objectFit: 'contain',
          objectPosition: 'center',
          backgroundColor: BACKDROPS[backdrop ?? 'neutral'],
        }
      : undefined

  return fill ? (
    <Image
      alt={alt}
      className={className}
      data-fit={fit === 'contain' ? 'contain' : undefined}
      data-media-id={media.id}
      fill
      priority={priority}
      sizes={sizes}
      src={media.url}
      style={whole ?? { objectFit: 'cover', objectPosition }}
      unoptimized={unoptimized}
    />
  ) : (
    <Image
      alt={alt}
      className={className}
      data-fit={fit === 'contain' ? 'contain' : undefined}
      data-media-id={media.id}
      height={media.height ?? 800}
      priority={priority}
      sizes={sizes}
      src={media.url}
      // Fotos cortadas pelo CSS (object-fit: cover) também centram no ponto de foco (A4).
      style={whole ?? (objectPosition ? { objectPosition } : undefined)}
      unoptimized={unoptimized}
      width={media.width ?? 1200}
    />
  )
}
