import type { Access, PayloadRequest } from 'payload'

// Tipado como boolean para servir também em `access.admin`, que não aceita filtros.
export const authenticated = ({ req: { user } }: { req: PayloadRequest }): boolean => Boolean(user)

export const anyone: Access = () => true
