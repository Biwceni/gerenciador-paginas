import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access/authenticated'
import { protectPhotoDelete } from '../hooks/protectPhoto'
import { revalidateOnChange, revalidateOnDelete } from '../hooks/revalidate'

// Trocar o arquivo pela tela Fotos ("Trocar em todo o site"): a foto passa a ser da pessoa, deixa de
// ser foto de exemplo, e aplicar o modelo de novo não pode reaproveitar esta como se fosse a dele.
const forgetTemplateSource: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'update' && req.file) data.sourceUrl = null
  return data
}

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
    beforeChange: [forgetTemplateSource],
    beforeDelete: [protectPhotoDelete],
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
    {
      // Endereço de onde a foto de um modelo foi copiada (fase 4): aplicar o modelo de novo, ou
      // criar outra página com ele, usa a mesma foto em vez de copiar outra vez.
      // Só a rotina dos modelos (com `overrideAccess`) escreve; pela API o campo é recusado.
      name: 'sourceUrl',
      type: 'text',
      index: true,
      access: {
        create: () => false,
        update: () => false,
      },
      admin: { hidden: true },
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
