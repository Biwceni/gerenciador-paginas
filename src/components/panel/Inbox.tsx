'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { panelHref } from '@/lib/panel'

import { deleteMessage, setMessageRead } from './api'
import type { InboxData, InboxMessage } from './data'
import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'

type Props = InboxData & {
  adminRoute: string
  apiRoute: string
  formId: number | null
}

/**
 * Caixa de entrada. A mensagem aberta fica no endereço (`?mensagem=<id>`), sem nova conta no
 * servidor: o voltar do navegador funciona e, no celular, lista e mensagem são telas separadas.
 */
export function Inbox({ adminRoute, apiRoute, filters, formId, messages, more, total }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // O que já mudou nesta tela, até a próxima leitura do servidor.
  const [readChanges, setReadChanges] = useState<Record<number, boolean>>({})
  const [removed, setRemoved] = useState<number[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const list = messages
    .filter((message) => !removed.includes(message.id))
    .map((message) => ({ ...message, read: readChanges[message.id] ?? message.read }))
  const openId = Number(searchParams.get('mensagem'))
  const open = list.find((message) => message.id === openId) ?? null

  const go = useCallback(
    (id: number | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (id) params.set('mensagem', String(id))
      else params.delete('mensagem')
      const query = params.toString()
      window.history.pushState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    },
    [searchParams],
  )

  const changeRead = useCallback(
    async (id: number, read: boolean) => {
      setReadChanges((changes) => ({ ...changes, [id]: read }))
      setError(null)
      try {
        await setMessageRead(apiRoute, id, read)
        // O número do menu e o do topo vêm do servidor.
        router.refresh()
      } catch {
        setReadChanges((changes) => ({ ...changes, [id]: !read }))
        setError('Não deu para atualizar a mensagem. Confira a internet e tente de novo.')
      }
    },
    [apiRoute, router],
  )

  // Abrir marca como lida, menos a que a pessoa acabou de marcar como não lida: ela ainda fica aberta
  // por um instante, enquanto o endereço muda.
  const keepUnread = useRef<number | null>(null)
  const unreadOpen = open && !open.read ? open.id : null
  useEffect(() => {
    if (!unreadOpen || keepUnread.current === unreadOpen) return
    const timer = setTimeout(() => changeRead(unreadOpen, true))
    return () => clearTimeout(timer)
  }, [unreadOpen, changeRead])

  const closeDialog = useCallback(() => setConfirmDelete(false), [])

  const markUnread = (message: InboxMessage) => {
    keepUnread.current = message.id
    go(null)
    void changeRead(message.id, false)
  }

  const remove = async (message: InboxMessage) => {
    setBusy(true)
    setError(null)
    try {
      await deleteMessage(apiRoute, message.id)
      setRemoved((ids) => [...ids, message.id])
      setConfirmDelete(false)
      setNotice('Mensagem excluída.')
      go(null)
      router.refresh()
    } catch (err) {
      setConfirmDelete(false)
      setError(err instanceof Error ? err.message : 'Não deu para excluir. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const messagesHref = panelHref(adminRoute, 'messages')
  const download = `${apiRoute}/form-submissions/planilha${formId ? `?formulario=${formId}` : ''}`

  return (
    <div className={`gp-page gp-inboxpage${open ? ' is-open' : ''}`}>
      <header className="gp-pagehead">
        <div>
          <h1>Mensagens</h1>
          <p>
            O que os visitantes mandaram pelos formulários do site. Cada uma também chega no seu
            e-mail.
          </p>
        </div>
        {total > 0 && (
          <a className="gp-btn" download href={download}>
            <PanelIcon name="download" size={16} />
            Baixar planilha
          </a>
        )}
      </header>

      <div aria-live="polite">
        {notice && <p className="gp-notice">{notice}</p>}
        {error && (
          <p className="gp-error" role="alert">
            {error}
          </p>
        )}
      </div>

      {filters.length > 0 && (
        <nav aria-label="Filtrar por formulário" className="gp-seg gp-inbox__filters">
          <Link aria-current={formId ? undefined : 'page'} href={messagesHref}>
            Todas ({total})
          </Link>
          {filters.map((filter) => (
            <Link
              aria-current={formId === filter.id ? 'page' : undefined}
              href={`${messagesHref}?formulario=${filter.id}`}
              key={filter.id}
            >
              {filter.title} ({filter.count})
            </Link>
          ))}
        </nav>
      )}

      <div className="gp-inbox">
        <section aria-label="Lista de mensagens" className="gp-card gp-inbox__list">
          {list.length > 0 ? (
            <ul className="gp-rows">
              {list.map((message) => (
                <li key={message.id}>
                  <button
                    aria-current={open?.id === message.id ? 'true' : undefined}
                    className={`gp-msg${message.read ? '' : ' is-unread'}`}
                    onClick={() => {
                      keepUnread.current = null
                      go(message.id)
                    }}
                    type="button"
                  >
                    <span aria-hidden="true" className="gp-msg__dot" />
                    <span className="gp-msg__text">
                      <b>
                        {message.sender}
                        {!message.read && <span className="gp-sr"> (não lida)</span>}
                      </b>
                      <span>
                        {message.formTitle}
                        {message.preview && ` · ${message.preview}`}
                      </span>
                    </span>
                    <time dateTime={message.createdAt}>{message.ago}</time>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gp-empty">
              Nenhuma mensagem ainda. Quando alguém preencher um formulário do site, ela aparece
              aqui.
            </p>
          )}
          {more && (
            <p className="gp-hint gp-inbox__more">
              Mostrando as {list.length} mais novas. A planilha traz todas.
            </p>
          )}
        </section>

        <section aria-label="Mensagem aberta" className="gp-card gp-inbox__detail">
          {open ? (
            <>
              <button
                className="gp-btn gp-btn--sm gp-btn--ghost gp-inbox__back"
                onClick={() => go(null)}
                type="button"
              >
                <PanelIcon name="back" size={14} />
                Todas as mensagens
              </button>
              <div>
                <h2>{open.sender}</h2>
                <p className="gp-small gp-muted">
                  {open.formTitle}
                  {open.pageTitle && ` · enviada na página “${open.pageTitle}”`} · {open.date}
                </p>
              </div>
              <dl className="gp-mfields">
                {open.fields.map((field) => (
                  <div key={field.name}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
              {open.consentText && (
                <p className="gp-small gp-muted">Aceitou: “{open.consentText}”</p>
              )}
              {(open.whatsappHref || open.emailHref) && (
                <div className="gp-actions">
                  {open.whatsappHref && (
                    <a
                      className="gp-btn gp-btn--primary"
                      href={open.whatsappHref}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <PanelIcon name="phone" size={16} />
                      Responder no WhatsApp
                    </a>
                  )}
                  {open.emailHref && (
                    <a className="gp-btn" href={open.emailHref}>
                      <PanelIcon name="mail" size={16} />
                      Responder por e-mail
                    </a>
                  )}
                </div>
              )}
              <div className="gp-actions gp-inbox__manage">
                <button
                  className="gp-btn gp-btn--sm gp-btn--ghost"
                  onClick={() => markUnread(open)}
                  type="button"
                >
                  Marcar como não lida
                </button>
                <button
                  className="gp-btn gp-btn--sm gp-btn--danger"
                  onClick={() => setConfirmDelete(true)}
                  type="button"
                >
                  <PanelIcon name="trash" size={14} />
                  Excluir
                </button>
              </div>
            </>
          ) : (
            <div className="gp-empty">
              <PanelIcon name="mail" size={28} />
              <p>Clique numa mensagem para ler e responder.</p>
            </div>
          )}
        </section>
      </div>

      {confirmDelete && open && (
        <PanelDialog onClose={closeDialog} title="Excluir esta mensagem?">
          <div className="gp-stack">
            <p>A mensagem de {open.sender} some do painel. Não dá para desfazer.</p>
            <div className="gp-actions gp-actions--end">
              <button className="gp-btn" onClick={closeDialog} type="button">
                Cancelar
              </button>
              <button
                className="gp-btn gp-btn--solid-danger"
                disabled={busy}
                onClick={() => remove(open)}
                type="button"
              >
                {busy ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </PanelDialog>
      )}
    </div>
  )
}
