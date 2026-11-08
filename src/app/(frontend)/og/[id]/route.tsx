import { notFound } from 'next/navigation'

import {
  getPageByID,
  getPayloadClient,
  getSite,
  populatedMedia,
  readPageContent,
  relationID,
} from '@/lib/content'
import { bannerPhotoId, shareImageResponse } from '@/lib/shareImage'

// Imagem de compartilhar de uma página publicada (`/og/<id>`), feita com `next/og` quando nem a
// página nem as configurações têm uma foto escolhida (`generateMetadata` em `[[...slug]]`). O
// endereço "og" é reservado: nenhuma página pode usá-lo (`RESERVED_SLUGS`).

// Renovada ao publicar (`revalidatePath` do layout); uma vez por dia também, por segurança.
export const revalidate = 86400

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const [page, site] = await Promise.all([getPageByID(id), getSite()])
  if (!page) notFound()

  const photoId = bannerPhotoId(readPageContent(page))
  const payload = await getPayloadClient()
  const photo = photoId
    ? ((
        await payload.find({
          collection: 'media',
          where: { id: { equals: photoId } },
          depth: 0,
          limit: 1,
          pagination: false,
          overrideAccess: false,
        })
      ).docs[0] ?? null)
    : null

  return shareImageResponse({
    page,
    site,
    photo,
    logo: populatedMedia(site.logo),
    isHome: relationID(site.homepage) === page.id,
  })
}
