import type { CollectionAfterOperationHook, CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { authenticated } from '../access/authenticated'
import { isAdmin, isAdminField, isAdminOrSelf } from '../access/users'
import { resetPasswordEmailHTML, resetPasswordEmailSubject } from '../email/resetPassword'

// O primeiro usuário do site vira administrador; os seguintes nascem como editor.
const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data

  const { totalDocs } = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
    req,
  })
  if (totalDocs === 0) data.role = 'admin'

  return data
}

// Sem nenhum administrador, ninguém mais cuida dos usuários e só dá para recuperar pelo banco.
// Confere depois da operação inteira, ainda dentro da transação: em lote, o Payload processa os
// documentos em paralelo e só guarda o erro de cada um, então uma checagem por documento deixaria
// passar "apagar os dois últimos administradores de uma vez". O erro aqui desfaz tudo.
const keepOneAdmin: CollectionAfterOperationHook<'users'> = async ({ operation, req, result }) => {
  if (!['delete', 'deleteByID', 'update', 'updateByID'].includes(operation)) return result

  const { totalDocs } = await req.payload.count({
    collection: 'users',
    where: { role: { equals: 'admin' } },
    overrideAccess: true,
    req,
  })
  if (totalDocs === 0) {
    throw new APIError(
      'O site precisa de pelo menos um administrador. Antes, transforme outra conta em administrador.',
      400,
      null,
      true,
    )
  }

  return result
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Usuário',
    plural: 'Usuários',
  },
  access: {
    admin: authenticated,
    create: isAdmin,
    delete: isAdmin,
    read: authenticated,
    update: isAdminOrSelf,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
  },
  auth: {
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
    // Já são os padrões do Payload; ficam explícitos para não mudarem sem a gente ver.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    forgotPassword: {
      generateEmailHTML: resetPasswordEmailHTML,
      generateEmailSubject: resetPasswordEmailSubject,
    },
  },
  hooks: {
    afterOperation: [keepOneAdmin],
    beforeChange: [firstUserIsAdmin],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nome',
    },
    {
      name: 'role',
      type: 'select',
      label: 'Tipo de acesso',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        description: 'Administradores também cuidam dos usuários. Editores cuidam do site.',
      },
    },
  ],
}
