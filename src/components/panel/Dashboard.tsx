import { Render } from '@puckeditor/core/rsc'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps, Payload } from 'payload'
import React from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { themeStyle } from '@/components/site/theme'
import { menuPageOrder } from '@/hooks/protectPage'
import { getHomepage, getSite, readPageContent, siteInfo, siteLinks } from '@/lib/content'
import { editorPath } from '@/lib/editor'
import {
  type FinishStep,
  finishSteps,
  greeting,
  panelHref,
  type PanelPath,
  pendingPagesText,
  sortPagesForList,
} from '@/lib/panel'
import { getServerURL } from '@/lib/site'
import { renderConfig } from '@/puck/config'
import { resolveReferences } from '@/puck/references'

import {
  loadFinishInput,
  loadPageRows,
  loadPendingGlobals,
  loadUnreadMessages,
  type PendingGlobal,
} from './data'
import { LiveSite } from './LiveSite'
import { PageRowItem } from './PageRowItem'
import { PanelIcon, type PanelIconName } from './PanelIcon'

/**
 * Começo da página inicial publicada, como o visitante vê (lido como visitante, igual ao site):
 * topo, seções e rodapé, para a miniatura ao vivo do cartão "Seu site".
 */
async function LiveHome({ payload }: { payload: Payload }) {
  const [page, site] = await Promise.all([getHomepage(), getSite()])
  if (!page) return null
  const data = readPageContent(page)
  const metadata = await resolveReferences(
    payload,
    data,
    { ...siteLinks(site), info: siteInfo(site) },
    page.id,
  )
  const campaign = Boolean(page.campaign)
  return (
    <LiveSite fontFaces={site.fontFaces ?? null} theme={themeStyle(site) as Record<string, string>}>
      <SiteHeader campaign={campaign} currentPageId={page.id} />
      <main>
        <Render config={renderConfig} data={data} metadata={metadata} />
      </main>
      <SiteFooter campaign={campaign} />
    </LiveSite>
  )
}

const GLOBAL_SCREEN: Record<PendingGlobal['slug'], PanelPath> = {
  site: 'settings',
  header: 'menu',
  footer: 'footer',
}

/**
 * Tela "Meu site" (no lugar do painel inicial do Payload): o que falta publicar, atalhos para o
 * trabalho de todo dia e as páginas mexidas por último. Segue o `vDashboard` do protótipo.
 */
