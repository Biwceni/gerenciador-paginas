import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import { authenticated } from '../access/authenticated'
import {
  cleanFolderName,
  FOLDER_NAME_MAX,
  FOLDERS_MAX,
  folderNameTaken,
  type PhotoFolder,
} from '../lib/photoLibrary'

/** Nome limpo, sem repetir o de outra pasta, e no máximo `FOLDERS_MAX` pastas. */
const checkFolder: CollectionBeforeValidateHook = async ({ data, operation, originalDoc, req }) => {
  if (!data) return data
  const fail = (message: string) => {
    throw new ValidationError({
      collection: 'photo-folders',
      errors: [{ path: 'name', message }],
      req,
    })
  }
  if (data.name !== undefined || operation === 'create') {
    const name = cleanFolderName(String(data.name ?? ''))
    if (!name) fail('Escreva um nome para a pasta.')
    const { docs } = await req.payload.find({
      collection: 'photo-folders',
      depth: 0,
      limit: FOLDERS_MAX + 1,
      pagination: false,
      req,
    })
    if (folderNameTaken(name, docs as PhotoFolder[], originalDoc?.id)) {
      fail(`Já existe uma pasta chamada “${name}”.`)
    }
    if (operation === 'create' && docs.length >= FOLDERS_MAX) {
      fail(`O máximo é ${FOLDERS_MAX} pastas. Apague uma que não usa mais.`)
    }
    data.name = name
  }
  return data
}

/**
 * Pastas da biblioteca de fotos (C6). Só organizam a tela Fotos e o seletor do editor: o site não
 * as vê. Apagar a pasta não apaga as fotos; elas voltam para "Sem pasta" (o banco solta a ligação).
 */
export const PhotoFolders: CollectionConfig = {
  slug: 'photo-folders',
  labels: { singular: 'Pasta de fotos', plural: 'Pastas de fotos' },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: 'Site',
    hidden: true,
    useAsTitle: 'name',
  },
  defaultSort: 'name',
  hooks: { beforeValidate: [checkFolder] },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nome da pasta',
      required: true,
      maxLength: FOLDER_NAME_MAX,
    },
  ],
}
