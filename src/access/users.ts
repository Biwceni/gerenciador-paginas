import type { Access, FieldAccess, PayloadRequest } from 'payload'

const isAdminUser = (req: PayloadRequest): boolean => req.user?.role === 'admin'

export const isAdmin = ({ req }: { req: PayloadRequest }): boolean => isAdminUser(req)

// Administrador mexe em todos; os demais só na própria conta.
export const isAdminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (isAdminUser(req)) return true
  return { id: { equals: req.user.id } }
}

export const isAdminField: FieldAccess = ({ req }) => isAdminUser(req)
