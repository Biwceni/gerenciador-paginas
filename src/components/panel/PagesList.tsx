'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { editorPath } from '@/lib/editor'
import { panelHref } from '@/lib/panel'
import { uniqueSlug } from '@/lib/slug'

import { archivePage, copyPage, deletePage, restorePage, setHomepage, unpublishPage } from './api'
import type { PageRow } from './data'
import { PageRowItem } from './PageRowItem'
import { PanelDialog } from './PanelDialog'
import { PanelIcon, type PanelIconName } from './PanelIcon'
import { Tip } from './Tip'

type Props = {
  adminRoute: string
  apiRoute: string
  /** Páginas arquivadas, em ordem alfabética. */
  archived: PageRow[]
  domain: string
  inMenu: number[]
  /** Páginas da lista, já na ordem do menu (`sortPagesForList`). */
  pages: PageRow[]
}

type Notice = { text: string; editId?: number }

export function PagesList({ adminRoute, apiRoute, archived, domain, inMenu, pages }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState<{ page: PageRow; kind: Confirm } | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [restoring, setRestoring] = useState<number | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  const search = query.trim().toLowerCase()
  const matches = (page: PageRow) =>
    !search || page.title.toLowerCase().includes(search) || page.path.includes(search)
  const list = pages.filter(matches)
  const archivedList = archived.filter(matches)
  const live = pages.filter((page) => page.status !== 'draft').length
  const takenSlugs = [...pages, ...archived].map((page) => page.slug)
  const closeConfirm = useCallback(() => setConfirm(null), [])

  const done = (next: Notice) => {
    setConfirm(null)
    setNotice(next)
    router.refresh()
  }

  const run = async (action: () => Promise<Notice>) => {
    setBusy(true)
    setActionError(null)
    try {
      done(await action())
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const perform = (page: PageRow, kind: Action) =>
    run(async () => {
      if (kind === 'copy') {
        const title = `${page.title.slice(0, 72)} (cópia)`
        const { doc } = await copyPage(apiRoute, page.id, title, uniqueSlug(title, takenSlugs))
        return { text: 'Cópia criada como rascunho.', editId: doc.id }
      }
      if (kind === 'home') {
        await setHomepage(apiRoute, page.id)
        return { text: `“${page.title}” agora é a página inicial.` }
      }
      if (kind === 'unpublish') {
        await unpublishPage(apiRoute, page.id)
        return { text: `“${page.title}” saiu do ar e voltou a ser rascunho.` }
      }
      if (kind === 'archive') {
        await archivePage(apiRoute, page.id)
        return { text: `“${page.title}” foi para Arquivadas.` }
      }
      await deletePage(apiRoute, page.id)
      return { text: `“${page.title}” foi excluída.` }
    })

  // Cópia e página inicial vão direto; o que tira do site ou apaga pede confirmação.
  const pick = (page: PageRow, kind: Action) => {
    setActionError(null)
    if (kind === 'copy' || kind === 'home') perform(page, kind)
    else setConfirm({ page, kind })
  }

  const restore = async (page: PageRow) => {
    setRestoring(page.id)
    setRestoreError(null)
    try {
      await restorePage(apiRoute, page.id)
      done({ text: `“${page.title}” voltou para a lista, como rascunho.` })
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Tente de novo.')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="gp-page" role="main">
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
        {actionError && !confirm && (
          <p className="gp-error" role="alert">
            Não deu certo: {actionError}
          </p>
        )}
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
                <Link className="gp-btn gp-btn--sm" href={editorPath(adminRoute, page.id)}>
                  <PanelIcon name="edit" size={14} />
                  Editar
                </Link>
                {page.status !== 'draft' && (
                  <a
                    aria-label={`Ver ${page.title} no site`}
                    className="gp-btn gp-btn--sm gp-btn--icon-sm"
                    href={page.path}
                    rel="noopener"
                    target="_blank"
                  >
                    <PanelIcon name="eye" size={14} />
                    <span aria-hidden="true" className="gp-btn__label">
                      Ver
                    </span>
                  </a>
                )}
                <MoreMenu
                  inMenu={inMenu.includes(page.id)}
                  onPick={(kind) => pick(page, kind)}
                  page={page}
                />
              </PageRowItem>
            ))}
          </ul>
        ) : (
          <p className="gp-empty">
            {pages.length ? `Nenhuma página com “${query.trim()}”.` : 'Nenhuma página ainda.'}
          </p>
        )}

        {/* Numa busca, o grupo abre sozinho para mostrar o que achou. */}
        {archivedList.length > 0 && (
          <details className="gp-archived" open={search ? true : undefined}>
            <summary>Arquivadas ({archivedList.length})</summary>
            <p className="gp-small gp-muted">
              Não estão no ar nem no menu. Restaure para editar e publicar de novo.
            </p>
            {restoreError && (
              <p className="gp-error" role="alert">
                Não deu certo: {restoreError}
              </p>
            )}
            <ul className="gp-rows">
              {archivedList.map((page) => (
                <PageRowItem
                  adminRoute={adminRoute}
                  archived
                  domain={domain}
                  key={page.id}
                  page={page}
                >
                  <button
                    className="gp-btn gp-btn--sm"
                    disabled={restoring !== null}
                    onClick={() => restore(page)}
                    type="button"
                  >
                    <PanelIcon name="file" size={14} />
                    {restoring === page.id ? 'Restaurando…' : 'Restaurar'}
                  </button>
                  <MoreMenu
                    inMenu={inMenu.includes(page.id)}
                    onPick={(kind) => pick(page, kind)}
                    page={page}
                  />
                </PageRowItem>
              ))}
            </ul>
          </details>
        )}
      </section>

      <Tip>
        A página inicial é a que abre em <b>{domain}</b>. Para trocar, use “Mais opções” (⋯) em
        outra página ou vá em <Link href={panelHref(adminRoute, 'settings')}>Configurações</Link>. A
        ordem aqui segue o menu do site.
      </Tip>

      {confirm && (
        <ConfirmDialog
          busy={busy}
          error={actionError}
          inMenu={inMenu.includes(confirm.page.id)}
          kind={confirm.kind}
          onCancel={closeConfirm}
          onConfirm={() => perform(confirm.page, confirm.kind)}
          page={confirm.page}
        />
      )}
    </div>
  )
}

