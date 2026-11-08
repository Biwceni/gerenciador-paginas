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
}

/** Foto da biblioteca, com o texto alternativo dela e o ponto de foco escolhido no painel. */
export function Photo({ media, sizes, priority, className, fill, alt: ownAlt }: Props) {
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

  return fill ? (
    <Image
      alt={alt}
      className={className}
      fill
      priority={priority}
      sizes={sizes}
      src={media.url}
      style={{ objectFit: 'cover', objectPosition }}
      unoptimized={unoptimized}
    />
  ) : (
    <Image
      alt={alt}
      className={className}
      height={media.height ?? 800}
      priority={priority}
      sizes={sizes}
      src={media.url}
      unoptimized={unoptimized}
      width={media.width ?? 1200}
    />
  )
}
