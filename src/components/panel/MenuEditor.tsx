'use client'

import '@/app/(frontend)/styles.css'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import {
  DEFAULT_CTA_TITLE,
  type FooterContact,
  type FooterSocial,
  type HeaderShortcuts,
  type MenuItem,
  type SiteBrand,
  SiteFooterView,
  SiteHeaderView,
  type LogoLook,
} from '@/components/site/SiteChrome'
import { SiteNoticeView } from '@/components/site/SiteNoticeView'
import { hasTopBar, SiteTopBarView } from '@/components/site/SiteTopBarView'
import { externalLink, isSafeURL, validateExternalURL, validateLinkInput } from '@/lib/links'
import { distinctPageTitles } from '@/lib/pageTitle'
import { activeNotice, NOTICE_MAX } from '@/lib/notice'
import {
  FOOTER_COLUMN_LIMIT,
  FOOTER_LINK_LIMIT,
  MENU_GROUP_LIMIT,
  MENU_LIMIT,
  TOPBAR_LABEL_MAX,
} from '@/lib/menu'
import { panelHref } from '@/lib/panel'
import type { Header, Media } from '@/payload-types'
import type { PageSummary } from '@/puck/summary'

import {
  ConflictError,
  discardMenuAndFooter,
  type FooterData,
  type GlobalBase,
  type HeaderData,
  publishMenuAndFooter,
  saveGlobalDraft,
} from './api'
import { ConflictNotice, leaving, reloadWithoutWarning } from './ConflictNotice'
import { DiscardButton } from './DiscardButton'
import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'
import { SaveStatus } from './SaveStatus'
import { SiteFrame } from './SiteFrame'
import { WhyDisabled } from './WhyDisabled'

const LABEL_LIMIT = 30
const CTA_TITLE_LIMIT = 50

type Item = NonNullable<Header['items']>[number]
type Child = NonNullable<Item['children']>[number]
type LinkValue = NonNullable<Item['link']>
type FooterColumnData = Footer['columns'][number]
type Footer = FooterData
type HeaderState = {
  items: Item[]
  button: NonNullable<Header['button']>
  notice: NonNullable<Header['notice']>
  topBar: NonNullable<Header['topBar']>
  showButton: boolean
}

type Props = {
  adminRoute: string
  apiRoute: string
  initial: {
    header: Omit<HeaderState, 'showButton'>
    footer: Footer
    pending: boolean
    /** Datas das versões que a tela abriu, para conferir antes de salvar (A3). */
    versions: { header: string; footer: string }
  }
  pages: PageSummary[]
  site: {
    name: string
    logo: Media | null
    contact: FooterContact
    social: FooterSocial[]
    whatsappHref: string | null
    privacyHref: string | null
    theme: Record<string, string>
    fontFaces: string | null
    brand: SiteBrand
    shortcuts: HeaderShortcuts
    logoRing: { header: boolean; footer: boolean }
    look: LogoLook
    /** Razão social, CNPJ e responsável técnico (D3), já na ordem do rodapé. */
    company: string[]
  }
}

/**
 * Se o menu cabe ao lado do nome numa tela de computador comum (1280 px), conta feita pelas letras
 * (T4): `one` cabe numa linha; `rows` vai para a segunda linha; `wrap` nem a segunda linha comporta.
 * Média de largura das letras do topo (15 px, peso 500) e do nome (21 px, negrito).
 */
export function estimateMenuFit(
  name: string,
  hasLogo: boolean,
  labels: string[],
  button: string,
): 'one' | 'rows' | 'wrap' {
  const LINE = 1184
  const texts = labels.map((label) => label.trim()).filter(Boolean)
  const menu =
    texts.reduce((sum, label) => sum + label.length * 7.8, 0) + Math.max(0, texts.length - 1) * 22
  const brand = name.trim().length * 11 + (hasLogo ? 56 : 0)
  const cta = button ? button.length * 8 + 66 : 0
  if (brand + 18 + menu + cta <= LINE) return 'one'
  return menu <= LINE ? 'rows' : 'wrap'
}

type SaveState = 'idle' | 'waiting' | 'saving' | 'error'

const pageID = (link: LinkValue | undefined) =>
  typeof link?.page === 'object' ? (link.page?.id ?? null) : (link?.page ?? null)

/** Id de linha do Payload para um item novo (texto de 24 letras, como os que ele cria). */
const newRowID = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24)

