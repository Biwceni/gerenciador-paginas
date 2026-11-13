'use client'

import { PAGE_VERSION_HEADER } from '@/lib/editor'
import type { Header, Media, Page } from '@/payload-types'
import type { PageContent } from '@/puck/schema'

// Conversa do editor com a API do Payload. A sessão vai pelo cookie do painel, e as permissões
// são conferidas no servidor como em qualquer outra tela.

type PayloadError = {
  errors?: { message?: string; data?: { errors?: { message?: string; path?: string }[] } }[]
}

/** Endereço que já é de outra página: o Payload só diz "Valor deve ser único" (achado 10.2). */
const SLUG_TAKEN =
  'esse endereço já é de outra página. Troque o endereço em "Página e Google" e publique de novo.'

/** Erro da API com o status, para quem precisa separar uma recusa (ex.: 409, conflito) das outras. */
export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/** Sem resposta do servidor (sem internet, servidor fora do ar): status 0. */
export const OFFLINE = 0

export async function request<T>(apiRoute: string, path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiRoute}${path}`, {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    // O navegador só diz "Failed to fetch": em português, e com o status que separa este caso.
    throw new RequestError('sem conexão com a internet', OFFLINE)
  }
  const body = (await response.json().catch(() => ({}))) as T & PayloadError
  if (!response.ok) {
    const error = body.errors?.[0]
    const field = error?.data?.errors?.[0]
    const detail =
      field?.path === 'slug' && /únic|unique/i.test(field.message ?? '')
        ? SLUG_TAKEN
        : field?.message
    throw new RequestError(detail || error?.message || `Erro ${response.status}`, response.status)
  }
  return body
}

type DocResponse<T> = { doc: T }

/**
 * Salva o rascunho. Com `autosave`, o Payload atualiza o mesmo rascunho em vez de criar versões.
 * `baseUpdatedAt` é a data da versão em que o editor está trabalhando: se a página tiver mudado
 * depois dela, o servidor recusa com 409. A data nova vem na resposta (`doc.updatedAt`).
 */
export function saveDraft(
  apiRoute: string,
  pageId: number,
  data: Partial<Page>,
  baseUpdatedAt: string,
) {
  return request<DocResponse<Page>>(apiRoute, `/pages/${pageId}?draft=true&autosave=true`, {
    method: 'PATCH',
    headers: { [PAGE_VERSION_HEADER]: baseUpdatedAt },
    body: JSON.stringify(data),
  })
}

export function publishPage(
  apiRoute: string,
  pageId: number,
  content: PageContent,
  baseUpdatedAt: string,
) {
  return request<DocResponse<Page>>(apiRoute, `/pages/${pageId}`, {
    method: 'PATCH',
    headers: { [PAGE_VERSION_HEADER]: baseUpdatedAt },
    body: JSON.stringify({ content, _status: 'published' }),
  })
}

export type PageVersion = {
  id: string
  createdAt: string
  updatedAt: string
  version: Pick<Page, 'title' | 'content' | '_status'>
}

/** Versões publicadas da página, da mais nova para a mais antiga. */
export async function listPublishedVersions(apiRoute: string, pageId: number) {
  const query = new URLSearchParams({
    'where[parent][equals]': String(pageId),
    'where[version._status][equals]': 'published',
    sort: '-updatedAt',
    limit: '30',
    depth: '0',
  })
  const result = await request<{ docs: PageVersion[] }>(apiRoute, `/pages/versions?${query}`)
  return result.docs
}

export function updatePhotoAlt(apiRoute: string, mediaId: number, alt: string) {
  return request<DocResponse<Media>>(apiRoute, `/media/${mediaId}`, {
    method: 'PATCH',
    body: JSON.stringify({ alt }),
  })
}

export function getHeader(apiRoute: string, draft: boolean) {
  return request<Header>(apiRoute, `/globals/header?depth=0&draft=${draft}`)
}

/** Publica o cabeçalho com o menu novo (usado por "Colocar no menu", ao publicar uma página). */
export function publishHeaderItems(apiRoute: string, items: NonNullable<Header['items']>) {
  return request<{ result: Header }>(apiRoute, '/globals/header', {
    method: 'POST',
    body: JSON.stringify({ items, _status: 'published' }),
  })
}

/** Data da versão mais nova da página (a do rascunho), para salvar por cima depois de um conflito. */
export async function latestPageVersion(apiRoute: string, pageId: number): Promise<string> {
  const doc = await request<Pick<Page, 'updatedAt'>>(
    apiRoute,
    `/pages/${pageId}?draft=true&depth=0&select[updatedAt]=true`,
  )
  return doc.updatedAt
}

/** A sessão ainda vale? Uma recusa ao salvar pode ser falta de permissão ou sessão encerrada. */
export async function stillLoggedIn(apiRoute: string): Promise<boolean> {
  const { user } = await request<{ user: unknown }>(apiRoute, '/users/me')
  return Boolean(user)
}
