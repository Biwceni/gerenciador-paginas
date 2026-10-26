'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import { toast } from '@payloadcms/ui'
import { createUsePuck } from '@puckeditor/core'
import React, { useState } from 'react'

import { isSafeURL, validateExternalURL } from '@/lib/links'
import { youtubeID } from '@/lib/youtube'
import type { LinkRef, PhotoRef } from '@/puck/schema'

import { thumbnailURL, useEditor } from './context'
import { addMenuItem, linksTo, readMenu } from './menu'

// Campos próprios do painel de opções do editor. Os textos são editados na própria página; aqui
// ficam as escolhas: foto da biblioteca, destino de um link, vídeo.

const usePuck = createUsePuck()

// Campo ainda não preenchido pode chegar como `undefined`; os campos tratam isso.
type FieldProps<V> = {
  value: V
  onChange: (value: V) => void
  readOnly?: boolean
}

/** Uma foto da biblioteca. Guarda só o id (relação), nunca o endereço. */
export function PhotoField({ value, onChange, readOnly }: FieldProps<PhotoRef>) {
  const { photoById, pickPhoto } = useEditor()
  const photo = value ? photoById[value.mediaId] : null

  return (
    <div className="ed-photo-field">
      {photo ? (
        <img alt="" className="ed-thumb" src={thumbnailURL(photo)} />
      ) : (
        <span className="ed-thumb ed-thumb--empty">{value ? 'Foto apagada' : 'Sem foto'}</span>
      )}
      <div className="ed-photo-field__actions">
        <button
          className="ed-btn ed-btn--sm"
          disabled={readOnly}
          onClick={() => pickPhoto((picked) => onChange({ mediaId: picked.id }))}
          type="button"
        >
          {value ? 'Trocar foto' : 'Escolher foto'}
        </button>
        {value && (
          <button
            className="ed-btn ed-btn--sm ed-btn--ghost"
            disabled={readOnly}
            onClick={() => onChange(null)}
            type="button"
          >
            Tirar foto
          </button>
        )}
        {photo && <span className="ed-hint">{photo.alt}</span>}
      </div>
    </div>
  )
}

