'use client'

import { request } from '@/components/editor/api'
import { FORM_STARTERS } from '@/lib/forms'
import type { Footer, Form, Header, Page, Site } from '@/payload-types'
import { emptyPageContent, type PageContent } from '@/puck/schema'

// Ações da lista de páginas, pela API do Payload com a sessão do painel. As permissões e as regras
// (como não excluir a página inicial) são conferidas no servidor.

type DocResponse<T> = { doc: T }

function getLatest(apiRoute: string, pageId: number) {
  return request<Page>(apiRoute, `/pages/${pageId}?draft=true&depth=0`)
}

/** Página nova em rascunho, começando só com um banner com o nome dela. */
export function blankContent(title: string): PageContent {
  const content = emptyPageContent()
  content.data.content.push({
    type: 'Hero',
    props: {
      id: `Hero-${crypto.randomUUID()}`,
      title,
      text: '',
      image: null,
      button: null,
      style: 'soft',
      align: 'center',
    },
  })
  return content
}

export function createPage(
  apiRoute: string,
  data: { title: string; slug: string; content: PageContent; campaign?: boolean | null },
) {
  return request<DocResponse<Page>>(apiRoute, '/pages?draft=true', {
    method: 'POST',
    body: JSON.stringify({ ...data, _status: 'draft' }),
  })
}

/** Página nova (rascunho) a partir de um modelo de página: o servidor copia as fotos do modelo. */
export function createPageFromTemplate(
  apiRoute: string,
  templateId: number,
  data: { title: string; slug: string },
) {
  return request<DocResponse<Pick<Page, 'id'>>>(apiRoute, `/templates/${templateId}/pagina`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** Cópia em rascunho do conteúdo mais recente de outra página (com as mudanças não publicadas). */
export async function copyPage(apiRoute: string, sourceId: number, title: string, slug: string) {
  const source = await getLatest(apiRoute, sourceId)
  return createPage(apiRoute, {
    title,
    slug,
    content: source.content as PageContent,
    campaign: source.campaign,
  })
}

/**
 * Grava o rascunho mais recente inteiro como a versão da página, em rascunho (fora do ar). Vai tudo
 * porque o Payload completa o que faltar com a versão publicada e as mudanças não publicadas se
 * perderiam.
 */
async function saveLatestAsDraft(apiRoute: string, pageId: number, archived: boolean) {
  const latest = await getLatest(apiRoute, pageId)
  return request<DocResponse<Page>>(apiRoute, `/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: latest.title,
      slug: latest.slug,
      campaign: latest.campaign,
      content: latest.content,
      seo: latest.seo,
      archived,
      _status: 'draft',
    }),
  })
}

/** Tira do ar: a página volta a ser só rascunho. */
export function unpublishPage(apiRoute: string, pageId: number) {
  return saveLatestAsDraft(apiRoute, pageId, false)
}

/** Arquiva: a página sai do ar e vai para "Arquivadas". O servidor recusa a inicial e as do menu. */
export function archivePage(apiRoute: string, pageId: number) {
  return saveLatestAsDraft(apiRoute, pageId, true)
}

/** Restaura uma página arquivada: ela volta para a lista como rascunho. */
export function restorePage(apiRoute: string, pageId: number) {
  return saveLatestAsDraft(apiRoute, pageId, false)
}

export function deletePage(apiRoute: string, pageId: number) {
  return request<DocResponse<Page>>(apiRoute, `/pages/${pageId}`, { method: 'DELETE' })
}

/**
 * Publica as configurações com outra página inicial. Se elas tiverem mudança não publicada, não
 * mexe: o Payload completaria o resto com o rascunho, e a mudança iria para o ar junto.
 */
export async function setHomepage(apiRoute: string, pageId: number) {
  const draft = await request<Site>(apiRoute, '/globals/site?depth=0&draft=true')
  if (draft._status === 'draft') {
    throw new Error(
      'As Configurações têm mudanças ainda não publicadas. Publique ou descarte lá antes.',
    )
  }
  return request<{ result: Site }>(apiRoute, '/globals/site', {
    method: 'POST',
    body: JSON.stringify({ homepage: pageId, _status: 'published' }),
  })
}

/** Marca uma mensagem como lida ou não lida. O servidor só deixa mudar este campo. */
export function setMessageRead(apiRoute: string, id: number, read: boolean) {
  return request(apiRoute, `/form-submissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ read }),
  })
}

export function deleteMessage(apiRoute: string, id: number) {
  return request(apiRoute, `/form-submissions/${id}`, { method: 'DELETE' })
}

/** Formulário novo a partir de um pronto. Os nomes técnicos nascem no servidor. */
export function createFormFromStarter(apiRoute: string, key: string) {
  const starter = FORM_STARTERS.find((item) => item.key === key)
  if (!starter) throw new Error('Este formulário pronto não existe.')
  return request<DocResponse<Pick<Form, 'id'>>>(apiRoute, '/forms', {
    method: 'POST',
    body: JSON.stringify({
      title: starter.title,
      submitButtonLabel: 'Enviar',
      confirmationType: 'message',
      fields: starter.fields.map((field) => ({ ...field, width: 100 })),
    }),
  })
}

export function saveForm(apiRoute: string, id: number, data: Record<string, unknown>) {
  return request(apiRoute, `/forms/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

/** O servidor recusa formulário em uso numa página ou com mensagens guardadas. */
export function deleteForm(apiRoute: string, id: number) {
  return request(apiRoute, `/forms/${id}`, { method: 'DELETE' })
}

export type HeaderData = Pick<Header, 'items' | 'button'>
export type FooterData = Pick<Footer, 'text' | 'showMenu' | 'showContact' | 'showSocial'>

/** Guarda o menu ou o rodapé como rascunho: o site só muda ao publicar. */
export function saveGlobalDraft(
  apiRoute: string,
  slug: 'header' | 'footer',
  data: HeaderData | FooterData,
) {
  return request(apiRoute, `/globals/${slug}?draft=true`, {
    method: 'POST',
    body: JSON.stringify({ ...data, _status: 'draft' }),
  })
}

/** Publica o menu e o rodapé juntos, com tudo o que está na tela. */
export async function publishMenuAndFooter(
  apiRoute: string,
  header: HeaderData,
  footer: FooterData,
) {
  await request(apiRoute, '/globals/header', {
    method: 'POST',
    body: JSON.stringify({ ...header, _status: 'published' }),
  })
  await request(apiRoute, '/globals/footer', {
    method: 'POST',
    body: JSON.stringify({ ...footer, _status: 'published' }),
  })
}

/**
 * Descarta o rascunho: lê o que está no ar e publica de novo, igual. Assim a versão mais recente
 * volta a ser a publicada e o painel deixa de mostrar "Alterações não publicadas".
 */
export async function discardMenuAndFooter(apiRoute: string) {
  const [header, footer] = await Promise.all([
    request<Header>(apiRoute, '/globals/header?depth=0&draft=false'),
    request<Footer>(apiRoute, '/globals/footer?depth=0&draft=false'),
  ])
  const published = {
    header: { items: header.items ?? [], button: header.button ?? {} },
    footer: {
      text: footer.text ?? '',
      showMenu: footer.showMenu !== false,
      showContact: footer.showContact !== false,
      showSocial: footer.showSocial !== false,
    },
  }
  await publishMenuAndFooter(apiRoute, published.header, published.footer)
  return published
}
