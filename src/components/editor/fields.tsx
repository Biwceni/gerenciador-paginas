'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import { toast } from '@payloadcms/ui'
import { createUsePuck, useGetPuck } from '@puckeditor/core'
import React, { useState } from 'react'

import { PanelIcon } from '@/components/panel/PanelIcon'
import { Tip } from '@/components/panel/Tip'
import { DEFAULT_FORM, toFormDefinition } from '@/lib/forms'
import { isSafeURL, validateExternalURL } from '@/lib/links'
import { panelHref } from '@/lib/panel'
import { photoLabel } from '@/lib/photos'
import {
  BANNER_MIN_WIDTH,
  heroShowsPhoto,
  isSmallPhoto,
  SMALL_PHOTO_TEXT,
  SMALL_PHOTO_TITLE,
} from '@/lib/photoSize'
import type { Media } from '@/payload-types'
import { youtubeID } from '@/lib/youtube'
import { LIMITS } from '@/puck/limits'
import type { FormRef, LinkRef, PhotoRef } from '@/puck/schema'

import { request } from './api'
import { thumbnailURL, useEditor } from './context'
import { counterText } from './CountedField'
import { addMenuItem, linksTo, readMenu } from './menu'
import { ROOT_ZONE } from './puck'

// Campos próprios do painel de opções do editor. Os textos são editados na própria página; aqui
// ficam as escolhas: foto da biblioteca, destino de um link, vídeo.

const usePuck = createUsePuck()

// Campo ainda não preenchido pode chegar como `undefined`; os campos tratam isso.
type FieldProps<V> = {
  value: V
  onChange: (value: V) => void
  readOnly?: boolean
  /** O campo do Puck: o rótulo dele dá nome às caixas de seleção (o `FieldLabel` é uma `div`). */
  field?: { label?: string }
}

/** Aviso de foto pequena embaixo da foto (só orienta: a foto continua escolhida). */
function SmallPhotoNote({ photo, minWidth }: { photo: Media | null; minWidth?: number }) {
  if (!minWidth || !isSmallPhoto(photo, minWidth)) return null
  return <span className="ed-hint ed-hint--warn">{SMALL_PHOTO_TEXT}</span>
}

/**
 * A foto do banner: só pede 1.200 px quando o fundo escolhido mostra a foto ("Foto" ou "Foto ao
 * lado"), a mesma regra do Início e da tela Fotos (`photoNeeds`).
 */
function BannerPhotoNote({ photo }: { photo: Media | null }) {
  const style = usePuck((s) => s.selectedItem?.props.style as unknown)
  return (
    <SmallPhotoNote minWidth={heroShowsPhoto(style) ? BANNER_MIN_WIDTH : undefined} photo={photo} />
  )
}

/**
 * Uma foto da biblioteca. Guarda só o id (relação), nunca o endereço. `minWidth`: a largura para a
 * foto não ficar borrada no computador; menor que isso, aparece o aviso de foto pequena.
 */
