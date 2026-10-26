'use client'

import React, { useState } from 'react'

import { youtubeEmbedURL } from '@/lib/youtube'

type Props = {
  videoId: string
  title: string
  /** Foto de capa, já desenhada; sem ela, o fundo fica na cor do site. */
  cover: React.ReactNode
}

/**
 * Capa com botão de play. O YouTube só é carregado depois do clique: antes disso, nada do Google
 * chega a quem visita (mesma ideia das fontes copiadas para o nosso Storage).
 */
export function VideoPlayer({ videoId, title, cover }: Props) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <iframe
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="video__frame"
        referrerPolicy="strict-origin-when-cross-origin"
        src={youtubeEmbedURL(videoId)}
        title={title || 'Vídeo do YouTube'}
      />
    )
  }

  return (
    <button className="video__cover" onClick={() => setPlaying(true)} type="button">
      {cover}
      <span aria-hidden="true" className="video__play">
        <svg fill="currentColor" height="28" viewBox="0 0 24 24" width="28">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
      <span className="visually-hidden">Assistir {title ? `ao vídeo "${title}"` : 'ao vídeo'}</span>
    </button>
  )
}
