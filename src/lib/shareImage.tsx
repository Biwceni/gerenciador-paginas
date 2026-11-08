import { ImageResponse } from 'next/og'
import sharp, { type Sharp } from 'sharp'

import { brandShades } from '../components/site/theme'
import type { Media, Page, Site } from '../payload-types'
import type { PuckPageData } from '../puck/schema'
import { firstPhotoId, firstSentence } from '../puck/seo'
import { hexToRgb } from './brand'
import { readableTextColor, safeColor } from './colors'
import { pageTitle } from './pageTitle'
import { FALLBACK_SITE_NAME, getServerURL } from './site'
import { DEFAULT_COLORS, FONT_NAME_PATTERN } from './theme'

// Imagem de compartilhar automática (redesign v3, entrega 3): quando nem a página nem as
// configurações têm uma foto escolhida, o WhatsApp e as redes mostram esta, feita na hora com a foto
// do banner, o título da página na letra dos títulos e o logo no canto, nas cores do site.

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const

const rgba = (hex: string, alpha: number) => `rgba(${hexToRgb(hex).join(', ')}, ${alpha})`

/** Endereço da imagem gerada. `v` muda a cada publicação, para o WhatsApp não guardar a antiga. */
export function shareImagePath(pageId: number, version?: string | null): string {
  const stamp = version ? new Date(version).getTime() : NaN
  return Number.isFinite(stamp) ? `/og/${pageId}?v=${stamp.toString(36)}` : `/og/${pageId}`
}

/** A foto do banner da página (o primeiro banner com foto) ou, sem banner, a primeira foto. */
export function bannerPhotoId(data: PuckPageData): number | null {
  for (const item of data.content) {
    if (item.type === 'Hero' && item.props.image?.mediaId) return item.props.image.mediaId
  }
  return firstPhotoId(data)
}

/** Tamanho da letra do título: cabe em até três linhas na imagem. */
export function shareTitleSize(title: string): number {
  const length = title.length
  if (length <= 24) return 76
  if (length <= 44) return 64
  if (length <= 70) return 52
  return 44
}

/**
 * O endereço do arquivo da fonte no CSS do Google. Sem dizer qual é o navegador, o Google entrega
 * TTF, o formato que o gerador de imagem lê (ele não lê woff2).
 */
export function fontFileURL(css: string): string | null {
  return /src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)\s]+)\)/.exec(css)?.[1] ?? null
}

/** A letra dos títulos, só com as letras do texto. `null` quando não der (a imagem usa a padrão). */
async function loadHeadingFont(name: string, text: string): Promise<ArrayBuffer | null> {
  if (!FONT_NAME_PATTERN.test(name)) return null
  const family = name.replace(/ /g, '+')
  const subset = encodeURIComponent([...new Set(text)].join(''))
  for (const query of [`${family}:wght@600`, `${family}:wght@700`, family]) {
    try {
      const response = await fetch(
        `https://fonts.googleapis.com/css2?family=${query}&text=${subset}`,
        { signal: AbortSignal.timeout(6_000) },
      )
      if (!response.ok) continue
      const url = fontFileURL(await response.text())
      if (!url) continue
      const file = await fetch(url, { signal: AbortSignal.timeout(6_000) })
      if (file.ok) return file.arrayBuffer()
    } catch {
      return null
    }
  }
  return null
}

/** Uma foto da biblioteca já no tamanho pedido, como `data:` (o gerador não busca nada sozinho). */
async function photoDataURL(
  media: Media,
  resize: (image: Sharp) => Sharp,
  format: 'jpeg' | 'png',
): Promise<string | null> {
  const url = media.sizes?.medium?.url || media.url
  if (!url) return null
  try {
    const response = await fetch(new URL(url, getServerURL()), {
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return null
    const image = resize(sharp(Buffer.from(await response.arrayBuffer())))
    const buffer =
      format === 'jpeg'
        ? await image.jpeg({ quality: 82 }).toBuffer()
        : await image.png().toBuffer()
    return `data:image/${format};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

type Input = {
  page: Pick<Page, 'title'>
  /** Página inicial: "Início" diz pouco no WhatsApp; vale a frase do site (ou o nome). */
  isHome?: boolean
  site: Partial<Site>
  photo: Media | null
  logo: Media | null
}

/** A imagem de 1.200 × 630 de uma página. */
export async function shareImageResponse({
  page,
  site,
  photo,
  logo,
  isHome,
}: Input): Promise<Response> {
  const { width, height } = SHARE_IMAGE_SIZE
  // Sempre na forma composta ("í" numa letra só): com o acento solto, ele sai deslocado na imagem.
  const name = (site.name || FALLBACK_SITE_NAME).normalize('NFC')
  const title = (isHome ? firstSentence(site.tagline) || name : pageTitle(page.title)).normalize(
    'NFC',
  )
  const background = safeColor(site.colors?.background, DEFAULT_COLORS.background)
  const primary = safeColor(site.colors?.primary, DEFAULT_COLORS.primary)
  const text = safeColor(site.colors?.text, DEFAULT_COLORS.text)
  const { deep, onDeep } = brandShades(site.colors)
  const headingFont = site.fonts?.headings || site.fonts?.body || ''

  const [photoURL, logoURL, font] = await Promise.all([
    photo
      ? photoDataURL(photo, (image) => image.resize(width, height, { fit: 'cover' }), 'jpeg')
      : null,
    logo
      ? photoDataURL(
          logo,
          (image) => image.resize(150, 150, { fit: 'inside', withoutEnlargement: false }),
          'png',
        )
      : null,
    headingFont ? loadHeadingFont(headingFont, `${title}${name}`) : null,
  ])

  // Com foto: a foto inteira escurecida com o tom escuro do site, título claro. Sem foto: o fundo
  // do site, uma faixa da cor principal e o título na cor do texto.
  const ink = photoURL ? onDeep : text
  const fontFamily = font ? 'Titulo' : undefined

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: '100%',
        height: '100%',
        background: photoURL ? deep : background,
        color: ink,
      }}
    >
      {photoURL && (
        <img
          alt=""
          height={height}
          src={photoURL}
          style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
          width={width}
        />
      )}
      {photoURL && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            background: `linear-gradient(90deg, ${rgba(deep, 0.95)} 0%, ${rgba(deep, 0.8)} 55%, ${rgba(deep, 0.4)} 100%)`,
          }}
        />
      )}
      {!photoURL && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 24,
            background: primary,
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '64px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {logoURL && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 104,
                height: 104,
                borderRadius: 20,
                background,
                padding: 12,
              }}
            >
              <img alt="" height={80} src={logoURL} style={{ objectFit: 'contain' }} width={80} />
            </div>
          )}
          <span style={{ fontSize: 30, fontWeight: 600, opacity: 0.9 }}>{name}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960 }}>
          <span
            style={{
              fontFamily,
              fontSize: shareTitleSize(title),
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </span>
          <div
            style={{
              display: 'flex',
              width: 120,
              height: 10,
              borderRadius: 5,
              background: photoURL ? readableTextColor(deep) : primary,
              opacity: photoURL ? 0.7 : 1,
            }}
          />
        </div>
      </div>
    </div>,
    {
      width,
      height,
      fonts: font ? [{ name: 'Titulo', data: font, weight: 600, style: 'normal' }] : undefined,
    },
  )
}