type Action = 'copy' | 'home' | Confirm
type Confirm = 'unpublish' | 'archive' | 'delete'

/**
 * Botão ⋯ da linha: um menu preso a ele com as outras ações da página (cópia, página inicial,
 * tirar do ar, arquivar e excluir). Fecha no Esc e clicando fora, e o foco volta para o ⋯. Numa
 * página arquivada, só a cópia e o excluir (restaurar fica na linha dela).
 */
function MoreMenu({
  inMenu,
  onPick,
  page,
}: {
  inMenu: boolean
  onPick: (action: Action) => void
  page: PageRow
}) {
  const [open, setOpen] = useState(false)
  // Posição do menu: alinhado pela direita do ⋯, mas sempre dentro da tela (no celular os botões
  // ficam à esquerda).
  const [place, setPlace] = useState<React.CSSProperties>({})
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const live = page.status !== 'draft'
  const active = !page.archived
  const id = `gp-more-${page.id}`

  const close = useCallback(() => {
    setOpen(false)
    button.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()
    const onDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [close, open])

  // Setas para cima e para baixo andam pelas ações, como num menu.
  const onMenuKey = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = [
      ...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []),
    ]
    const at = items.indexOf(document.activeElement as HTMLElement)
    const next = (at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next]?.focus()
  }

  const item = (action: Action, icon: PanelIconName, label: string, danger = false) => (
    <button
      className={`gp-moremenu__item${danger ? ' gp-moremenu__item--danger' : ''}`}
      disabled={action === 'home' && !live}
      onClick={() => {
        close()
        onPick(action)
      }}
      role="menuitem"
      type="button"
    >
      <PanelIcon name={icon} size={16} />
      {label}
    </button>
  )

  return (
    <div
      className="gp-more"
      // Sair com Tab também fecha; o foco segue para onde a pessoa foi. Sem destino (clique, que no
      // Safari não dá foco ao botão), quem fecha é o clique fora.
      onBlur={(event) => {
        const to = event.relatedTarget
        if (open && to && !wrap.current?.contains(to)) setOpen(false)
      }}
      ref={wrap}
    >
      <button
        aria-controls={open ? id : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Mais opções de ${page.title}`}
        className="gp-btn gp-btn--sm gp-btn--icon"
        onClick={() => {
          const box = button.current?.getBoundingClientRect()
          if (box) {
            const width = Math.min(300, window.innerWidth - 32)
            const left = Math.min(Math.max(16, box.right - width), window.innerWidth - 16 - width)
            setPlace({ width, left: left - box.left })
          }
          setOpen((value) => !value)
        }}
        ref={button}
        title="Mais opções"
        type="button"
      >
        <PanelIcon name="more" size={16} />
      </button>
      {open && (
        <div
          aria-label={`Mais opções de ${page.title}`}
          className="gp-moremenu"
          id={id}
          onKeyDown={onMenuKey}
          ref={menu}
          role="menu"
          style={place}
        >
          {item('copy', 'copy', 'Fazer uma cópia desta página')}
          {!page.home &&
            active &&
            item('home', 'home', `Usar como página inicial${live ? '' : ' (publique antes)'}`)}
          {live && !page.home && item('unpublish', 'eye', 'Tirar do ar (volta a ser rascunho)')}
          {page.home ? (
            <p className="gp-moremenu__help">
              A página inicial não pode sair do ar, ser arquivada nem ser excluída. Escolha outra
              página inicial antes.
            </p>
          ) : inMenu ? (
            <p className="gp-moremenu__help">
              Esta página está no menu do site. Para arquivar ou excluir, tire ela do menu antes.
            </p>
          ) : (
            <>
              {active && item('archive', 'archive', 'Arquivar (sai do site e da lista)')}
              {item('delete', 'trash', 'Excluir página', true)}
            </>
          )}
        </div>
      )}
    </div>
  )
}

type ConfirmProps = {
  busy: boolean
  error: string | null
  inMenu: boolean
  kind: Confirm
  onCancel: () => void
  onConfirm: () => void
  page: PageRow
}

/** Confirmação do que tira a página do site ou apaga, numa janela. */
function ConfirmDialog({ busy, error, inMenu, kind, onCancel, onConfirm, page }: ConfirmProps) {
  const live = page.status !== 'draft'
  const text = {
    unpublish: {
      title: `Tirar “${page.title}” do ar?`,
      body: `Quem abrir o endereço dela vai ver “página não encontrada”.${inMenu ? ' O link dela some do menu enquanto ela estiver fora do ar.' : ''} O conteúdo continua salvo como rascunho.`,
      button: 'Tirar do ar',
    },
    archive: {
      title: `Arquivar “${page.title}”?`,
      body: `${live ? 'Ela sai do ar: quem abrir o endereço dela vai ver “página não encontrada”. ' : ''}Ela fica guardada em Arquivadas, no fim desta lista, e pode ser restaurada quando quiser.`,
      button: 'Arquivar',
    },
    delete: {
      title: `Excluir “${page.title}”?`,
      body: 'Não dá para desfazer.',
      button: 'Excluir',
    },
  }[kind]

  return (
    <PanelDialog onClose={onCancel} title={text.title}>
      <div className="gp-stack">
        <p>{text.body}</p>
        {error && (
          <p className="gp-error" role="alert">
            Não deu certo: {error}
          </p>
        )}
        <div className="gp-actions gp-actions--end">
          <button className="gp-btn" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className={`gp-btn ${kind === 'delete' ? 'gp-btn--solid-danger' : 'gp-btn--primary'}`}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? 'Aguarde…' : text.button}
          </button>
        </div>
      </div>
    </PanelDialog>
  )
}