export function PhotoField({
  value,
  onChange,
  readOnly,
  minWidth,
}: FieldProps<PhotoRef> & { minWidth?: number | 'banner' }) {
  const { photoById, pickPhoto } = useEditor()
  const photo = value ? photoById[value.mediaId] : null

  return (
    <div className="ed-photo-field">
      {photo ? (
        <img alt="" className="ed-pic" src={thumbnailURL(photo)} />
      ) : (
        <span className="ed-pic ed-pic--empty">{value ? 'Foto apagada' : 'Sem foto'}</span>
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
        {photo && <span className="ed-hint">{photo.alt?.trim() || 'Sem descrição'}</span>}
        {minWidth === 'banner' ? (
          <BannerPhotoNote photo={photo} />
        ) : (
          <SmallPhotoNote minWidth={minWidth} photo={photo} />
        )}
      </div>
    </div>
  )
}

type PhotoListItem = { mediaId: number; caption?: string }

/**
 * Fotos da galeria (ou do Instagram), na ordem em que aparecem. `captions`: uma legenda por foto,
 * com a descrição da foto como sugestão (vazia, vale a descrição). `max`: quantas cabem.
 */
export function PhotoListField<T extends PhotoListItem>({
  value = [],
  onChange,
  readOnly,
  minWidth,
  max = 24,
  captions = false,
}: FieldProps<T[]> & { minWidth?: number; max?: number; captions?: boolean }) {
  const { photoById, pickPhoto } = useEditor()
  const setCaption = (index: number, caption: string) =>
    onChange(value.map((item, i) => (i === index ? { ...item, caption } : item)))
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
              <img alt="" className="ed-pic ed-pic--sm" src={thumbnailURL(photo)} />
            ) : (
              <span className="ed-pic ed-pic--sm ed-pic--empty">Apagada</span>
            )}
            <span className="ed-photo-list__name">
              {photo ? photoLabel(photo) : 'Foto apagada'}
              {minWidth && isSmallPhoto(photo, minWidth) && (
                <span className="ed-hint ed-hint--warn">{SMALL_PHOTO_TITLE}</span>
              )}
              {captions && (
                <input
                  aria-label={`Legenda da foto ${index + 1}`}
                  className="ed-input ed-photo-list__caption"
                  disabled={readOnly}
                  maxLength={120}
                  onChange={(event) => setCaption(index, event.target.value)}
                  placeholder={photo?.alt?.trim() || 'Legenda (opcional)'}
                  value={ref.caption ?? ''}
                />
              )}
            </span>
            <button
              aria-label={`Subir a foto ${index + 1}`}
              className="ed-icon-btn"
              disabled={readOnly || index === 0}
              onClick={() => move(index, index - 1)}
              title="Subir"
              type="button"
            >
              <PanelIcon name="up" size={16} />
            </button>
            <button
              aria-label={`Descer a foto ${index + 1}`}
              className="ed-icon-btn"
              disabled={readOnly || index === value.length - 1}
              onClick={() => move(index, index + 1)}
              title="Descer"
              type="button"
            >
              <PanelIcon name="down" size={16} />
            </button>
            <button
              aria-label={`Tirar a foto ${index + 1}`}
              className="ed-icon-btn"
              disabled={readOnly}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              title="Tirar"
              type="button"
            >
              <PanelIcon name="x" size={16} />
            </button>
          </div>
        )
      })}
      {value.length < max && (
        <button
          className="ed-btn ed-btn--sm"
          disabled={readOnly}
          onClick={() =>
            pickPhoto((picked) =>
              onChange([
                ...value,
                (captions ? { mediaId: picked.id, caption: '' } : { mediaId: picked.id }) as T,
              ]),
            )
          }
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
export function LinkField({ value, onChange, readOnly, field }: FieldProps<LinkRef>) {
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
        aria-label={field?.label || 'Leva para'}
        className="ed-input"
        disabled={readOnly}
        onChange={(event) => select(event.target.value)}
        value={selected}
      >
        <option value="">Escolha…</option>
        <option value="whatsapp">WhatsApp da empresa</option>
        <optgroup label="Páginas do site">
          {/* Arquivada só aparece se for o destino que já estava escolhido. */}
          {pages
            .filter((page) => !page.archived || page.id === linkedPage?.id)
            .map((page) => (
              <option key={page.id} value={`page:${page.id}`}>
                {page.title}
                {page.archived ? ' (arquivada)' : page.published ? '' : ' (rascunho)'}
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
          .filter(
            (page) =>
              page.id !== pageId &&
              page.sections.length > 0 &&
              (!page.archived || page.id === linkedPage?.id),
          )
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
      <div
        className="ed-counted"
        data-tone={(value ?? '').length >= LIMITS.menuLabel * 0.9 ? 'near' : 'ok'}
      >
        <input
          aria-label="Nome no menu"
          className="ed-input"
          disabled={readOnly}
          maxLength={LIMITS.menuLabel}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ex.: Serviços"
          value={value ?? ''}
        />
        <span className="ed-counter">{counterText((value ?? '').length, LIMITS.menuLabel)}</span>
      </div>
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
  return <Tip>{children}</Tip>
}

/**
 * Qual formulário aparece na seção. Guarda só o id (relação). Sem nenhum formulário ainda, cria o
 * padrão (Nome, WhatsApp, E-mail e Mensagem) com um clique; os campos se mudam na tela de
 * Formulários do painel.
 */
export function FormField({ value, onChange, readOnly, field }: FieldProps<FormRef>) {
  const { adminRoute, apiRoute, forms, addForm } = useEditor()
  const [creating, setCreating] = useState(false)
  const selected = value ? forms.find((form) => form.id === value.formId) : undefined

  const createDefault = async () => {
    setCreating(true)
    try {
      const { doc } = await request<{ doc: Parameters<typeof toFormDefinition>[0] }>(
        apiRoute,
        '/forms',
        { method: 'POST', body: JSON.stringify({ ...DEFAULT_FORM, confirmationType: 'message' }) },
      )
      const form = toFormDefinition(doc)
      addForm(form)
      onChange({ formId: form.id })
    } catch (error) {
      toast.error(
        `Não deu para criar o formulário: ${error instanceof Error ? error.message : 'tente de novo.'}`,
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="ed-link-field">
      {forms.length > 0 && (
        <select
          aria-label={field?.label || 'Formulário'}
          className="ed-input"
          disabled={readOnly}
          onChange={(event) =>
            onChange(event.target.value ? { formId: Number(event.target.value) } : null)
          }
          value={selected ? String(selected.id) : ''}
        >
          <option value="">Escolha um formulário</option>
          {forms.map((form) => (
            <option key={form.id} value={form.id}>
              {form.title || `Formulário ${form.id}`}
            </option>
          ))}
        </select>
      )}
      {selected ? (
        <p className="ed-hint">
          Campos: {selected.fields.map((field) => field.label).join(', ') || 'nenhum'}.{' '}
          <a
            href={`${panelHref(adminRoute, 'forms')}/${selected.id}`}
            rel="noopener"
            target="_blank"
          >
            Mudar as perguntas
          </a>
        </p>
      ) : (
        <button
          className="ed-btn ed-btn--sm"
          disabled={readOnly || creating}
          onClick={createDefault}
          type="button"
        >
          {creating ? 'Criando…' : 'Criar formulário padrão (Nome, WhatsApp, E-mail, Mensagem)'}
        </button>
      )}
      <p className="ed-hint">
        As mensagens ficam em Mensagens, no painel, e chegam por e-mail. Quem envia precisa marcar
        que concorda com o uso dos dados.
      </p>
    </div>
  )
}

/**
 * Subir e descer um item de uma lista (os Destaques), além do arrastar do Puck. O campo fica dentro
 * do item: o nome dele diz a lista e a posição (`items[2].move`). A lista inteira volta para a
 * seção com o item no lugar novo, e o Desfazer pega a mudança.
 */
export function ArrayItemMoves({
  name,
  noun,
  label = 'title',
}: {
  name: string
  noun: string
  /** Campo do item que dá nome a ele nos botões ("Subir Bolo de pote"). */
  label?: string
}) {
  const getPuck = useGetPuck()
  const match = /^([A-Za-z]+)\[(\d+)\]\.\w+$/.exec(name)
  const list = match?.[1] ?? ''
  const index = Number(match?.[2] ?? -1)
  const items = usePuck((s) => s.selectedItem?.props[list]) as Record<string, unknown>[] | undefined
  if (!match || !Array.isArray(items)) return null
  const own = items[index]?.[label]
  const title = (typeof own === 'string' && own.trim()) || `${noun} ${index + 1}`

  const move = (by: -1 | 1) => {
    const { appState, dispatch, selectedItem } = getPuck()
    const selector = appState.ui.itemSelector
    const current = selectedItem?.props[list]
    if (!selectedItem || !selector || !Array.isArray(current)) return
    const reorder = <T,>(values: T[]) => {
      const next = [...values]
      const [item] = next.splice(index, 1)
      next.splice(index + by, 0, item)
      return next
    }
    dispatch({
      type: 'replace',
      destinationIndex: selector.index,
      destinationZone: selector.zone ?? ROOT_ZONE,
      data: { ...selectedItem, props: { ...selectedItem.props, [list]: reorder(current) } },
    })
    // O Puck guarda qual item está aberto pela posição na lista dele (`ui.arrayState`, com a chave
    // que ele monta para o campo). Mudando a ordem dela junto, o item movido continua aberto.
    const key = `${selectedItem.props.id}_array_${list}`
    const state = getPuck().appState.ui.arrayState[key]
    if (state?.items.length === current.length) {
      dispatch({
        type: 'setUi',
        ui: {
          arrayState: {
            ...appState.ui.arrayState,
            [key]: {
              ...state,
              items: reorder(state.items).map((item, at) => ({ ...item, _currentIndex: at })),
            },
          },
        },
        recordHistory: false,
      })
    }
  }

  return (
    <div className="ed-moves">
      <button
        aria-label={`Subir ${title}`}
        className="ed-btn ed-btn--sm"
        disabled={index === 0}
        onClick={() => move(-1)}
        type="button"
      >
        <PanelIcon name="up" size={16} />
        Subir
      </button>
      <button
        aria-label={`Descer ${title}`}
        className="ed-btn ed-btn--sm"
        disabled={index === items.length - 1}
        onClick={() => move(1)}
        type="button"
      >
        <PanelIcon name="down" size={16} />
        Descer
      </button>
    </div>
  )
}
