import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access/authenticated'
import { revalidateOnChange, revalidateOnDelete } from '../hooks/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Foto',
    plural: 'Fotos',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    group: 'Site',
    useAsTitle: 'alt',
  },
  // A foto e o texto alternativo aparecem nas páginas já publicadas.
  hooks: {
    afterChange: [revalidateOnChange],
    afterDelete: [revalidateOnDelete],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Texto alternativo',
      required: true,
      admin: {
        description:
          'Descreva a foto em poucas palavras, como se contasse para alguém que não pode vê-la. Ex.: "Xícara de café sobre a mesa de madeira".',
      },
    },
  ],
  upload: {
    // Lista fechada: `image/*` aceitaria SVG, que pode carregar script e fica público no bucket.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 400 },
      { name: 'medium', width: 1200 },
    ],
  },
}
