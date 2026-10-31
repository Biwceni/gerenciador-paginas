'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react'

import { slugify, validateSlug } from '@/lib/slug'
import type { Page } from '@/payload-types'
import { relationID } from '@/lib/relations'

import { thumbnailURL, useEditor } from './context'
import { Dialog } from './Dialog'

export type PageSettings = Pick<Page, 'title' | 'slug' | 'campaign' | 'seo'>

type Props = {
  settings: PageSettings
  /** Título no Google, com o que está escrito no campo (em branco: o automático). */
  titleFor: (seoTitle: string) => string
  /** Descrição automática, quando a do Google fica em branco. */
  automaticDescription: string
  onClose: () => void
  /** Salva no rascunho; devolve quando terminar (ou lança o erro). */
  onSave: (settings: PageSettings) => Promise<void>
}

/** Nome, endereço, página de campanha e como a página aparece no Google. Salva no rascunho. */
export function PageSettingsDialog({
  settings,
  titleFor,
  automaticDescription,
  onClose,
  onSave,
}: Props) {
  const { pageId, homepageId, photoById, pickPhoto } = useEditor()
  const [title, setTitle] = useState(settings.title)
  const [slug, setSlug] = useState(settings.slug)
  const [campaign, setCampaign] = useState(Boolean(settings.campaign))
  const [seoTitle, setSeoTitle] = useState(settings.seo?.title ?? '')
  const [seoDescription, setSeoDescription] = useState(settings.seo?.description ?? '')
  const [seoImage, setSeoImage] = useState<number | null>(relationID(settings.seo?.image))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isHome = pageId === homepageId
  const slugError = validateSlug(slug)
  const image = seoImage ? photoById[seoImage] : null

  const save = async () => {
    if (slugError !== true) return setError(slugError)
    setBusy(true)
    setError(null)
    const next: PageSettings = {
      title: title.trim() || settings.title,
      slug,
      campaign,
      seo: { title: seoTitle.trim(), description: seoDescription.trim(), image: seoImage },
    }
    try {
      await onSave(next)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não deu para salvar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      footer={
        <>
          <button className="ed-btn" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="ed-btn ed-btn--primary" disabled={busy} onClick={save} type="button">
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
      onClose={onClose}
      title="Página e Google"
    >
      <label className="ed-field">
        <span>Nome da página</span>
        <input
          className="ed-input"
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </label>

      <label className="ed-field">
        <span>Endereço</span>
        <span className="ed-prefix">
          <span>{window.location.host}/</span>
          <input
            className="ed-input"
            disabled={isHome}
            maxLength={80}
            onChange={(event) => setSlug(slugify(event.target.value))}
            value={slug}
          />
        </span>
        <span className="ed-hint">
          {isHome
            ? 'Esta é a página inicial: ela abre no endereço principal do site.'
            : slugError === true
              ? 'Use palavras curtas, sem acento. Mudar o endereço quebra links que alguém já tenha salvo.'
              : slugError}
        </span>
      </label>

      <label className="ed-switch">
        <input
          checked={campaign}
          onChange={(event) => setCampaign(event.target.checked)}
          type="checkbox"
        />
        Página de campanha
      </label>
      <p className="ed-hint">
        Esconde o menu e deixa o rodapé numa linha só. Bom para quem chega por um anúncio.
      </p>

      <fieldset className="ed-fieldset">
        <legend>Como aparece no Google</legend>
        <div className="ed-serp">
          <span className="ed-serp__url">
            {window.location.host}
            {isHome ? '' : `/${slug}`}
          </span>
          <span className="ed-serp__title">{titleFor(seoTitle)}</span>
          <span className="ed-serp__desc">{seoDescription || automaticDescription}</span>
        </div>
        <p className="ed-hint">
          Em branco, usamos o nome da página e o começo do texto dela. Você não precisa preencher.
        </p>
        <label className="ed-field">
          <span>Título no Google (opcional)</span>
          <input
            className="ed-input"
            maxLength={70}
            onChange={(event) => setSeoTitle(event.target.value)}
            placeholder={titleFor('')}
            value={seoTitle}
          />
        </label>
        <label className="ed-field">
          <span>Descrição no Google (opcional, até 160 letras)</span>
          <textarea
            className="ed-input"
            maxLength={160}
            onChange={(event) => setSeoDescription(event.target.value)}
            placeholder={automaticDescription}
            rows={3}
            value={seoDescription}
          />
        </label>
        <div className="ed-field">
          <span>Foto ao compartilhar no WhatsApp e nas redes (opcional)</span>
          <div className="ed-photo-field">
            {image ? (
              <img alt="" className="ed-thumb" src={thumbnailURL(image)} />
            ) : (
              <span className="ed-thumb ed-thumb--empty">Primeira foto da página</span>
            )}
            <div className="ed-photo-field__actions">
              <button
                className="ed-btn ed-btn--sm"
                onClick={() => pickPhoto((photo) => setSeoImage(photo.id))}
                type="button"
              >
                Escolher foto
              </button>
              {seoImage && (
                <button
                  className="ed-btn ed-btn--sm ed-btn--ghost"
                  onClick={() => setSeoImage(null)}
                  type="button"
                >
                  Usar a automática
                </button>
              )}
            </div>
          </div>
        </div>
      </fieldset>

      {error && <p className="ed-hint ed-hint--warn">Não deu para salvar: {error}</p>}
    </Dialog>
  )
}
