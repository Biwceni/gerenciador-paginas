// Só o código do vídeo é guardado (11 letras); o endereço do player é montado pelo site.
export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']

/**
 * Código do vídeo a partir do endereço colado pelo cliente. Aceita `youtube.com/watch?v=`,
 * `youtu.be/`, `/shorts/`, `/embed/` e `/live/`. Devolve `null` se não for um vídeo do YouTube.
 */
export function youtubeID(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  if (YOUTUBE_ID.test(trimmed)) return trimmed
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  if (!YOUTUBE_HOSTS.includes(url.hostname.toLowerCase())) return null

  const [first, second] = url.pathname.split('/').filter(Boolean)
  const id =
    url.hostname === 'youtu.be'
      ? first
      : first === 'watch'
        ? url.searchParams.get('v')
        : ['shorts', 'embed', 'live'].includes(first ?? '')
          ? second
          : null
  return id && YOUTUBE_ID.test(id) ? id : null
}

/** Player sem cookies, que só é carregado quando o visitante clica em play. */
export function youtubeEmbedURL(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
}

/** Miniatura do vídeo (480x360), para a capa automática. Sempre pelo otimizador de imagens. */
export function youtubeThumbURL(id: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`
}

// Vimeo (V1, decisões de 2026-11-15). Guardado no mesmo campo, como `vimeo:<número>` ou, nos vídeos
// "não listados", `vimeo:<número>:<código>`. Assim páginas de antes continuam valendo como estão.

/** Vídeo do Vimeo guardado. */
export const VIMEO_KEY = /^vimeo:\d{1,12}(?::[0-9a-f]{6,20})?$/

const VIMEO_HOSTS = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']

export type VideoRef =
  { provider: 'youtube'; id: string } | { provider: 'vimeo'; id: string; hash: string | null }

/** O que fica guardado no campo do vídeo. */
export function videoKey(video: VideoRef): string {
  if (video.provider === 'youtube') return video.id
  return video.hash ? `vimeo:${video.id}:${video.hash}` : `vimeo:${video.id}`
}

/** O vídeo de um endereço do Vimeo (`vimeo.com/123`, `vimeo.com/123/abc`, o player, canais). */
function vimeoFromURL(url: URL): VideoRef | null {
  if (!VIMEO_HOSTS.includes(url.hostname.toLowerCase())) return null
  const parts = url.pathname.split('/').filter(Boolean)
  // O número do vídeo é a última parte só de números; o código (não listado) vem logo depois.
  let at = -1
  parts.forEach((part, index) => {
    if (/^\d{1,12}$/.test(part)) at = index
  })
  if (at < 0) return null
  const after = parts[at + 1]
  const hash = url.searchParams.get('h') ?? (after && /^[0-9a-f]{6,20}$/.test(after) ? after : null)
  return {
    provider: 'vimeo',
    id: parts[at],
    hash: hash && /^[0-9a-f]{6,20}$/.test(hash) ? hash : null,
  }
}

/** O vídeo de um endereço colado (YouTube ou Vimeo) ou de um valor já guardado. */
export function parseVideo(value: string | null | undefined): VideoRef | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null
  if (VIMEO_KEY.test(trimmed)) {
    const [, id, hash] = trimmed.split(':')
    return { provider: 'vimeo', id, hash: hash ?? null }
  }
  const youtube = youtubeID(trimmed)
  if (youtube) return { provider: 'youtube', id: youtube }
  try {
    return vimeoFromURL(new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`))
  } catch {
    return null
  }
}

/** Endereço para a pessoa conferir no campo (o que ela colaria). */
export function videoPageURL(video: VideoRef): string {
  if (video.provider === 'youtube') return `https://youtu.be/${video.id}`
  return `https://vimeo.com/${video.id}${video.hash ? `/${video.hash}` : ''}`
}

/** Player carregado só depois do clique. O do Vimeo vai com `dnt=1` (sem rastrear quem assiste). */
export function videoEmbedURL(video: VideoRef): string {
  if (video.provider === 'youtube') return youtubeEmbedURL(video.id)
  const hash = video.hash ? `&h=${video.hash}` : ''
  return `https://player.vimeo.com/video/${video.id}?autoplay=1&dnt=1${hash}`
}

/** Endereço do oEmbed, que diz o nome e a capa do vídeo (só no editor, para conferir). */
export function videoOEmbedURL(video: VideoRef): string {
  const url = encodeURIComponent(videoPageURL(video))
  return video.provider === 'youtube'
    ? `https://www.youtube.com/oembed?format=json&url=${url}`
    : `https://vimeo.com/api/oembed.json?url=${url}`
}
