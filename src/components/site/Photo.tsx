import Image from 'next/image'
import React from 'react'

import type { Media } from '@/payload-types'

type Props = {
  media: Media
  sizes: string
  priority?: boolean
  className?: string
  /** Preenche o espaço do elemento pai (que precisa de `position: relative`). */
  fill?: boolean
}

/** Foto da biblioteca, com o texto alternativo dela e o ponto de foco escolhido no painel. */
export function Photo({ media, sizes, priority, className, fill }: Props) {
  if (!media.url) return null

  const objectPosition =
    media.focalX != null && media.focalY != null ? `${media.focalX}% ${media.focalY}%` : undefined

  return fill ? (
    <Image
      alt={media.alt}
      className={className}
      fill
      priority={priority}
      sizes={sizes}
      src={media.url}
      style={{ objectFit: 'cover', objectPosition }}
    />
  ) : (
    <Image
      alt={media.alt}
      className={className}
      height={media.height ?? 800}
      priority={priority}
      sizes={sizes}
      src={media.url}
      width={media.width ?? 1200}
    />
  )
}
