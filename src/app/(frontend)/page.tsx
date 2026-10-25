import Image from 'next/image'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import './styles.css'

// Página provisória da fase 0: mostra as últimas fotos enviadas pelo painel.
// Na fase 1 ela dá lugar à página inicial escolhida nas configurações do site.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayload({ config })

  const { docs: photos } = await payload.find({
    collection: 'media',
    limit: 12,
    sort: '-createdAt',
    overrideAccess: false,
  })

  return (
    <div className="home">
      <h1>Seu site está em construção</h1>
      <p>
        <Link href="/admin">Entrar no painel</Link>
      </p>

      {photos.length > 0 ? (
        <ul className="photos">
          {photos.map((photo) =>
            photo.url ? (
              <li key={photo.id}>
                <Image
                  alt={photo.alt}
                  height={photo.height ?? 400}
                  sizes="(max-width: 600px) 100vw, 300px"
                  src={photo.url}
                  width={photo.width ?? 400}
                />
              </li>
            ) : null,
          )}
        </ul>
      ) : (
        <p>Nenhuma foto enviada ainda.</p>
      )}
    </div>
  )
}
