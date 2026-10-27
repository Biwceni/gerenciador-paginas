'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useCallback, useState } from 'react'

import { editorPath } from '@/lib/editor'
import { panelHref } from '@/lib/panel'
import { uniqueSlug } from '@/lib/slug'

import { copyPage, deletePage, setHomepage, unpublishPage } from './api'
import type { PageRow } from './data'
import { PageRowItem } from './PageRowItem'
import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'

type Props = {
  adminRoute: string
  apiRoute: string
  domain: string
  inMenu: number[]
  pages: PageRow[]
}

type Notice = { text: string; editId?: number }

export function PagesList({ adminRoute, apiRoute, domain, inMenu, pages }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [moreId, setMoreId] = useState<number | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const search = query.trim().toLowerCase()
  const list = pages.filter(
    (page) => !search || page.title.toLowerCase().includes(search) || page.path.includes(search),
  )
  const live = pages.filter((page) => page.status !== 'draft').length
  const more = pages.find((page) => page.id === moreId)
  const closeMore = useCallback(() => setMoreId(null), [])

  const done = (next: Notice) => {
    setMoreId(null)
    setNotice(next)
    router.refresh()
  }

  return (
    <div className="gp-page">
      <header className="gp-pagehead">
        <div>
          <h1>Páginas</h1>
          <p>
            {pages.length} {pages.length === 1 ? 'página' : 'páginas'} · {live} no ar
          </p>
        </div>
        <Link className="gp-btn gp-btn--primary gp-btn--lg" href={panelHref(adminRoute, 'newPage')}>
          <PanelIcon name="plus" />
          Nova página
        </Link>
      </header>

      <div aria-live="polite">
        {notice && (
          <p className="gp-notice">
            {notice.text}
            {notice.editId && (
              <Link href={editorPath(adminRoute, notice.editId)}>Editar a cópia</Link>
            )}
            <button
              aria-label="Fechar aviso"
              className="gp-iconbtn"
              onClick={() => setNotice(null)}
              type="button"
            >
              <PanelIcon name="x" size={16} />
            </button>
          </p>
        )}
      </div>

      <label className="gp-searchbox">
        <PanelIcon name="search" size={16} />
        <input
          aria-label="Procurar página"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Procurar página"
          type="search"
          value={query}
        />
      </label>

      <section className="gp-card gp-card--list">
        {list.length > 0 ? (
          <ul className="gp-rows">
            {list.map((page) => (
              <PageRowItem adminRoute={adminRoute} domain={domain} key={page.id} page={page}>
                <Link
                  className="gp-btn gp-btn--sm gp-btn--primary"
                  href={editorPath(adminRoute, page.id)}
                >
                  <PanelIcon name="edit" size={14} />
                  Editar
                </Link>
                {page.status !== 'draft' && (
                  <a className="gp-btn gp-btn--sm" href={page.path} rel="noopener" target="_blank">
                    <PanelIcon name="eye" size={14} />
                    Ver
                  </a>
                )}
                <button
                  aria-label={`Mais opções de "${page.title}"`}
                  className="gp-btn gp-btn--sm gp-btn--ghost"
                  onClick={() => setMoreId(page.id)}
                  type="button"
                >
                  Mais…
                </button>
              </PageRowItem>
            ))}
          </ul>
        ) : (
          <p className="gp-empty">
            {pages.length ? `Nenhuma página com “${query.trim()}”.` : 'Nenhuma página ainda.'}
          </p>
        )}
      </section>

      <p className="gp-tip">
        <PanelIcon name="help" size={16} />
        <span>
          A página inicial é a que abre em <b>{domain}</b>. Para trocar, use “Mais…” em outra
          página.
        </span>
      </p>

      {more && (
        <MoreDialog
          apiRoute={apiRoute}
          inMenu={inMenu.includes(more.id)}
          key={more.id}
          onClose={closeMore}
          onDone={done}
          page={more}
          takenSlugs={pages.map((page) => page.slug)}
        />
      )}
    </div>
  )
}

