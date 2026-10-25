import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { resetPasswordEmailHTML, resetPasswordEmailSubject } from '../email/resetPassword'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Usuário',
    plural: 'Usuários',
  },
  access: {
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email'],
  },
  auth: {
    forgotPassword: {
      generateEmailHTML: resetPasswordEmailHTML,
      generateEmailSubject: resetPasswordEmailSubject,
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nome',
    },
  ],
}
