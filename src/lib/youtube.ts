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