type MoreProps = {
  apiRoute: string
  inMenu: boolean
  onClose: () => void
  onDone: (notice: Notice) => void
  page: PageRow
  takenSlugs: string[]
}

/** "Mais…" de uma página: cópia, página inicial, tirar do ar e excluir. Segue o `moreMenu`. */
function MoreDialog({ apiRoute, inMenu, onClose, onDone, page, takenSlugs }: MoreProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'unpublish' | 'delete' | null>(null)
  const live = page.status !== 'draft'

  const run = async (action: () => Promise<Notice>) => {
    setBusy(true)
    setError(null)
    try {
      onDone(await action())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tente de novo.')
      setBusy(false)
    }
  }

  const duplicate = () =>
    run(async () => {
      const title = `${page.title.slice(0, 72)} (cópia)`
      const { doc } = await copyPage(apiRoute, page.id, title, uniqueSlug(title, takenSlugs))
      return { text: 'Cópia criada como rascunho.', editId: doc.id }
    })

  return (
    <PanelDialog onClose={onClose} title={page.title}>
      <div className="gp-stack">
        <button className="gp-btn" disabled={busy} onClick={duplicate} type="button">
          <PanelIcon name="copy" size={16} />
          Fazer uma cópia desta página
        </button>
        {!page.home && (
          <button
            className="gp-btn"
            disabled={busy || !live}
            onClick={() =>
              run(async () => {
                await setHomepage(apiRoute, page.id)
                return { text: `“${page.title}” agora é a página inicial.` }
              })
            }
            type="button"
          >
            <PanelIcon name="home" size={16} />
            Usar como página inicial{live ? '' : ' (publique antes)'}
          </button>
        )}
        {live && !page.home && (
          <button
            className="gp-btn"
            disabled={busy}
            onClick={() => setConfirm('unpublish')}
            type="button"
          >
            <PanelIcon name="eye" size={16} />
            Tirar do ar (volta a ser rascunho)
          </button>
        )}
        {page.home ? (
          <p className="gp-small gp-muted">
            A página inicial não pode sair do ar nem ser excluída. Escolha outra página inicial
            antes.
          </p>
        ) : inMenu ? (
          <p className="gp-small gp-muted">
            Esta página está no menu do site. Para excluir, tire ela do menu antes.
          </p>
        ) : (
          <button
            className="gp-btn gp-btn--danger"
            disabled={busy}
            onClick={() => setConfirm('delete')}
            type="button"
          >
            <PanelIcon name="trash" size={16} />
            Excluir página
          </button>
        )}

        {confirm === 'unpublish' && (
          <div className="gp-warnbox" role="alert">
            <b>Tirar “{page.title}” do ar?</b>
            <span>
              Quem abrir o endereço dela vai ver “página não encontrada”.
              {inMenu && ' O link dela some do menu enquanto ela estiver fora do ar.'} O conteúdo
              continua salvo como rascunho.
            </span>
            <div className="gp-actions">
              <button className="gp-btn gp-btn--sm" onClick={() => setConfirm(null)} type="button">
                Cancelar
              </button>
              <button
                className="gp-btn gp-btn--sm gp-btn--primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await unpublishPage(apiRoute, page.id)
                    return { text: `“${page.title}” saiu do ar e voltou a ser rascunho.` }
                  })
                }
                type="button"
              >
                Tirar do ar
              </button>
            </div>
          </div>
        )}
        {confirm === 'delete' && (
          <div className="gp-warnbox" role="alert">
            <b>Excluir “{page.title}”?</b>
            <span>Não dá para desfazer.</span>
            <div className="gp-actions">
              <button className="gp-btn gp-btn--sm" onClick={() => setConfirm(null)} type="button">
                Cancelar
              </button>
              <button
                className="gp-btn gp-btn--sm gp-btn--solid-danger"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await deletePage(apiRoute, page.id)
                    return { text: `“${page.title}” foi excluída.` }
                  })
                }
                type="button"
              >
                Excluir
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="gp-error" role="alert">
            Não deu certo: {error}
          </p>
        )}
      </div>
    </PanelDialog>
  )
}
