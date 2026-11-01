'use client'

import '@/app/(frontend)/styles.css'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import {
  type FooterContact,
  type FooterSocial,
  type MenuItem,
  SiteFooterView,
  SiteHeaderView,
} from '@/components/site/SiteChrome'
import { isSafeURL, validateExternalURL } from '@/lib/links'
import { panelHref } from '@/lib/panel'
import type { Header, Media } from '@/payload-types'
import type { PageSummary } from '@/puck/summary'

import { discardMenuAndFooter, type HeaderData, publishMenuAndFooter, saveGlobalDraft } from './api'
import { PanelIcon } from './PanelIcon'
import { SiteFrame } from './SiteFrame'

const MENU_LIMIT = 8
const LABEL_LIMIT = 30

type Item = NonNullable<Header['items']>[number]
type LinkValue = NonNullable<Item['link']>
type Footer = { text: string; showMenu: boolean; showContact: boolean; showSocial: boolean }
type HeaderState = { items: Item[]; button: NonNullable<Header['button']>; showButton: boolean }

type Props = {
  adminRoute: string
  apiRoute: string
  initial: {
    header: Omit<HeaderState, 'showButton'>
    footer: Footer
    pending: boolean
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
  }
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
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
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
    if (!version) return
    const timer = setTimeout(async () => {
      const { header: headerDirty, footer: footerDirty } = dirty.current
      dirty.current = { header: false, footer: false }
      setSave('saving')
      try {
        if (headerDirty) await saveGlobalDraft(apiRoute, 'header', toHeaderData(header))
        if (footerDirty) await saveGlobalDraft(apiRoute, 'footer', footer)
        setPending(true)
        setSave('idle')
      } catch {
        dirty.current = {
          header: dirty.current.header || headerDirty,
          footer: dirty.current.footer || footerDirty,
        }
        setSave('error')
      }
    }, 1200)
    return () => clearTimeout(timer)
    // Só a contagem de mudanças dispara: o estado lido é o desta mudança.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  // Aviso ao fechar a aba com mudança ainda não guardada.
  useEffect(() => {
    if (save !== 'waiting' && save !== 'saving' && save !== 'error') return
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [save])

  const problems = findProblems(header, pageById)

  const publish = async () => {
    if (problems.length) {
      setMessage({ tone: 'error', text: problems[0] })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      dirty.current = { header: false, footer: false }
      await publishMenuAndFooter(apiRoute, toHeaderData(header), footer)
      setPending(false)
      setSave('idle')
      setMessage({ tone: 'ok', text: 'Menu e rodapé publicados em todas as páginas.' })
      router.refresh()
    } catch (error) {
      setMessage({
        tone: 'error',
        text: `Não deu para publicar: ${error instanceof Error ? error.message : 'tente de novo.'}`,
      })
    } finally {
      setBusy(false)
    }
  }

  const discard = async () => {
    setBusy(true)
    setMessage(null)
    try {
      dirty.current = { header: false, footer: false }
      const published = await discardMenuAndFooter(apiRoute)
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
  const previewItems: MenuItem[] = header.items.flatMap((item, index) => {
    const href = previewHref(item.link)
    return href && item.label.trim()
      ? [{ id: item.id ?? String(index), label: item.label, href, current: false }]
      : []
  })
  const buttonLabel = header.showButton ? (header.button.label ?? '').trim() : ''
  const buttonHref = buttonLabel ? previewHref(header.button.link) : null

  const changed = pending || save !== 'idle'
  const status =
    save === 'waiting' || save === 'saving'
      ? 'Salvando…'
      : save === 'error'
        ? 'Não deu para salvar. Confira a internet.'
        : changed
          ? 'Alterações não publicadas'
          : 'No ar'

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
  const addItem = () => {
    const inMenu = new Set(header.items.map((item) => pageID(item.link)))
    const page =
      pages.find((p) => p.published && !inMenu.has(p.id)) ??
      pages.find((p) => !inMenu.has(p.id)) ??
      pages[0]
    const item: Item = page
      ? {
          id: newRowID(),
          label: page.title.slice(0, LABEL_LIMIT),
          link: { kind: 'page', page: page.id },
        }
      : { id: newRowID(), label: 'WhatsApp', link: { kind: 'whatsapp' } }
    changeHeader({ ...header, items: [...header.items, item] })
  }

  return (
    <div className="gp-page">
      <header className="gp-pagehead">
        <div>
          <h1>Menu e rodapé</h1>
          <p>O topo e o rodapé aparecem iguais em todas as páginas. Você muda aqui uma vez só.</p>
        </div>
      </header>

      <div className="gp-pubbar">
        <span aria-live="polite" className={`gp-chip gp-chip--${changed ? 'warn' : 'ok'}`}>
          {status}
        </span>
        <div className="gp-actions">
          {pending && (
            <button className="gp-btn" disabled={busy} onClick={discard} type="button">
              Descartar mudanças
            </button>
          )}
          <button
            className="gp-btn gp-btn--primary"
            disabled={busy || !changed || save === 'saving'}
            onClick={publish}
            type="button"
          >
            {busy ? 'Aguarde…' : 'Publicar menu e rodapé'}
          </button>
        </div>
      </div>

      {message && (
        <p className={message.tone === 'ok' ? 'gp-notice' : 'gp-error'} role="status">
          {message.text}
        </p>
      )}

      <div className="gp-hfl">
        <div className="gp-hfl__forms">
          <section className="gp-card">
            <div>
              <h2>Links do menu</h2>
              <p className="gp-small gp-muted">
                A ordem aqui é a ordem no site. Até {MENU_LIMIT} links.
              </p>
            </div>
            <ol className="gp-menulist">
              {header.items.map((item, index) => (
                <li className="gp-menuitem" key={item.id ?? index}>
                  <input
                    aria-label={`Texto do link ${index + 1}`}
                    className="gp-input"
                    maxLength={LABEL_LIMIT}
                    onChange={(event) => setItem(index, { label: event.target.value })}
                    placeholder="Texto no menu"
                    value={item.label}
                  />
                  <LinkPicker
                    label={`Para onde o link ${index + 1} leva`}
                    onChange={(link) => setItem(index, { link })}
                    pages={pages}
                    value={item.link}
                    whatsapp={Boolean(site.whatsappHref)}
                  />
                  <div className="gp-menuitem__moves">
                    <button
                      aria-label={`Subir "${item.label}"`}
                      className="gp-iconbtn"
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                      type="button"
                    >
                      <PanelIcon name="up" size={15} />
                    </button>
                    <button
                      aria-label={`Descer "${item.label}"`}
                      className="gp-iconbtn"
                      disabled={index === header.items.length - 1}
                      onClick={() => moveItem(index, 1)}
                      type="button"
                    >
                      <PanelIcon name="down" size={15} />
                    </button>
                    <button
                      aria-label={`Tirar "${item.label}" do menu`}
                      className="gp-iconbtn"
                      onClick={() =>
                        changeHeader({
                          ...header,
                          items: header.items.filter((_, i) => i !== index),
                        })
                      }
                      type="button"
                    >
                      <PanelIcon name="x" size={15} />
                    </button>
                  </div>
                  <LinkWarning link={item.link} pageById={pageById} whatsapp={site.whatsappHref} />
                </li>
              ))}
            </ol>
            {header.items.length === 0 && (
              <p className="gp-small gp-muted">O menu está vazio. Só a marca aparece no topo.</p>
            )}
            <div>
              <button
                className="gp-btn gp-btn--sm"
                disabled={header.items.length >= MENU_LIMIT}
                onClick={addItem}
                type="button"
              >
                <PanelIcon name="plus" size={14} />
                Adicionar link
              </button>
            </div>
          </section>

          <section className="gp-card">
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

          <section className="gp-card">
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
            <span className="gp-small gp-muted">
              Telefone, e-mail, endereço e redes vêm de{' '}
              <Link className="gp-link" href={panelHref(adminRoute, 'settings')}>
                Configurações
              </Link>
              .
            </span>
          </section>
        </div>

        <section aria-label="Prévia" className="gp-previewbox">
          <div className="gp-previewbox__cap">
            <span>Prévia</span>
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
              width={device === 'mobile' ? 390 : 1200}
            >
              <SiteHeaderView
                button={buttonHref ? { label: buttonLabel, href: buttonHref } : null}
                items={previewItems}
                logo={site.logo}
                name={site.name}
              />
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
              <SiteFooterView
                contact={site.contact}
                menu={footer.showMenu ? previewItems : []}
                name={site.name}
                privacyHref={site.privacyHref}
                showContact={footer.showContact}
                social={footer.showSocial ? site.social : []}
                text={footer.text || null}
              />
            </SiteFrame>
          </div>
        </section>
      </div>
    </div>
  )
}

/** O cabeçalho como o Payload guarda: botão desligado vai sem texto (e some do site). */
function toHeaderData(header: HeaderState): HeaderData {
  return {
    items: header.items.map((item) => ({ ...item, label: item.label.trim() })),
    button: {
      ...header.button,
      label: header.showButton ? (header.button.label ?? '').trim() : '',
    },
  }
}

/** O que impediria publicar, em linguagem simples. */
function findProblems(header: HeaderState, pageById: Map<number, PageSummary>): string[] {
  const problems: string[] = []
  header.items.forEach((item, index) => {
    const name = item.label.trim() ? `"${item.label.trim()}"` : `O link ${index + 1}`
    if (!item.label.trim()) problems.push(`${name} do menu está sem texto.`)
    problems.push(...linkProblems(item.link, name, pageById))
  })
  if (header.showButton) {
    if (!header.button.label?.trim()) problems.push('O botão de destaque está sem texto.')
    problems.push(...linkProblems(header.button.link, 'O botão de destaque', pageById))
  }
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
  const urlCheck = current === 'url' && value?.url ? validateExternalURL(value.url) : true

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
              {page.title}
              {page.published ? '' : ' (rascunho)'}
            </option>
          ))}
        </optgroup>
        {pages.some((page) => page.sections.length > 0) && (
          <optgroup label="Seções de uma página">
            {pages.flatMap((page) =>
              page.sections.map((section) => (
                <option key={`${page.id}:${section.id}`} value={`section:${page.id}:${section.id}`}>
                  {page.title} › {section.label}
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
            onChange={(event) => onChange({ kind: 'url', url: event.target.value })}
            placeholder="https://instagram.com/seunegocio"
            value={value?.url ?? ''}
          />
          {urlCheck !== true && <p className="gp-hint gp-hint--warn">{urlCheck}</p>}
        </>
      )}
    </div>
  )
}
