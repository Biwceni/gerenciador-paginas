import { ImageResponse } from 'next/og'
import sharp from 'sharp'

import { safeColor, readableTextColor } from './colors'
import { getSite, populatedMedia } from './content'
import { siteInitials } from './initials'
import { FALLBACK_SITE_NAME, getServerURL } from './site'
import { DEFAULT_COLORS } from './theme'

/**
 * O logo das configurações num quadrado, inteiro, sobre a cor de fundo do site (um logo largo, com o
 * nome por extenso, não perde as pontas). Em PNG; nada se não der.
 */
async function logoIcon(url: string, size: number, background: string): Promise<Buffer | null> {
  try {
    const response = await fetch(new URL(url, getServerURL()), {
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return null
    const file = Buffer.from(await response.arrayBuffer())
    return await sharp(file).resize(size, size, { fit: 'contain', background }).png().toBuffer()
  } catch {
    return null
  }
}

/**
 * Ícone do site (aba do navegador e tela inicial do celular), no tamanho pedido. Usa o logo das
 * configurações publicadas; sem logo, as iniciais do nome sobre a cor principal. É renovado junto
 * com o resto do site ao publicar (`revalidatePath` em `src/hooks/revalidate.ts`).
 */
export async function siteIconResponse(size: number): Promise<Response> {
  const site = await getSite()
  const logo = populatedMedia(site.logo)
  const backdrop = safeColor(site.colors?.background, DEFAULT_COLORS.background)
  const png = logo?.url ? await logoIcon(logo.url, size, backdrop) : null
  if (png) {
    return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } })
  }

  const background = safeColor(site.colors?.primary, DEFAULT_COLORS.primary)
  const initials = siteInitials(site.name || FALLBACK_SITE_NAME)
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background,
        color: readableTextColor(background),
        borderRadius: size * 0.2,
        fontSize: size * (initials.length > 1 ? 0.46 : 0.6),
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}
    >
      {initials}
    </div>,
    { width: size, height: size },
  )
}
