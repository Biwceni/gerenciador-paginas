import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import { authenticated } from '../access/authenticated'
import { cleanSavedName, SAVED_LIMIT, SAVED_NAME_MAX } from '../puck/savedSections'
import { packSection, unpackSection } from '../puck/sectionClipboard'

/**
 * A seção passa pela mesma conferência (e migração) de uma página salva, e o nome fica limpo. Ao
 * guardar uma nova, o limite de 30 por site vale aqui também, e não só na tela.
 */
const validateSaved: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (!data) return data
  if (data.name !== undefined) {
    const name = cleanSavedName(String(data.name ?? ''))
    if (!name) {
      throw new ValidationError({
        collection: 'saved-sections',
        errors: [{ path: 'name', message: 'Escreva um nome para a seção.' }],
        req,
      })
    }
    data.name = name
  }
  if (data.section !== undefined) {
    const item = unpackSection(data.section ? JSON.stringify(data.section) : null)
    if (!item) {
      throw new ValidationError({
        collection: 'saved-sections',
        errors: [
          { path: 'section', message: 'Esta seção não está num formato que dá para guardar.' },
        ],
        req,
      })
    }
    data.section = JSON.parse(packSection(item))
  }
  if (operation === 'create') {
    const { totalDocs } = await req.payload.count({ collection: 'saved-sections', req })
    if (totalDocs >= SAVED_LIMIT) {
      throw new ValidationError({
        collection: 'saved-sections',
        errors: [
          {
            path: 'name',
            message: `Você já tem ${SAVED_LIMIT} seções guardadas. Apague uma para guardar outra.`,
          },
        ],
        req,
      })
    }
  }
  return data
}

/**
 * "Minhas seções" (Elementor, E2): seções guardadas no editor para usar de novo em qualquer página
 * e aparelho. Cada uma é uma cópia, sem ligação com a seção de onde saiu. Só o editor usa: a
 * coleção não aparece no menu do Payload.
 */
export const SavedSections: CollectionConfig = {
  slug: 'saved-sections',
  labels: { singular: 'Seção guardada', plural: 'Seções guardadas' },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: { hidden: true, useAsTitle: 'name' },
  defaultSort: '-updatedAt',
  hooks: { beforeValidate: [validateSaved] },
  fields: [
    { name: 'name', type: 'text', label: 'Nome', required: true, maxLength: SAVED_NAME_MAX },
    { name: 'section', type: 'json', label: 'Seção', required: true },
  ],
}