export async function Dashboard({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult
  const { payload, user } = req
  if (!user) return null
  const adminRoute = payload.config.routes.admin

  const [allPages, pendingGlobals, photos, unread] = await Promise.all([
    loadPageRows(payload, user),
    loadPendingGlobals(payload, user),
    payload.count({ collection: 'media', overrideAccess: false, user }),
    loadUnreadMessages(payload, user),
  ])
  // As arquivadas ficam só na tela Páginas.
  const pages = allPages.filter((page) => !page.archived)
  // Site sem nenhuma página: o administrador começa pelo início guiado (fase 4), a não ser que
  // tenha escolhido montar sozinho ou que não haja modelos gravados.
  if (!allPages.length && user.role === 'admin' && !searchParams?.pular) {
    const { totalDocs } = await payload.count({
      collection: 'templates',
      overrideAccess: false,
      user,
    })
    if (totalDocs) redirect(panelHref(adminRoute, 'start'))
  }

  const finish = finishSteps(
    await loadFinishInput(payload, user, sortPagesForList(pages, await menuPageOrder(req))),
  )
  const finishDone = finish.filter((step) => step.done).length
  // Um botão verde cheio por tela: o da próxima coisa a fazer.
  const nextStep = finish.find((step) => !step.done)
  const home = pages.find((page) => page.home)
  const siteLive = Boolean(home && home.status !== 'draft')
  // Sem página inicial publicada: o que dá para mostrar de como está ficando é o editor dela.
  const previewHref = home ? editorPath(adminRoute, home.id) : panelHref(adminRoute, 'pages')
  const stepHref = (step: FinishStep) =>
    'page' in step.target
      ? editorPath(adminRoute, step.target.page)
      : panelHref(adminRoute, step.target.screen)

  const messagesHref = panelHref(adminRoute, 'messages')
  const domain = new URL(getServerURL()).host
  // Fotos de exemplo que não deu para copiar ao aplicar o modelo (`?fotos=3`, vindo do início guiado).
  const missingPhotos = searchParams?.pronto ? Math.max(0, Number(searchParams.fotos) || 0) : 0
  const pending = pages.filter((page) => page.status !== 'live')
  const recent = pages.slice(0, 4)
  const livePages = pages.filter((page) => page.status !== 'draft').length
  const editHomeLabel = home?.title === 'Início' ? 'Editar o Início' : 'Editar a página inicial'

  type Quick = [PanelPath, PanelIconName, string, string]
  // "Trocar fotos" sai enquanto o passo "Coloque suas fotos" está pendente: os dois levam a Fotos.
  const photosPending = finish.some((step) => step.key === 'photos' && !step.done)
  const quick: Quick[] = [
    ['newPage', 'plus', 'Criar uma página', 'Promoção, evento, serviço novo'],
    ...(photosPending
      ? []
      : [
          [
            'photos',
            'image',
            'Trocar fotos',
            `${photos.totalDocs} ${photos.totalDocs === 1 ? 'foto' : 'fotos'} na biblioteca`,
          ] satisfies Quick,
        ]),
    ['brand', 'palette', 'Sua marca', 'Logo, cores, letras e o jeito do site'],
    ['menu', 'layout', 'Mudar o menu', 'Os links do topo e do rodapé'],
    ['settings', 'pin', 'Telefone e endereço', 'Muda em todas as páginas'],
  ]

  return (
    <div className="gp-page">
      <header className="gp-pagehead">
        <div>
          <h1>{greeting()}! Este é o seu site.</h1>
          <p>
            Daqui você muda textos, fotos, páginas e o menu. Tudo o que você publica aparece no site
            em segundos.
          </p>
        </div>
      </header>

      {/* O que está salvo e ainda não está no ar: uma linha. A lista fica em Páginas recentes. */}
      {pending.length > 0 && (
        <p className="gp-notice gp-notice--warn" role="status">
          <span>{pendingPagesText(pending.length)}</span>
          <Link
            className="gp-btn gp-btn--sm gp-notice__action"
            href={
              pending.length === 1
                ? editorPath(adminRoute, pending[0].id)
                : panelHref(adminRoute, 'pages')
            }
          >
            {pending.length === 1 ? 'Continuar' : 'Ver'}
          </Link>
        </p>
      )}
      {pendingGlobals.map((global) => (
        <p className="gp-notice gp-notice--warn" key={global.slug} role="status">
          <span>{global.label} com mudanças fora do ar</span>
          <Link
            className="gp-btn gp-btn--sm gp-notice__action"
            href={panelHref(adminRoute, GLOBAL_SCREEN[global.slug])}
          >
            Continuar
          </Link>
        </p>
      ))}

      {searchParams?.pronto && (
        <p className="gp-notice" role="status">
          <PanelIcon name="check" />
          {siteLive ? (
            <span>
              Seu site está pronto e já está no ar.{' '}
              <a href="/" rel="noopener" target="_blank">
                Ver o site
              </a>
            </span>
          ) : (
            <span>
              Seu site está montado, em rascunho. Troque os textos de exemplo e publique.{' '}
              <Link href={previewHref}>Ver como está ficando</Link>
            </span>
          )}
        </p>
      )}
      {missingPhotos > 0 && (
        <p className="gp-warnbox" role="status">
          {missingPhotos === 1
            ? '1 foto de exemplo não veio do banco de fotos, e o lugar dela ficou vazio.'
            : `${missingPhotos} fotos de exemplo não vieram do banco de fotos, e os lugares delas ficaram vazios.`}{' '}
          Escolha fotos suas no editor de cada página.
        </p>
      )}

      <div className="gp-home">
        {/* Cartão "Seu site": a miniatura ao vivo do que está no ar e o que dá para fazer com ele. */}
        <section aria-labelledby="gp-site-title" className="gp-card gp-sitecard">
          <h2 className="gp-sr" id="gp-site-title">
            Seu site
          </h2>
          {siteLive ? (
            <LiveHome payload={payload} />
          ) : (
            <div className="gp-sitecard__mini gp-sitecard__mini--soon">
              <PanelIcon name="eye" size={22} />
              <span>Em construção</span>
            </div>
          )}
          <div className="gp-sitecard__bar">
            {siteLive ? (
              <div className="gp-live">
                <span aria-hidden="true" className="gp-live__dot" />
                <span>
                  <b className="gp-live__label">No ar</b>
                  <span className="gp-sr"> · </span>
                  <span className="gp-sitecard__meta">
                    Seu site está no ar em <span className="gp-accent">{domain}</span> · {livePages}{' '}
                    {livePages === 1 ? 'página' : 'páginas'}
                  </span>
                </span>
              </div>
            ) : (
              <div className="gp-live gp-live--draft">
                <span aria-hidden="true" className="gp-live__dot" />
                <span className="gp-sitecard__meta">
                  Seu site ainda não está no ar. Quem abre{' '}
                  <span className="gp-accent">{domain}</span> vê um aviso de &ldquo;em
                  construção&rdquo;.
                </span>
              </div>
            )}
            <div className="gp-sitecard__actions">
              {siteLive ? (
                <a className="gp-btn" href="/" rel="noopener" target="_blank">
                  <PanelIcon name="eye" size={16} />
                  Ver site
                </a>
              ) : (
                <Link className="gp-btn" href={previewHref}>
                  <PanelIcon name="eye" size={16} />
                  Ver como está ficando
                </Link>
              )}
              {home && (
                <Link
                  className={`gp-btn${nextStep ? '' : ' gp-btn--primary'}`}
                  href={editorPath(adminRoute, home.id)}
                >
                  <PanelIcon name="edit" size={16} />
                  {editHomeLabel}
                </Link>
              )}
            </div>
          </div>
        </section>

        {finishDone === finish.length ? (
          <details className="gp-card gp-finished">
            <summary>
              <span aria-hidden="true" className="gp-todo__mark">
                <PanelIcon name="check" size={14} />
              </span>
              Tudo pronto no seu site
            </summary>
            <FinishList finish={finish} />
          </details>
        ) : (
          <section aria-labelledby="gp-finish-title" className="gp-card">
            <div className="gp-card__head">
              <h2 id="gp-finish-title">Para o site ficar pronto</h2>
              <span className="gp-small gp-muted">
                {finishDone} de {finish.length} feitos
              </span>
            </div>
            <div aria-hidden="true" className="gp-progress">
              <i style={{ width: `${Math.round((finishDone / finish.length) * 100)}%` }} />
            </div>
            <FinishList finish={finish} href={stepHref} next={nextStep} />
          </section>
        )}
      </div>

      <nav aria-label="Atalhos" className="gp-quick">
        {quick.map(([path, icon, title, text]) => (
          <Link href={panelHref(adminRoute, path)} key={path}>
            <span className="gp-quick__icon">
              <PanelIcon name={icon} />
            </span>
            <b>{title}</b>
            <span className="gp-muted gp-small">{text}</span>
          </Link>
        ))}
      </nav>

      {unread.total > 0 && (
        <section className="gp-card">
          <div className="gp-card__head">
            <h2>{unread.total === 1 ? '1 mensagem nova' : `${unread.total} mensagens novas`}</h2>
            <Link className="gp-btn gp-btn--sm" href={messagesHref}>
              Abrir Mensagens
            </Link>
          </div>
          <ul className="gp-rows">
            {unread.messages.map((message) => (
              <li className="gp-row gp-row--form" key={message.id}>
                <div>
                  <div className="gp-row__title">{message.sender}</div>
                  <div className="gp-row__sub">
                    {message.preview && `${message.preview} · `}
                    {message.ago}
                  </div>
                </div>
                <div className="gp-row__actions">
                  <Link
                    aria-label={`Ler a mensagem de ${message.sender}`}
                    className="gp-btn gp-btn--sm"
                    href={`${messagesHref}?mensagem=${message.id}`}
                  >
                    Ler
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="gp-card">
        <div className="gp-card__head">
          <h2>Páginas recentes</h2>
          <Link className="gp-btn gp-btn--sm gp-btn--ghost" href={panelHref(adminRoute, 'pages')}>
            Ver todas
          </Link>
        </div>
        {recent.length > 0 ? (
          <ul className="gp-rows">
            {recent.map((page) => (
              <PageRowItem adminRoute={adminRoute} domain={domain} key={page.id} page={page} />
            ))}
          </ul>
        ) : (
          <p className="gp-empty">Nenhuma página ainda. Comece criando a primeira.</p>
        )}
      </section>
    </div>
  )
}

/** Passos de "Para o site ficar pronto". Feito: check verde e texto mais suave, sem botão. */
function FinishList({
  finish,
  href,
  next,
}: {
  finish: FinishStep[]
  href?: (step: FinishStep) => string
  next?: FinishStep
}) {
  return (
    <ol className="gp-todo">
      {finish.map((step, index) => (
        <li className={step.done ? 'is-done' : undefined} key={step.key}>
          <span aria-hidden="true" className="gp-todo__mark">
            {step.done ? <PanelIcon name="check" size={14} /> : index + 1}
          </span>
          <div className="gp-todo__text">
            <b>{step.title}</b>
            {step.done ? (
              <span className="gp-sr"> (feito)</span>
            ) : (
              step.detail && <span className="gp-small gp-muted">{step.detail}</span>
            )}
          </div>
          {!step.done && href && (
            <Link
              className={`gp-btn gp-btn--sm${step === next ? ' gp-btn--primary' : ''}`}
              href={href(step)}
            >
              {step.action}
            </Link>
          )}
        </li>
      ))}
    </ol>
  )
}