/** Fotos da galeria, na ordem em que aparecem. */
export function PhotoListField({
  value = [],
  onChange,
  readOnly,
}: FieldProps<{ mediaId: number }[]>) {
  const { photoById, pickPhoto } = useEditor()
  const move = (from: number, to: number) => {
    const next = [...value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div className="ed-photo-list">
      {value.map((ref, index) => {
        const photo = photoById[ref.mediaId]
        return (
          <div className="ed-photo-list__item" key={`${ref.mediaId}-${index}`}>
            {photo ? (
              <img alt="" className="ed-thumb ed-thumb--sm" src={thumbnailURL(photo)} />
            ) : (
              <span className="ed-thumb ed-thumb--sm ed-thumb--empty">Apagada</span>
            )}
            <span className="ed-photo-list__name">{photo?.alt ?? 'Foto apagada'}</span>
            <button
              aria-label="Subir foto"
              className="ed-icon-btn"
              disabled={readOnly || index === 0}
              onClick={() => move(index, index - 1)}
              type="button"
            >
              ↑
            </button>
            <button
              aria-label="Tirar foto da galeria"
              className="ed-icon-btn"
              disabled={readOnly}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              type="button"
            >
              ×
            </button>
          </div>
        )
      })}
      {value.length < 24 && (
        <button
          className="ed-btn ed-btn--sm"
          disabled={readOnly}
          onClick={() => pickPhoto((picked) => onChange([...value, { mediaId: picked.id }]))}
          type="button"
        >
          + Adicionar foto
        </button>
      )}
    </div>
  )
}

const OTHER_SITE = 'url'

function optionValue(link: LinkRef | undefined): string {
  if (!link) return ''
  if (link.kind === 'page') return `page:${link.pageId}`
  if (link.kind === 'section') return `section:${link.pageId}:${link.sectionId}`
  return link.kind
}

/**
 * Para onde um botão leva: WhatsApp da empresa, uma página, uma seção de uma página ou outro site.
 * Página em rascunho aparece marcada; ao publicar, a checagem avisa.
 */
export function LinkField({ value, onChange, readOnly }: FieldProps<LinkRef>) {
  const { pages, pageId, whatsappHref } = useEditor()
  // Seções desta página vêm do que está na tela agora, não do que foi salvo.
  const content = usePuck((state) => state.appState.data.content)
  const [url, setURL] = useState(value?.kind === 'url' ? value.url : '')
  const [choosingURL, setChoosingURL] = useState(value?.kind === 'url')

  const currentSections = content.flatMap((item) => {
    const label = 'menuLabel' in item.props ? String(item.props.menuLabel ?? '').trim() : ''
    return label ? [{ id: String(item.props.id), label }] : []
  })

  const select = (raw: string) => {
    setChoosingURL(raw === OTHER_SITE)
    if (raw === '') return onChange(null)
    if (raw === 'whatsapp') return onChange({ kind: 'whatsapp' })
    // Sem endereço válido ainda, o link fica vazio (e não com o destino antigo escondido).
    if (raw === OTHER_SITE) return onChange(isSafeURL(url) ? { kind: 'url', url } : null)
    const [kind, page, section] = raw.split(':')
    if (kind === 'page') return onChange({ kind: 'page', pageId: Number(page) })
    onChange({ kind: 'section', pageId: Number(page), sectionId: section })
  }

  const urlError = choosingURL && url ? validateExternalURL(url) : true
  const selected = choosingURL ? OTHER_SITE : optionValue(value)
  const linkedPage =
    value && (value.kind === 'page' || value.kind === 'section')
      ? pages.find((page) => page.id === value.pageId)
      : null

  return (
    <div className="ed-link-field">
      <select
        className="ed-input"
        disabled={readOnly}
        onChange={(event) => select(event.target.value)}
        value={selected}
      >
        <option value="">Escolha…</option>
        <option value="whatsapp">WhatsApp da empresa</option>
        <optgroup label="Páginas do site">
          {pages.map((page) => (
            <option key={page.id} value={`page:${page.id}`}>
              {page.title}
              {page.published ? '' : ' (rascunho)'}
            </option>
          ))}
        </optgroup>
        {currentSections.length > 0 && (
          <optgroup label="Seções desta página">
            {currentSections.map((section) => (
              <option key={section.id} value={`section:${pageId}:${section.id}`}>
                {section.label}
              </option>
            ))}
          </optgroup>
        )}
        {pages
          .filter((page) => page.id !== pageId && page.sections.length > 0)
          .map((page) => (
            <optgroup key={page.id} label={`Seções de ${page.title}`}>
              {page.sections.map((section) => (
                <option key={section.id} value={`section:${page.id}:${section.id}`}>
                  {section.label}
                </option>
              ))}
            </optgroup>
          ))}
        <option value={OTHER_SITE}>Outro site, e-mail ou telefone…</option>
      </select>

      {choosingURL && (
        <>
          <input
            className="ed-input"
            disabled={readOnly}
            onChange={(event) => {
              const next = event.target.value.trim()
              setURL(next)
              onChange(isSafeURL(next) ? { kind: 'url', url: next } : null)
            }}
            placeholder="https://"
            type="url"
            value={url}
          />
          {urlError !== true && <span className="ed-hint ed-hint--warn">{urlError}</span>}
        </>
      )}
      {value?.kind === 'whatsapp' && !whatsappHref && (
        <span className="ed-hint ed-hint--warn">
          O WhatsApp ainda não foi preenchido nas Configurações do site. Sem ele, o botão não
          aparece.
        </span>
      )}
      {linkedPage && !linkedPage.published && (
        <span className="ed-hint ed-hint--warn">
          Essa página ainda é rascunho. Publique ela também, senão o botão não aparece no site.
        </span>
      )}
    </div>
  )
}

/** Endereço do vídeo: o cliente cola o link do YouTube e guardamos só o código do vídeo. */
export function VideoField({ value, onChange, readOnly }: FieldProps<string>) {
  const [text, setText] = useState(value ? `https://youtu.be/${value}` : '')
  const invalid = text.trim() !== '' && !youtubeID(text)

  return (
    <div className="ed-link-field">
      <input
        className="ed-input"
        disabled={readOnly}
        onChange={(event) => {
          setText(event.target.value)
          const id = youtubeID(event.target.value)
          if (id) onChange(id)
          else if (!event.target.value.trim()) onChange('')
        }}
        placeholder="https://www.youtube.com/watch?v=…"
        type="url"
        value={text}
      />
      {invalid ? (
        <span className="ed-hint ed-hint--warn">
          Esse endereço não é de um vídeo do YouTube. Copie o link do vídeo no botão Compartilhar do
          YouTube.
        </span>
      ) : (
        <span className="ed-hint">
          O YouTube só é carregado quando o visitante clica para assistir.
        </span>
      )}
    </div>
  )
}

/**
 * "Nome no menu" de uma seção: vira a âncora dela (`/pagina#servicos`). Com o nome escrito, dá para
 * colocar a seção no menu do topo dali mesmo (sites de uma página só).
 */
export function MenuLabelField({ value, onChange, readOnly }: FieldProps<string>) {
  const { apiRoute, pageId, pages } = useEditor()
  const sectionId = usePuck((state) => state.selectedItem?.props.id as string | undefined)
  const [busy, setBusy] = useState(false)
  const label = (value ?? '').trim()
  const live = pages.find((page) => page.id === pageId)?.published

  const putInMenu = async () => {
    if (!sectionId) return
    setBusy(true)
    const menu = await readMenu(apiRoute, linksTo(pageId, sectionId))
    try {
      if (menu.kind === 'in-menu') toast.info('Esta seção já está no menu.')
      else if (menu.kind !== 'can-add') toast.info(menu.kind === 'cannot-add' ? menu.reason : '')
      else {
        await addMenuItem(apiRoute, menu.items, {
          label: label.slice(0, 30),
          link: { kind: 'section', page: pageId, section: sectionId },
        })
        toast.success(
          live
            ? 'Pronto, a seção entrou no menu. Publique a página para o link levar até ela.'
            : 'Pronto, a seção entrou no menu. O link aparece no site quando a página for publicada.',
        )
      }
    } catch (caught) {
      toast.error(`Não deu para colocar no menu: ${caught instanceof Error ? caught.message : ''}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ed-link-field">
      <input
        className="ed-input"
        disabled={readOnly}
        maxLength={40}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ex.: Serviços"
        value={value ?? ''}
      />
      <span className="ed-hint">
        Para sites de uma página: um link do menu pode levar direto até esta seção.
      </span>
      {label && (
        <button
          className="ed-btn ed-btn--sm"
          disabled={readOnly || busy || !sectionId}
          onClick={putInMenu}
          type="button"
        >
          {busy ? 'Colocando…' : '+ Colocar no menu do topo'}
        </button>
      )}
    </div>
  )
}

/** Aviso fixo no painel de opções (não guarda nada). */
export function Notice({ children }: { children: React.ReactNode }) {
  return <p className="ed-notice">{children}</p>
}
