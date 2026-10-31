import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { menuPageOrder } from '@/hooks/protectPage'
import { editorPath } from '@/lib/editor'
import {
  type FinishStep,
  finishSteps,
  greeting,
  panelHref,
  type PanelPath,
  sortPagesForList,
} from '@/lib/panel'
import { getServerURL } from '@/lib/site'

import { loadFinishInput, loadPageRows, loadPendingGlobals, type PendingGlobal } from './data'
import { PageRowItem, StatusChip } from './PageRowItem'
import { PanelIcon, type PanelIconName } from './PanelIcon'

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

  const [allPages, pendingGlobals, photos] = await Promise.all([
    loadPageRows(payload, user),
    loadPendingGlobals(payload, user),
    payload.count({ collection: 'media', overrideAccess: false, user }),
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
  const home = pages.find((page) => page.home)
  const siteLive = Boolean(home && home.status !== 'draft')
  // Sem página inicial publicada: o que dá para mostrar de como está ficando é o editor dela.
  const previewHref = home ? editorPath(adminRoute, home.id) : panelHref(adminRoute, 'pages')
  const stepHref = (step: FinishStep) =>
    'page' in step.target
      ? editorPath(adminRoute, step.target.page)
      : panelHref(adminRoute, step.target.screen)

  const domain = new URL(getServerURL()).host
  // Fotos de exemplo que não deu para copiar ao aplicar o modelo (`?fotos=3`, vindo do início guiado).
  const missingPhotos = searchParams?.pronto ? Math.max(0, Number(searchParams.fotos) || 0) : 0
  const pending = pages.filter((page) => page.status !== 'live')
  const recent = pages.slice(0, 4)

  const quick: [PanelPath, PanelIconName, string, string][] = [
    ['newPage', 'plus', 'Criar uma página', 'Promoção, evento, serviço novo'],
    [
      'photos',
      'image',
      'Trocar fotos',
      `${photos.totalDocs} ${photos.totalDocs === 1 ? 'foto' : 'fotos'} na biblioteca`,
    ],
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

      {siteLive ? (
        <div className="gp-statusbar">
          <div className="gp-live">
            <span aria-hidden="true" className="gp-live__dot" />
            Seu site está no ar em <span className="gp-accent">{domain}</span>
          </div>
          <a className="gp-btn gp-btn--primary" href="/" rel="noopener" target="_blank">
            <PanelIcon name="eye" size={16} />
            Ver meu site
          </a>
        </div>
      ) : (
        <div className="gp-statusbar gp-statusbar--draft">
          <div className="gp-live">
            <span aria-hidden="true" className="gp-live__dot" />
            <span>
              Seu site ainda não está no ar. Quem abre <span className="gp-accent">{domain}</span>{' '}
              vê um aviso de &ldquo;em construção&rdquo;.
            </span>
          </div>
          <Link className="gp-btn" href={previewHref}>
            <PanelIcon name="eye" size={16} />
            Ver como está ficando
          </Link>
        </div>
      )}

      {finishDone < finish.length && (
        <section aria-labelledby="gp-finish-title" className="gp-card">
          <div className="gp-card__head">
            <h2 id="gp-finish-title">Para terminar seu site</h2>
            <span className="gp-small gp-muted">
              {finishDone} de {finish.length} feitos
            </span>
          </div>
          <div aria-hidden="true" className="gp-progress">
            <i style={{ width: `${Math.round((finishDone / finish.length) * 100)}%` }} />
          </div>
          <ol className="gp-todo">
            {finish.map((step, index) => (
              <li className={step.done ? 'is-done' : undefined} key={step.key}>
                <span aria-hidden="true" className="gp-todo__mark">
                  {step.done ? <PanelIcon name="check" size={14} /> : index + 1}
                </span>
                <div className="gp-todo__text">
                  <b>{step.title}</b>
                  {!step.done && step.detail && (
                    <span className="gp-small gp-muted">{step.detail}</span>
                  )}
                </div>
                {!step.done && (
                  <Link
                    className={`gp-btn gp-btn--sm${'page' in step.target ? ' gp-btn--primary' : ''}`}
                    href={stepHref(step)}
                  >
                    {step.action}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {(pending.length > 0 || pendingGlobals.length > 0) && (
        <section className="gp-card">
          <h2>Falta publicar</h2>
          <p className="gp-muted gp-small">
            Estas mudanças estão salvas, mas ainda não aparecem para os visitantes.
          </p>
          <ul className="gp-rows">
            {pending.map((page) => (
              <PageRowItem adminRoute={adminRoute} domain={domain} key={page.id} page={page}>
                <Link
                  className="gp-btn gp-btn--sm gp-btn--primary"
                  href={editorPath(adminRoute, page.id)}
                >
                  Continuar
                </Link>
              </PageRowItem>
            ))}
            {pendingGlobals.map((global) => (
              <li className="gp-row" key={global.slug}>
                <div className="gp-row__title">{global.label}</div>
                <StatusChip status="changed" />
                <div className="gp-row__actions">
                  <Link
                    className="gp-btn gp-btn--sm gp-btn--primary"
                    href={panelHref(adminRoute, GLOBAL_SCREEN[global.slug])}
                  >
                    Continuar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
