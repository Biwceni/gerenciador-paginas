import type { Access } from 'payload'

// Visitante vê só o que está publicado; quem está logado vê também os rascunhos.
export const publishedOrAuthenticated: Access = ({ req: { user } }) =>
  user ? true : { _status: { equals: 'published' } }