export function MenuEditor({ adminRoute, apiRoute, initial, pages, site }: Props) {
  const router = useRouter()
  const [header, setHeader] = useState<HeaderState>({
    ...initial.header,
    showButton: Boolean(initial.header.button.label),
  })
  const [footer, setFooter] = useState<Footer>(initial.footer)
  const [pending, setPending] = useState(initial.pending)
  const [save, setSave] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  // Outra aba salvou o menu ou o rodapé depois que esta tela abriu (A3).
  const [conflict, setConflict] = useState<{ header?: string; footer?: string } | null>(null)
  const bases = useRef<{ header: GlobalBase; footer: GlobalBase }>({
    header: { current: initial.versions.header },
    footer: { current: initial.versions.footer },
  })
  // Link que acabou de sair do menu, com "Desfazer" (B4).
  const [removed, setRemoved] = useState<{ item: Item; index: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  // Parte da prévia em destaque: segue o foco (topo nos links e no botão, rodapé no Rodapé).
  const [part, setPart] = useState<'all' | 'header' | 'footer'>('all')
  const [fullPreview, setFullPreview] = useState(false)
  const dirty = useRef<{ header: boolean; footer: boolean }>({ header: false, footer: false })
  const [version, setVersion] = useState(0)

  const pageById = new Map(pages.map((page) => [page.id, page]))

  const changeHeader = (next: HeaderState) => {
    setHeader(next)
    dirty.current.header = true
    setSave('waiting')
    setVersion((value) => value + 1)
  }
  const changeFooter = (next: Partial<Footer>) => {
    setFooter((value) => ({ ...value, ...next }))
    dirty.current.footer = true
    setSave('waiting')
    setVersion((value) => value + 1)
  }

  // Rascunho salvo sozinho, um pouco depois da última mudança.
  useEffect(() => {
    if (!version || conflict) return
    const timer = setTimeout(async () => {
      const { header: headerDirty, footer: footerDirty } = dirty.current
      dirty.current = { header: false, footer: false }
      setSave('saving')
      try {
        if (headerDirty) {
          await saveGlobalDraft(apiRoute, 'header', toHeaderData(header), bases.current.header)
        }
        if (footerDirty) {
          await saveGlobalDraft(apiRoute, 'footer', footer, bases.current.footer)
        }
        setPending(true)
        setSaveError(null)
        setSave('idle')
      } catch (error) {
        dirty.current = {
          header: dirty.current.header || headerDirty,
          footer: dirty.current.footer || footerDirty,
        }
        if (error instanceof ConflictError) {
          setConflict({ [headerDirty ? 'header' : 'footer']: error.latest })
          setSave('waiting')
          return
        }
        setSaveError(errorText(error))
        setSave('error')
      }
    }, 1200)
    return () => clearTimeout(timer)
    // Só a contagem de mudanças dispara: o estado lido é o desta mudança.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, conflict])

  /** "Manter a minha": a versão da outra aba vira a base e a desta tela vai por cima. */
  const keepMine = () => {
    if (conflict?.header) bases.current.header.current = conflict.header
    if (conflict?.footer) bases.current.footer.current = conflict.footer
    // A outra parte também pode ter mudado: confere de novo ao salvar.
    setConflict(null)
    setSave('waiting')
    setVersion((value) => value + 1)
  }

  // O "Desfazer" some depois de alguns segundos.
  useEffect(() => {
    if (!removed) return
    const timer = setTimeout(() => setRemoved(null), 8000)
    return () => clearTimeout(timer)
  }, [removed])

  // Aviso ao fechar a aba com mudança ainda não guardada.
  useEffect(() => {
    if (save !== 'waiting' && save !== 'saving' && save !== 'error') return
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!leaving.on) event.preventDefault()
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [save])

  const problems = findProblems(header, footer, pageById)

  const publish = async () => {
    if (problems.length) {
      setMessage({ tone: 'error', text: problems[0] })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      dirty.current = { header: false, footer: false }
      await publishMenuAndFooter(apiRoute, toHeaderData(header), footer, bases.current)
      setPending(false)
      setSave('idle')
      setMessage({ tone: 'ok', text: 'Menu e rodapé publicados em todas as páginas.' })
      router.refresh()
    } catch (error) {
      if (error instanceof ConflictError) {
        setConflict({ header: error.latest })
        return
      }
      setMessage({ tone: 'error', text: `Não deu para publicar: ${errorText(error)}` })
    } finally {
      setBusy(false)
    }
  }

  const discard = async () => {
    setBusy(true)
    setMessage(null)
    try {
      dirty.current = { header: false, footer: false }
      const published = await discardMenuAndFooter(apiRoute, bases.current)
      setConflict(null)
      setHeader({ ...published.header, showButton: Boolean(published.header.button.label) })
      setFooter(published.footer)
      setPending(false)
      setSave('idle')
      setMessage({ tone: 'ok', text: 'Mudanças descartadas. Voltou a ser igual ao site no ar.' })
      router.refresh()
    } catch (error) {
      setMessage({
        tone: 'error',
        text: `Não deu para descartar: ${error instanceof Error ? error.message : 'tente de novo.'}`,
      })
    } finally {
      setBusy(false)
    }
  }

  // Prévia: o que o visitante veria se publicasse agora (links para rascunho somem, como no site).
  const previewHref = (link: LinkValue | undefined): string | null => {
    if (!link) return null
    if (link.kind === 'whatsapp') return site.whatsappHref
    if (link.kind === 'url') return link.url && isSafeURL(link.url) ? link.url : null
    const page = pageById.get(pageID(link) ?? 0)
    return page?.published ? '/' : null
  }
  const previewItems: MenuItem[] = header.items.flatMap((item, index): MenuItem[] => {
    const id = item.id ?? String(index)
    if (item.children?.length) {
      const children = item.children.flatMap((child, childIndex): MenuItem[] => {
        const href = previewHref(child.link)
        return href && child.label.trim()
          ? [{ id: child.id ?? `${id}-${childIndex}`, label: child.label, href, current: false }]
          : []
      })
      return children.length && item.label.trim()
        ? [{ id, label: item.label, href: '', current: false, children }]
        : []
    }
    const href = previewHref(item.link)
    return href && item.label.trim() ? [{ id, label: item.label, href, current: false }] : []
  })
  const previewColumns = footer.columns.map((column) => ({
    id: column.id,
    title: column.title.trim(),
    links: column.links.flatMap((link): MenuItem[] => {
      const href = previewHref(link.link)
      return href && link.label.trim()
        ? [{ id: link.id, label: link.label, href, current: false }]
        : []
    }),
  }))
  const topBarLabel = (header.topBar.linkLabel ?? '').trim()
  const topBarHref = topBarLabel ? previewHref(header.topBar.link) : null
  const previewTopBar = {
    phone:
      header.topBar.phone && site.contact.phone && site.contact.phoneHref
        ? { label: site.contact.phone, href: site.contact.phoneHref }
        : null,
    hours: header.topBar.hours ? site.contact.hours?.trim() || null : null,
    link: topBarLabel && topBarHref ? { label: topBarLabel, href: topBarHref } : null,
  }
  const buttonLabel = header.showButton ? (header.button.label ?? '').trim() : ''
  const buttonHref = buttonLabel ? previewHref(header.button.link) : null
  const menuFit = estimateMenuFit(
    // A3: só o logo no topo (até 200 px, perto de 18 letras); o nome não ocupa lugar.
    site.logo && !site.look.showName ? 'x'.repeat(18) : site.name,
    Boolean(site.logo) && site.look.showName,
    header.items.map((item) => item.label),
    buttonLabel,
  )

  const changed = pending || save !== 'idle'
  const cantPublish = busy
    ? null
    : conflict
      ? 'Escolha antes qual versão fica'
      : save === 'saving'
        ? 'Espere terminar de salvar'
        : !changed
          ? 'Nada para publicar'
          : null

  const setItem = (index: number, next: Partial<Item>) =>
    changeHeader({
      ...header,
      items: header.items.map((item, i) => (i === index ? { ...item, ...next } : item)),
    })
  const moveItem = (index: number, by: -1 | 1) => {
    const items = [...header.items]
    const [item] = items.splice(index, 1)
    items.splice(index + by, 0, item)
    changeHeader({ ...header, items })
  }
  /** Tira o link (ou o grupo inteiro), mostra "Desfazer" e leva o foco ao seguinte (B4). */
  const removeItem = (index: number) => {
    const item = header.items[index]
    changeHeader({ ...header, items: header.items.filter((_, i) => i !== index) })
    setRemoved({ item, index })
    requestAnimationFrame(() => {
      const rows = document.querySelectorAll<HTMLInputElement>(
        '.gp-menulist > .gp-menuitem > .gp-menuitem__field:first-child input.gp-input',
      )
      const next = rows[Math.min(index, rows.length - 1)]
      ;(next ?? document.getElementById('hf-add'))?.focus()
    })
  }
  const undoRemove = () => {
    if (!removed) return
    const items = [...header.items]
    items.splice(Math.min(removed.index, items.length), 0, removed.item)
    changeHeader({ ...header, items: items.slice(0, MENU_LIMIT) })
    setRemoved(null)
  }

  /** Uma página que ainda não está no menu (nem dentro de um grupo), para um link novo. */
  const nextPageLink = (): { label: string; link: LinkValue } => {
    const inMenu = new Set(
      header.items.flatMap((item) => [item, ...(item.children ?? [])]).map((i) => pageID(i.link)),
    )
    const page =
      pages.find((p) => p.published && !inMenu.has(p.id)) ??
      pages.find((p) => !inMenu.has(p.id)) ??
      pages[0]
    return page
      ? { label: page.title.slice(0, LABEL_LIMIT), link: { kind: 'page', page: page.id } }
      : { label: 'WhatsApp', link: { kind: 'whatsapp' } }
  }

  const addItem = () => {
    changeHeader({ ...header, items: [...header.items, { id: newRowID(), ...nextPageLink() }] })
  }

  // M1: grupos do menu. O link vira o primeiro de dentro do grupo, que fica com o mesmo nome.
  const makeGroup = (index: number) => {
    const item = header.items[index]
    setItem(index, {
      link: { kind: 'page', page: null },
      children: [{ id: newRowID(), label: item.label, link: item.link }],
    })
    requestAnimationFrame(() =>
      document.getElementById(`hf-group-${index}`)?.focus({ preventScroll: false }),
    )
  }
  const setChildren = (index: number, children: Child[]) => {
    const item = header.items[index]
    // Sem nenhum link dentro, o grupo volta a ser um link comum, com o destino do último.
    if (!children.length) {
      const last = item.children?.[0]
      setItem(index, { children: [], link: last?.link ?? { kind: 'page', page: null } })
      return
    }
    setItem(index, { children })
  }
  const setChild = (index: number, childIndex: number, next: Partial<Child>) =>
    setChildren(
      index,
      (header.items[index].children ?? []).map((child, i) =>
        i === childIndex ? { ...child, ...next } : child,
      ),
    )
  const moveChild = (index: number, childIndex: number, by: -1 | 1) => {
    const children = [...(header.items[index].children ?? [])]
    const [child] = children.splice(childIndex, 1)
    children.splice(childIndex + by, 0, child)
    setChildren(index, children)
  }
  const removeChild = (index: number, childIndex: number) =>
    setChildren(
      index,
      (header.items[index].children ?? []).filter((_, i) => i !== childIndex),
    )
  const addChild = (index: number) =>
    setChildren(index, [
      ...(header.items[index].children ?? []),
      { id: newRowID(), ...nextPageLink() },
    ])

  // M1: colunas de links do rodapé.
  const setColumns = (columns: FooterColumnData[]) => changeFooter({ columns })
  const setColumn = (index: number, next: Partial<FooterColumnData>) =>
    setColumns(footer.columns.map((column, i) => (i === index ? { ...column, ...next } : column)))
  const moveColumn = (index: number, by: -1 | 1) => {
    const columns = [...footer.columns]
    const [column] = columns.splice(index, 1)
    columns.splice(index + by, 0, column)
    setColumns(columns)
  }
  const addColumn = () =>
    setColumns([
      ...footer.columns,
      { id: newRowID(), title: '', links: [{ id: newRowID(), ...nextPageLink() }] },
    ])
  const setColumnLinks = (index: number, links: FooterColumnData['links']) =>
    setColumn(index, { links })
  const moveColumnLink = (index: number, linkIndex: number, by: -1 | 1) => {
    const links = [...footer.columns[index].links]
    const [link] = links.splice(linkIndex, 1)
    links.splice(linkIndex + by, 0, link)
    setColumnLinks(index, links)
  }

  // O que a prévia desenha; a mesma coisa na miniatura e na janela de tamanho real.
  const notice = activeNotice(header.notice)
  const previewContent = (
    <>
      {part !== 'footer' && notice && <SiteNoticeView text={notice.text} />}
      {part !== 'footer' && hasTopBar(previewTopBar) && <SiteTopBarView bar={previewTopBar} />}
      {part !== 'footer' && (
        <SiteHeaderView
          brand={site.brand}
          button={buttonHref ? { label: buttonLabel, href: buttonHref } : null}
          items={previewItems}
          logo={site.logo}
          logoRing={site.logoRing.header}
          look={site.look}
          name={site.name}
          shortcuts={site.shortcuts}
        />
      )}
      {part === 'all' && (
        <div
          style={{
            padding: '56px 16px',
            textAlign: 'center',
            fontWeight: 600,
            opacity: 0.6,
            background: 'var(--color-surface)',
          }}
        >
          Conteúdo da página
        </div>
      )}
      {part !== 'header' && (
        <SiteFooterView
          backToTop={footer.showBackToTop}
          brand={site.brand}
          columns={previewColumns}
          company={site.company}
          contact={site.contact}
          cta={
            footer.cta.show && buttonHref
              ? {
                  title: footer.cta.title.trim() || DEFAULT_CTA_TITLE,
                  button: { label: buttonLabel, href: buttonHref },
                }
              : null
          }
          logo={site.logo}
          logoRing={site.logoRing.footer}
          look={site.look}
          menu={footer.showMenu ? previewItems : []}
          name={site.name}
          privacyHref={site.privacyHref}
          showContact={footer.showContact}
          showHours={footer.showHours}
          social={footer.showSocial ? site.social : []}
          text={footer.text || null}
        />
      )}
    </>
  )

  return (
    <div className="gp-page" role="main">
      <header className="gp-pagehead">
        <div>
          <h1>Menu e rodapé</h1>
          <p>O topo e o rodapé aparecem iguais em todas as páginas. Você muda aqui uma vez só.</p>
        </div>
        <SaveStatus
          blocked={conflict ? 'Não salvo: escolha a versão' : null}
          error={save === 'error' ? saveError : null}
          mode="publish"
          onRetry={() => {
            setSave('waiting')
            setVersion((value) => value + 1)
          }}
          pending={pending}
          state={save === 'error' ? 'error' : save === 'idle' ? 'saved' : 'saving'}
        />
      </header>

      <div className="gp-pubbar">
        <div className="gp-actions">
          {pending && (
            <DiscardButton
              detail="Os links, o botão de destaque e o rodapé voltam a ser os que estão no ar."
              disabled={busy}
              onDiscard={discard}
              what="Menu e rodapé"
            />
          )}
          <div className="gp-btnwrap">
            <button
              aria-describedby={cantPublish ? 'hf-why' : undefined}
              className="gp-btn gp-btn--primary"
              disabled={busy || Boolean(cantPublish)}
              onClick={publish}
              type="button"
            >
              {busy ? 'Aguarde…' : 'Publicar menu e rodapé'}
            </button>
            <WhyDisabled id="hf-why" reason={cantPublish} />
          </div>
        </div>
      </div>

      {conflict && (
        <ConflictNotice
          onKeepMine={keepMine}
          onSeeLatest={reloadWithoutWarning}
          what={conflict.footer && !conflict.header ? 'O rodapé' : 'O menu'}
        />
      )}

      {message && (
        <p className={message.tone === 'ok' ? 'gp-notice' : 'gp-error'} role="status">
          {message.text}
        </p>
      )}

      <div className="gp-hfl">
        <div className="gp-hfl__forms">
          <section className="gp-card" onFocus={() => setPart('header')}>
            <div>
              <h2>Links do menu</h2>
              <p className="gp-small gp-muted">
                A ordem aqui é a ordem no site. Até {MENU_LIMIT} itens no topo; um grupo conta como
                um e abre uma lista com até {MENU_GROUP_LIMIT} links.
              </p>
            </div>
            <ol className="gp-menulist">
              {header.items.map((item, index) => {
                const moves = (
                  <RowMoves
                    count={header.items.length}
                    index={index}
                    name={item.label.trim() || `o link ${index + 1}`}
                    onMove={(by) => moveItem(index, by)}
                    onRemove={() => removeItem(index)}
                    removeText={
                      item.children?.length ? 'do menu, com os links de dentro' : 'do menu'
                    }
                  />
                )
                if (item.children?.length) {
                  const groupName = item.label.trim() || `Grupo ${index + 1}`
                  return (
                    <li className="gp-menuitem gp-menuitem--group" key={item.id ?? index}>
                      <div className="gp-menuitem__field">
                        <span aria-hidden="true" className="gp-menuitem__label">
                          Nome do grupo
                        </span>
                        <input
                          aria-label={`Nome do grupo ${index + 1}`}
                          className="gp-input"
                          id={`hf-group-${index}`}
                          maxLength={LABEL_LIMIT}
                          onChange={(event) => setItem(index, { label: event.target.value })}
                          placeholder="Ex.: Serviços"
                          value={item.label}
                        />
                      </div>
                      {moves}
                      <ol aria-label={`Links dentro de ${groupName}`} className="gp-menugroup">
                        {item.children.map((child, childIndex) => (
                          <LinkRow
                            count={item.children?.length ?? 0}
                            index={childIndex}
                            key={child.id ?? childIndex}
                            label={child.label}
                            link={child.link}
                            name={`${childIndex + 1} de ${groupName}`}
                            onLabel={(label) => setChild(index, childIndex, { label })}
                            onLink={(link) => setChild(index, childIndex, { link })}
                            onMove={(by) => moveChild(index, childIndex, by)}
                            onRemove={() => removeChild(index, childIndex)}
                            pageById={pageById}
                            pages={pages}
                            removeText={`de ${groupName}`}
                            whatsapp={site.whatsappHref}
                          />
                        ))}
                      </ol>
                      <div className="gp-addrow gp-menugroup__add">
                        <button
                          className="gp-btn gp-btn--sm"
                          disabled={item.children.length >= MENU_GROUP_LIMIT}
                          onClick={() => addChild(index)}
                          type="button"
                        >
                          <PanelIcon name="plus" size={14} />
                          Adicionar link em {groupName}
                        </button>
                        {item.children.length >= MENU_GROUP_LIMIT && (
                          <span className="gp-hint">
                            O grupo já tem {MENU_GROUP_LIMIT} links, o máximo.
                          </span>
                        )}
                      </div>
                    </li>
                  )
                }
                return (
                  <LinkRow
                    count={header.items.length}
                    extra={
                      <button
                        className="gp-btn gp-btn--sm gp-btn--ghost gp-menuitem__makegroup"
                        onClick={() => makeGroup(index)}
                        type="button"
                      >
                        <PanelIcon name="plus" size={14} />
                        Pôr links dentro deste (vira um grupo)
                      </button>
                    }
                    index={index}
                    key={item.id ?? index}
                    label={item.label}
                    link={item.link}
                    moves={moves}
                    name={String(index + 1)}
                    onLabel={(label) => setItem(index, { label })}
                    onLink={(link) => setItem(index, { link })}
                    onMove={(by) => moveItem(index, by)}
                    onRemove={() => removeItem(index)}
                    pageById={pageById}
                    pages={pages}
                    whatsapp={site.whatsappHref}
                  />
                )
              })}
            </ol>
            {header.items.length === 0 && (
              <p className="gp-small gp-muted">O menu está vazio. Só a marca aparece no topo.</p>
            )}
            {menuFit !== 'one' && (
              <p className="gp-hint gp-hint--warn gp-menufit">
                {menuFit === 'rows'
                  ? 'Com estes nomes, o menu não cabe ao lado do nome do site. No computador, os links vão para uma segunda linha, embaixo do nome; em telas menores, para o ☰.'
                  : 'Os nomes do menu somam mais letras do que cabem numa linha: no computador, os links vão ocupar mais de uma linha embaixo do nome. Nomes curtos, de uma ou duas palavras, deixam o topo mais limpo.'}
              </p>
            )}
            {removed && (
              <p className="gp-notice gp-undo" role="status">
                <span>“{removed.item.label.trim() || 'Link sem texto'}” saiu do menu.</span>
                <button className="gp-btn gp-btn--sm" onClick={undoRemove} type="button">
                  Desfazer
                </button>
              </p>
            )}
            <div className="gp-addrow">
              <button
                aria-describedby={header.items.length >= MENU_LIMIT ? 'hf-add-why' : undefined}
                className="gp-btn gp-btn--sm"
                disabled={header.items.length >= MENU_LIMIT}
                id="hf-add"
                onClick={addItem}
                type="button"
              >
                <PanelIcon name="plus" size={14} />
                Adicionar link
              </button>
              {header.items.length >= MENU_LIMIT && (
                <span className="gp-hint" id="hf-add-why">
                  O menu já tem {MENU_LIMIT} itens, o máximo que cabe no topo do site. Tire um ou
                  ponha links dentro de um grupo.
                </span>
              )}
            </div>
          </section>

          <section className="gp-card" onFocus={() => setPart('header')}>
            <h2>Botão de destaque no topo</h2>
            <label className="gp-switch">
              <input
                checked={header.showButton}
                onChange={(event) =>
                  changeHeader({
                    ...header,
                    showButton: event.target.checked,
                    button:
                      event.target.checked && !header.button.label
                        ? { label: 'Fale com a gente', link: { kind: 'whatsapp' } }
                        : header.button,
                  })
                }
                type="checkbox"
              />
              Mostrar botão
            </label>
            {header.showButton && (
              <>
                <div className="gp-field">
                  <label htmlFor="hf-btn-label">Texto do botão</label>
                  <input
                    className="gp-input"
                    id="hf-btn-label"
                    maxLength={LABEL_LIMIT}
                    onChange={(event) =>
                      changeHeader({
                        ...header,
                        button: { ...header.button, label: event.target.value },
                      })
                    }
                    value={header.button.label ?? ''}
                  />
                </div>
                <div className="gp-field">
                  <span className="gp-label">Leva para</span>
                  <LinkPicker
                    label="Para onde o botão leva"
                    onChange={(link) =>
                      changeHeader({ ...header, button: { ...header.button, link } })
                    }
                    pages={pages}
                    value={header.button.link}
                    whatsapp={Boolean(site.whatsappHref)}
                  />
                  <LinkWarning
                    link={header.button.link}
                    pageById={pageById}
                    whatsapp={site.whatsappHref}
                  />
                </div>
              </>
            )}
          </section>

          <section className="gp-card" onFocus={() => setPart('header')}>
            <h2>Aviso no alto do site</h2>
            <p className="gp-small gp-muted">
              Uma linha fina acima do topo, em todas as páginas. Bom para avisos que valem para o
              site inteiro, como horário de feriado ou uma promoção.
            </p>
            <div className="gp-field">
              <label htmlFor="hf-notice-text">Texto do aviso</label>
              <input
                className="gp-input"
                id="hf-notice-text"
                maxLength={NOTICE_MAX}
                onChange={(event) =>
                  changeHeader({
                    ...header,
                    notice: { ...header.notice, text: event.target.value },
                  })
                }
                placeholder="Ex.: Fechado no feriado de 25/12"
                value={header.notice.text ?? ''}
              />
              <span className="gp-small gp-muted">
                {(header.notice.text ?? '').length} de {NOTICE_MAX} letras. Vazio: sem aviso.
              </span>
            </div>
            <div className="gp-field">
              <label htmlFor="hf-notice-until">Mostrar até (opcional)</label>
              <input
                className="gp-input"
                id="hf-notice-until"
                onChange={(event) =>
                  changeHeader({
                    ...header,
                    notice: {
                      ...header.notice,
                      until: event.target.value ? `${event.target.value}T12:00:00.000Z` : null,
                    },
                  })
                }
                type="date"
                value={(header.notice.until ?? '').slice(0, 10)}
              />
              <span className="gp-small gp-muted">{noticeEndText(header.notice)}</span>
            </div>
          </section>

          <section className="gp-card" onFocus={() => setPart('header')}>
            <div>
              <h2>Linha de cima</h2>
              <p className="gp-small gp-muted">
                Opcional. Uma linha fina acima do topo, com o telefone, o horário ou um link curto.
                No celular, o horário não aparece, para caber numa linha.
              </p>
            </div>
            <label className="gp-switch">
              <input
                checked={Boolean(header.topBar.phone)}
                disabled={!site.contact.phoneHref && !header.topBar.phone}
                onChange={(event) =>
                  changeHeader({
                    ...header,
                    topBar: { ...header.topBar, phone: event.target.checked },
                  })
                }
                type="checkbox"
              />
              Mostrar o telefone{site.contact.phone ? ` (${site.contact.phone})` : ''}
            </label>
            <label className="gp-switch">
              <input
                checked={Boolean(header.topBar.hours)}
                disabled={!site.contact.hours?.trim() && !header.topBar.hours}
                onChange={(event) =>
                  changeHeader({
                    ...header,
                    topBar: { ...header.topBar, hours: event.target.checked },
                  })
                }
                type="checkbox"
              />
              Mostrar o horário
            </label>
            {(!site.contact.phoneHref || !site.contact.hours?.trim()) && (
              <span className="gp-hint">
                {!site.contact.phoneHref && !site.contact.hours?.trim()
                  ? 'Telefone e horário'
                  : !site.contact.phoneHref
                    ? 'O telefone'
                    : 'O horário'}{' '}
                vêm de{' '}
                <Link className="gp-link" href={panelHref(adminRoute, 'settings')}>
                  Configurações
                </Link>
                . Preencha lá para poder mostrar aqui.
              </span>
            )}
            <div className="gp-field">
              <label htmlFor="hf-topbar-label">Link curto (opcional)</label>
              <input
                className="gp-input"
                id="hf-topbar-label"
                maxLength={TOPBAR_LABEL_MAX}
                onChange={(event) =>
                  changeHeader({
                    ...header,
                    topBar: { ...header.topBar, linkLabel: event.target.value },
                  })
                }
                placeholder="Ex.: Trabalhe conosco"
                value={header.topBar.linkLabel ?? ''}
              />
            </div>
            {topBarLabel && (
              <div className="gp-field">
                <span className="gp-label">Leva para</span>
                <LinkPicker
                  label="Para onde o link curto leva"
                  onChange={(link) =>
                    changeHeader({ ...header, topBar: { ...header.topBar, link } })
                  }
                  pages={pages}
                  value={header.topBar.link ?? undefined}
                  whatsapp={Boolean(site.whatsappHref)}
                />
                <LinkWarning
                  link={header.topBar.link ?? undefined}
                  pageById={pageById}
                  whatsapp={site.whatsappHref}
                />
              </div>
            )}
          </section>

          <section className="gp-card" onFocus={() => setPart('footer')}>
            <h2>Chamada no fim do site</h2>
            <p className="gp-small gp-muted">
              Uma faixa antes do rodapé, em todas as páginas, com o mesmo botão de destaque do topo.
              Não aparece na página que já termina com uma faixa colorida.
            </p>
            <label className="gp-switch">
              <input
                checked={footer.cta.show}
                onChange={(event) =>
                  changeFooter({ cta: { ...footer.cta, show: event.target.checked } })
                }
                type="checkbox"
              />
              Mostrar a chamada
            </label>
            {footer.cta.show && (
              <div className="gp-field">
                <label htmlFor="hf-cta-title">Título da chamada</label>
                <input
                  aria-describedby="hf-cta-hint"
                  className="gp-input"
                  id="hf-cta-title"
                  maxLength={CTA_TITLE_LIMIT}
                  onChange={(event) =>
                    changeFooter({ cta: { ...footer.cta, title: event.target.value } })
                  }
                  placeholder={DEFAULT_CTA_TITLE}
                  value={footer.cta.title}
                />
                <span className="gp-hint" id="hf-cta-hint">
                  {buttonHref
                    ? `Até ${CTA_TITLE_LIMIT} letras. O botão é o “${buttonLabel}” do topo.`
                    : 'Sem o botão de destaque no topo, a chamada não aparece no site.'}
                </span>
              </div>
            )}
          </section>

          <section className="gp-card" onFocus={() => setPart('footer')}>
            <h2>Rodapé</h2>
            <div className="gp-field">
              <label htmlFor="hf-text">Frase do rodapé</label>
              <textarea
                className="gp-input"
                id="hf-text"
                maxLength={300}
                onChange={(event) => changeFooter({ text: event.target.value })}
                rows={3}
                value={footer.text}
              />
            </div>
            <label className="gp-switch">
              <input
                checked={footer.showMenu}
                onChange={(event) => changeFooter({ showMenu: event.target.checked })}
                type="checkbox"
              />
              Repetir os links do menu
            </label>
            <label className="gp-switch">
              <input
                checked={footer.showContact}
                onChange={(event) => changeFooter({ showContact: event.target.checked })}
                type="checkbox"
              />
              Mostrar contato e endereço
            </label>
            <label className="gp-switch">
              <input
                checked={footer.showSocial}
                onChange={(event) => changeFooter({ showSocial: event.target.checked })}
                type="checkbox"
              />
              Mostrar as redes sociais
            </label>
            <label className="gp-switch">
              <input
                checked={footer.showHours}
                onChange={(event) => changeFooter({ showHours: event.target.checked })}
                type="checkbox"
              />
              Mostrar o horário de funcionamento
            </label>
            <label className="gp-switch">
              <input
                checked={footer.showBackToTop}
                onChange={(event) => changeFooter({ showBackToTop: event.target.checked })}
                type="checkbox"
              />
              Mostrar “Voltar ao topo”
            </label>
            <span className="gp-small gp-muted">
              Telefone, e-mail, endereço, horário e redes vêm de{' '}
              <Link className="gp-link" href={panelHref(adminRoute, 'settings')}>
                Configurações
              </Link>
              .
            </span>
          </section>
          <section className="gp-card" onFocus={() => setPart('footer')}>
            <div>
              <h2>Colunas de links no rodapé</h2>
              <p className="gp-small gp-muted">
                Opcional. Até {FOOTER_COLUMN_LIMIT} colunas com título, cada uma com até{' '}
                {FOOTER_LINK_LIMIT} links. Aparecem depois de “Páginas”.
              </p>
            </div>
            {footer.columns.map((column, index) => {
              const columnName = column.title.trim() || `Coluna ${index + 1}`
              return (
                <div className="gp-menuitem gp-menuitem--group gp-footcol" key={column.id}>
                  <div className="gp-menuitem__field">
                    <span aria-hidden="true" className="gp-menuitem__label">
                      Título da coluna
                    </span>
                    <input
                      aria-label={`Título da coluna ${index + 1}`}
                      className="gp-input"
                      id={`hf-col-${index}`}
                      maxLength={LABEL_LIMIT}
                      onChange={(event) => setColumn(index, { title: event.target.value })}
                      placeholder="Ex.: Institucional"
                      value={column.title}
                    />
                  </div>
                  <RowMoves
                    count={footer.columns.length}
                    index={index}
                    name={columnName}
                    onMove={(by) => moveColumn(index, by)}
                    onRemove={() => setColumns(footer.columns.filter((_, i) => i !== index))}
                    removeText="do rodapé"
                  />
                  <ol aria-label={`Links de ${columnName}`} className="gp-menugroup">
                    {column.links.map((link, linkIndex) => (
                      <LinkRow
                        count={column.links.length}
                        index={linkIndex}
                        key={link.id}
                        label={link.label}
                        link={link.link}
                        name={`${linkIndex + 1} de ${columnName}`}
                        onLabel={(label) =>
                          setColumnLinks(
                            index,
                            column.links.map((item, i) =>
                              i === linkIndex ? { ...item, label } : item,
                            ),
                          )
                        }
                        onLink={(value) =>
                          setColumnLinks(
                            index,
                            column.links.map((item, i) =>
                              i === linkIndex ? { ...item, link: value } : item,
                            ),
                          )
                        }
                        onMove={(by) => moveColumnLink(index, linkIndex, by)}
                        onRemove={() =>
                          setColumnLinks(
                            index,
                            column.links.filter((_, i) => i !== linkIndex),
                          )
                        }
                        pageById={pageById}
                        pages={pages}
                        removeText={`de ${columnName}`}
                        textLabel="Texto do link"
                        whatsapp={site.whatsappHref}
                      />
                    ))}
                  </ol>
                  <div className="gp-addrow gp-menugroup__add">
                    <button
                      className="gp-btn gp-btn--sm"
                      disabled={column.links.length >= FOOTER_LINK_LIMIT}
                      onClick={() =>
                        setColumnLinks(index, [
                          ...column.links,
                          { id: newRowID(), ...nextPageLink() },
                        ])
                      }
                      type="button"
                    >
                      <PanelIcon name="plus" size={14} />
                      Adicionar link em {columnName}
                    </button>
                    {column.links.length >= FOOTER_LINK_LIMIT && (
                      <span className="gp-hint">
                        A coluna já tem {FOOTER_LINK_LIMIT} links, o máximo.
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            <div className="gp-addrow">
              <button
                className="gp-btn gp-btn--sm"
                disabled={footer.columns.length >= FOOTER_COLUMN_LIMIT}
                onClick={addColumn}
                type="button"
              >
                <PanelIcon name="plus" size={14} />
                Adicionar coluna
              </button>
              {footer.columns.length >= FOOTER_COLUMN_LIMIT && (
                <span className="gp-hint">
                  O rodapé já tem {FOOTER_COLUMN_LIMIT} colunas, o máximo.
                </span>
              )}
            </div>
            <span className="gp-small gp-muted">
              Razão social, CNPJ e responsável técnico ficam em{' '}
              <Link className="gp-link" href={`${panelHref(adminRoute, 'settings')}#st-empresa`}>
                Configurações › Dados da empresa
              </Link>
              {site.company.length ? ' e já aparecem no fim do rodapé.' : '.'}
            </span>
          </section>
        </div>

        <section aria-label="Prévia" className="gp-previewbox">
          <div className="gp-previewbox__cap">
            <span>Prévia</span>
            <div className="gp-seg" role="group" aria-label="Parte da prévia">
              {(
                [
                  ['all', 'Tudo'],
                  ['header', 'Topo'],
                  ['footer', 'Rodapé'],
                ] as const
              ).map(([value, label]) => (
                <button
                  aria-pressed={part === value}
                  key={value}
                  onClick={() => setPart(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="gp-seg" role="group" aria-label="Tamanho da prévia">
              <button
                aria-pressed={device === 'desktop'}
                onClick={() => setDevice('desktop')}
                type="button"
              >
                Computador
              </button>
              <button
                aria-pressed={device === 'mobile'}
                onClick={() => setDevice('mobile')}
                type="button"
              >
                Celular
              </button>
            </div>
          </div>
          <div className="gp-previewbox__frame">
            <SiteFrame
              fontFaces={site.fontFaces}
              theme={site.theme}
              title="Prévia do topo e do rodapé"
              // Só uma parte: desenhada mais estreita, para as letras ficarem maiores.
              width={device === 'mobile' ? 390 : part === 'all' ? 1200 : 960}
            >
              {previewContent}
            </SiteFrame>
          </div>
          <button className="gp-btn gp-btn--sm" onClick={() => setFullPreview(true)} type="button">
            <PanelIcon name="eye" size={14} />
            Ver em tamanho real
          </button>
        </section>
      </div>

      {/* M8: no celular, a prévia em tela cheia, já em Celular. */}
      <button
        className="gp-btn gp-btn--primary gp-fab"
        onClick={() => {
          setDevice('mobile')
          setFullPreview(true)
        }}
        type="button"
      >
        <PanelIcon name="eye" size={16} />
        Ver prévia
      </button>

      {fullPreview && (
        <PanelDialog
          onClose={() => setFullPreview(false)}
          size="full"
          title={device === 'mobile' ? 'Prévia no celular' : 'Prévia em tamanho real'}
        >
          <div className="gp-previewbox__frame">
            <SiteFrame
              fontFaces={site.fontFaces}
              theme={site.theme}
              title="Prévia do topo e do rodapé em tamanho real"
              width={device === 'mobile' ? 390 : 1280}
            >
              {previewContent}
            </SiteFrame>
          </div>
        </PanelDialog>
      )}
    </div>
  )
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message.replace(/^./, (c) => c.toUpperCase()) : 'Tente de novo.'

/** O que acontece com o aviso, pelo dia escolhido. */
function noticeEndText(notice: HeaderState['notice']): string {
  const day = (notice.until ?? '').slice(0, 10)
  if (!day) return 'Sem dia: fica no ar até você apagar o texto.'
  const [year, month, date] = day.split('-')
  if (!activeNotice({ text: 'x', until: notice.until })) {
    return `Esse dia já passou: o aviso não aparece no site.`
  }
  return `Some sozinho depois de ${date}/${month}/${year}.`
}

/** O cabeçalho como o Payload guarda: botão desligado vai sem texto (e some do site). */
function toHeaderData(header: HeaderState): HeaderData {
  return {
    items: header.items.map((item) => ({
      ...item,
      label: item.label.trim(),
      children: (item.children ?? []).map((child) => ({ ...child, label: child.label.trim() })),
    })),
    button: {
      ...header.button,
      label: header.showButton ? (header.button.label ?? '').trim() : '',
    },
    notice: { text: (header.notice.text ?? '').trim(), until: header.notice.until || null },
    topBar: { ...header.topBar, linkLabel: (header.topBar.linkLabel ?? '').trim() },
  }
}

/** O que impediria publicar, em linguagem simples. */
function findProblems(
  header: HeaderState,
  footer: Footer,
  pageById: Map<number, PageSummary>,
): string[] {
  const problems: string[] = []
  header.items.forEach((item, index) => {
    if (item.children?.length) {
      const group = item.label.trim() ? `O grupo "${item.label.trim()}"` : `O grupo ${index + 1}`
      if (!item.label.trim()) problems.push(`${group} do menu está sem nome.`)
      item.children.forEach((child, childIndex) => {
        const name = child.label.trim()
          ? `"${child.label.trim()}"`
          : `O link ${childIndex + 1} de ${group.replace(/^O /, 'o ')}`
        if (!child.label.trim()) problems.push(`${name} está sem texto.`)
        problems.push(...linkProblems(child.link, name, pageById))
      })
      return
    }
    const name = item.label.trim() ? `"${item.label.trim()}"` : `O link ${index + 1}`
    if (!item.label.trim()) problems.push(`${name} do menu está sem texto.`)
    problems.push(...linkProblems(item.link, name, pageById))
  })
  if (header.showButton) {
    if (!header.button.label?.trim()) problems.push('O botão de destaque está sem texto.')
    problems.push(...linkProblems(header.button.link, 'O botão de destaque', pageById))
  }
  if (header.topBar.linkLabel?.trim()) {
    problems.push(
      ...linkProblems(header.topBar.link ?? undefined, 'O link da linha de cima', pageById),
    )
  }
  footer.columns.forEach((column, index) => {
    const title = column.title.trim()
      ? `A coluna "${column.title.trim()}"`
      : `A coluna ${index + 1}`
    if (!column.title.trim()) problems.push(`${title} do rodapé está sem título.`)
    column.links.forEach((link, linkIndex) => {
      const name = link.label.trim()
        ? `"${link.label.trim()}"`
        : `O link ${linkIndex + 1} de ${title.replace(/^A /, 'a ')}`
      if (!link.label.trim()) problems.push(`${name} está sem texto.`)
      problems.push(...linkProblems(link.link ?? undefined, name, pageById))
    })
  })
  return problems
}

function linkProblems(
  link: LinkValue | undefined,
  name: string,
  pageById: Map<number, PageSummary>,
): string[] {
  if (link?.kind === 'url') {
    const result = validateExternalURL(link.url)
    return result === true ? [] : [`${name}: ${result}`]
  }
  if (link?.kind === 'page' || link?.kind === 'section') {
    if (!pageById.has(pageID(link) ?? 0)) return [`${name}: escolha para qual página leva.`]
    if (link.kind === 'section' && !link.section) return [`${name}: escolha a seção.`]
  }
  return []
}

type MovesProps = {
  index: number
  count: number
  /** Nome do que se move, para o leitor de tela ("Subir Serviços"). */
  name: string
  onMove: (by: -1 | 1) => void
  onRemove: () => void
  /** "do menu", "de Serviços"… para "Tirar Contato do menu". */
  removeText: string
}

/** Subir, descer e tirar: os botões de cada linha do menu, dos grupos e das colunas do rodapé. */
function RowMoves({ index, count, name, onMove, onRemove, removeText }: MovesProps) {
  return (
    <div className="gp-menuitem__moves">
      <button
        aria-label={`Subir ${name}`}
        className="gp-iconbtn gp-iconbtn--move"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        type="button"
      >
        <PanelIcon name="up" size={18} />
        <span className="gp-menuitem__btntext">Subir</span>
      </button>
      <button
        aria-label={`Descer ${name}`}
        className="gp-iconbtn gp-iconbtn--move"
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        type="button"
      >
        <PanelIcon name="down" size={18} />
        <span className="gp-menuitem__btntext">Descer</span>
      </button>
      <button
        aria-label={`Tirar ${name} ${removeText}`}
        className="gp-iconbtn gp-iconbtn--move"
        onClick={onRemove}
        type="button"
      >
        <PanelIcon name="x" size={18} />
        <span className="gp-menuitem__btntext">Tirar</span>
      </button>
    </div>
  )
}

type LinkRowProps = Omit<MovesProps, 'name' | 'removeText'> & {
  label: string
  link: LinkValue | null | undefined
  /** Número e lugar do link, para os nomes dos campos ("2 de Serviços"). */
  name: string
  onLabel: (label: string) => void
  onLink: (link: LinkValue) => void
  pages: PageSummary[]
  pageById: Map<number, PageSummary>
  whatsapp: string | null
  /** Botões prontos (o link do topo os monta antes, para o grupo usar os mesmos). */
  moves?: React.ReactNode
  removeText?: string
  textLabel?: string
  extra?: React.ReactNode
}

/** Uma linha de link: o texto, para onde leva e os botões. */
function LinkRow({
  label,
  link,
  name,
  onLabel,
  onLink,
  pages,
  pageById,
  whatsapp,
  moves,
  removeText = 'do menu',
  textLabel = 'Texto no menu',
  extra,
  ...move
}: LinkRowProps) {
  const visible = label.trim() || `o link ${name}`
  return (
    <li className="gp-menuitem">
      <div className="gp-menuitem__field">
        <span aria-hidden="true" className="gp-menuitem__label">
          {textLabel}
        </span>
        <input
          aria-label={`Texto do link ${name}`}
          className="gp-input"
          maxLength={LABEL_LIMIT}
          onChange={(event) => onLabel(event.target.value)}
          placeholder={textLabel}
          value={label}
        />
      </div>
      <div className="gp-menuitem__field">
        <span aria-hidden="true" className="gp-menuitem__label">
          Abre a página
        </span>
        <LinkPicker
          label={`Página do link ${name}`}
          onChange={onLink}
          pages={pages}
          value={link ?? undefined}
          whatsapp={Boolean(whatsapp)}
        />
      </div>
      {moves ?? <RowMoves {...move} name={visible} removeText={removeText} />}
      <LinkWarning link={link ?? undefined} pageById={pageById} whatsapp={whatsapp} />
      {extra}
    </li>
  )
}

/** Aviso de link que não vai aparecer no site (página em rascunho, WhatsApp sem número). */
function LinkWarning({
  link,
  pageById,
  whatsapp,
}: {
  link: LinkValue | undefined
  pageById: Map<number, PageSummary>
  whatsapp: string | null
}) {
  let text: string | null = null
  if (link?.kind === 'whatsapp' && !whatsapp) {
    text = 'Falta o número do WhatsApp em Configurações. Até lá, este link não aparece.'
  }
  if (link?.kind === 'page' || link?.kind === 'section') {
    const page = pageById.get(pageID(link) ?? 0)
    if (page && !page.published) {
      text = `"${page.title}" ainda é rascunho. O link só aparece no site depois que ela for publicada.`
    }
  }
  return text ? <p className="gp-hint gp-hint--warn">{text}</p> : null
}

type PickerProps = {
  label: string
  onChange: (link: LinkValue) => void
  pages: PageSummary[]
  value: LinkValue | undefined
  whatsapp: boolean
}

/** "Leva para": uma página, uma seção de uma página, o WhatsApp ou outro site. */
function LinkPicker({ label, onChange, pages, value, whatsapp }: PickerProps) {
  const current = value?.kind ?? 'page'
  const selected =
    current === 'page'
      ? `page:${pageID(value) ?? ''}`
      : current === 'section'
        ? `section:${pageID(value) ?? ''}:${value?.section ?? ''}`
        : current
  const urlCheck = current === 'url' && value?.url ? validateLinkInput(value.url) : true
  // Duas páginas com o mesmo nome ("Início" e "Início") aparecem com o endereço junto.
  const titles = distinctPageTitles(pages)

  const choose = (option: string) => {
    const [kind, page, section] = option.split(':')
    if (kind === 'page') onChange({ kind: 'page', page: Number(page) })
    else if (kind === 'section') onChange({ kind: 'section', page: Number(page), section })
    else if (kind === 'whatsapp') onChange({ kind: 'whatsapp' })
    else onChange({ kind: 'url', url: '' })
  }

  return (
    <div className="gp-linkpicker">
      <select
        aria-label={label}
        className="gp-input"
        onChange={(event) => choose(event.target.value)}
        value={selected}
      >
        {current === 'page' && !pageID(value) && <option value="page:">Escolha uma página</option>}
        <optgroup label="Páginas">
          {pages.map((page) => (
            <option key={page.id} value={`page:${page.id}`}>
              {titles.get(page.id)}
              {page.published ? '' : ' (rascunho)'}
            </option>
          ))}
        </optgroup>
        {pages.some((page) => page.sections.length > 0) && (
          <optgroup label="Seções de uma página">
            {pages.flatMap((page) =>
              page.sections.map((section) => (
                <option key={`${page.id}:${section.id}`} value={`section:${page.id}:${section.id}`}>
                  {titles.get(page.id)} › {section.label}
                  {page.published ? '' : ' (rascunho)'}
                </option>
              )),
            )}
          </optgroup>
        )}
        <optgroup label="Outros">
          <option value="whatsapp">WhatsApp da empresa{whatsapp ? '' : ' (sem número)'}</option>
          <option value="url">Outro site, e-mail ou telefone…</option>
        </optgroup>
      </select>
      {current === 'url' && (
        <>
          <input
            aria-label={`${label}: endereço`}
            className="gp-input"
            onBlur={() => {
              // E-mail, telefone e "www.…" viram link sozinhos (achado 3.7).
              const href = externalLink(value?.url)
              if (href && href !== value?.url) onChange({ kind: 'url', url: href })
            }}
            onChange={(event) => onChange({ kind: 'url', url: event.target.value })}
            placeholder="Site, e-mail ou telefone"
            value={value?.url ?? ''}
          />
          {urlCheck !== true && <p className="gp-hint gp-hint--warn">{urlCheck}</p>}
        </>
      )}
    </div>
  )
}
