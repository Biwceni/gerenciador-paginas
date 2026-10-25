import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

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
