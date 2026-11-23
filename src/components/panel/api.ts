'use client'

import { type FooterData, toFooterData } from './footerData'
import { RequestError, stillLoggedIn } from '@/components/editor/api'

import { askToLogin, request, SessionEndedError } from './session'
import { FORM_STARTERS } from '@/lib/forms'
import type { Footer, Form, Header, Page, Site } from '@/payload-types'
import { emptyPageContent, HERO_SLIDE_DEFAULTS, type PageContent } from '@/puck/schema'

import { lookOf, type SiteData, type SiteLook, toSettingsState, toSiteData } from './settings'

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
      ...HERO_SLIDE_DEFAULTS,
      id: `Hero-${crypto.randomUUID()}`,
      title,
      text: '',
      image: null,
      button: null,
      style: 'soft',
      align: 'center',
      height: 'normal',
      highlight: '',
      anim: 'site',
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

/** A8: volta para um site guardado antes de uma troca no Começar. */
export function restoreSiteBackup(apiRoute: string, backupId: number) {
  return request<{ homepage: number | null; restored: number; missing: number }>(
    apiRoute,
    `/site-backups/${backupId}/voltar`,
    { method: 'POST' },
  )
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

export type HeaderData = Pick<Header, 'items' | 'button' | 'notice' | 'topBar'>
export { type FooterData, toFooterData } from './footerData'

type GlobalSlug = 'header' | 'footer' | 'site'

/**
 * Versão do global que a tela tem (a data `updatedAt` do rascunho mais recente quando ela abriu ou
 * salvou por último). Antes de salvar, o painel confere se ninguém mexeu depois (A3).
 */
export type GlobalBase = { current: string }

/** O global mudou em outra aba ou outra pessoa mexeu: a tela pergunta o que fazer. */
export class ConflictError extends RequestError {
  constructor(readonly latest: string) {
    super('mudou em outra aba ou outra pessoa mexeu', 409)
  }
}

async function globalVersion(apiRoute: string, slug: GlobalSlug) {
  const doc = await request<{ updatedAt?: string }>(
    apiRoute,
    `/globals/${slug}?draft=true&depth=0&select[updatedAt]=true`,
  )
  return doc.updatedAt ?? ''
}

/** Recusa salvar por cima de uma versão mais nova que a da tela. */
export async function checkGlobal(apiRoute: string, slug: GlobalSlug, base?: GlobalBase) {
  if (!base?.current) return
  const latest = await globalVersion(apiRoute, slug)
  if (latest && latest !== base.current) {
    // Sem sessão, o servidor devolve a versão publicada no lugar do rascunho (ler o site é aberto),
    // e a data seria outra: antes de falar em conflito, confere se a sessão ainda vale.
    if (!(await stillLoggedIn(apiRoute).catch(() => true))) {
      askToLogin()
      throw new SessionEndedError()
    }
    throw new ConflictError(latest)
  }
}

type GlobalResponse = { result?: { updatedAt?: string | null } }

const advance = (base: GlobalBase | undefined, response: GlobalResponse) => {
  if (base && response.result?.updatedAt) base.current = response.result.updatedAt
}

/** Guarda o menu, o rodapé ou as configurações como rascunho: o site só muda ao publicar. */
export async function saveGlobalDraft(
  apiRoute: string,
  slug: GlobalSlug,
  data: HeaderData | FooterData | SiteData,
  base?: GlobalBase,
) {
  await checkGlobal(apiRoute, slug, base)
  const response = await request<GlobalResponse>(apiRoute, `/globals/${slug}?draft=true`, {
    method: 'POST',
    body: JSON.stringify({ ...data, _status: 'draft' }),
  })
  advance(base, response)
  return response
}

/** Publica o menu e o rodapé juntos, com tudo o que está na tela. */
export async function publishMenuAndFooter(
  apiRoute: string,
  header: HeaderData,
  footer: FooterData,
  bases?: { header: GlobalBase; footer: GlobalBase },
) {
  await checkGlobal(apiRoute, 'header', bases?.header)
  await checkGlobal(apiRoute, 'footer', bases?.footer)
  advance(
    bases?.header,
    await request<GlobalResponse>(apiRoute, '/globals/header', {
      method: 'POST',
      body: JSON.stringify({ ...header, _status: 'published' }),
    }),
  )
  advance(
    bases?.footer,
    await request<GlobalResponse>(apiRoute, '/globals/footer', {
      method: 'POST',
      body: JSON.stringify({ ...footer, _status: 'published' }),
    }),
  )
}

/**
 * Descarta o rascunho: lê o que está no ar e publica de novo, igual. Assim a versão mais recente
 * volta a ser a publicada e o painel deixa de mostrar "Alterações não publicadas".
 */
export async function discardMenuAndFooter(
  apiRoute: string,
  bases?: { header: GlobalBase; footer: GlobalBase },
) {
  const [header, footer] = await Promise.all([
    request<Header>(apiRoute, '/globals/header?depth=0&draft=false'),
    request<Footer>(apiRoute, '/globals/footer?depth=0&draft=false'),
  ])
  const published = {
    header: {
      items: header.items ?? [],
      button: header.button ?? {},
      notice: header.notice ?? {},
      topBar: header.topBar ?? {},
    },
    footer: toFooterData(footer),
  }
  await publishMenuAndFooter(apiRoute, published.header, published.footer)
  // Descartar vale para qualquer versão: a tela passa a ter a que acabou de ir ao ar.
  if (bases) {
    bases.header.current = await globalVersion(apiRoute, 'header')
    bases.footer.current = await globalVersion(apiRoute, 'footer')
  }
  return published
}

/** Publica as configurações com tudo o que está na tela. */
export async function publishSettings(apiRoute: string, data: SiteData, base?: GlobalBase) {
  await checkGlobal(apiRoute, 'site', base)
  const response = await request<{ result: Site }>(apiRoute, '/globals/site', {
    method: 'POST',
    body: JSON.stringify({ ...data, _status: 'published' }),
  })
  advance(base, response)
  return response
}

/**
 * Descarta o rascunho das configurações: lê o que está no ar e publica de novo, igual (como
 * `discardMenuAndFooter`).
 */
export async function discardSettings(apiRoute: string, base?: GlobalBase) {
  const site = await request<Site>(apiRoute, '/globals/site?depth=0&draft=false')
  const published = toSettingsState(site)
  const response = await publishSettings(apiRoute, toSiteData(published))
  advance(base, response)
  return published
}

/**
 * Troca a personalidade, as cores e as letras do site no rascunho das configurações (Sua marca no
 * editor, E8). Parte do rascunho mais recente, para não apagar o que mudou em Sua marca ou nas
 * Configurações; o site só muda quando as configurações forem publicadas.
 */
export async function saveSiteLook(apiRoute: string, look: SiteLook) {
  const site = await request<Site>(apiRoute, '/globals/site?depth=0&draft=true')
  await saveGlobalDraft(apiRoute, 'site', toSiteData({ ...toSettingsState(site), ...look }))
}

/** Sua marca como está no rascunho e como está no ar, para o editor ver se mudou noutra tela. */
export async function readSiteLook(apiRoute: string) {
  const [draft, live] = await Promise.all([
    request<Site>(apiRoute, '/globals/site?depth=0&draft=true'),
    request<Site>(apiRoute, '/globals/site?depth=0&draft=false'),
  ])
  return { draft: lookOf(toSettingsState(draft)), live: lookOf(toSettingsState(live)) }
}

/** Publica o rascunho das configurações como está (o "Publicar também Sua marca" do editor). */
export async function publishSiteDraft(apiRoute: string) {
  const site = await request<Site>(apiRoute, '/globals/site?depth=0&draft=true')
  await publishSettings(apiRoute, toSiteData(toSettingsState(site)))
}
