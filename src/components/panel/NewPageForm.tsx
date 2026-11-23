'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useRef, useState } from 'react'

import { SectionThumb } from '@/components/editor/SectionThumb'
import { editorPath } from '@/lib/editor'
import { panelHref } from '@/lib/panel'
import type { PageModelGroup } from '@/lib/siteShows'
import { slugify, uniqueSlug } from '@/lib/slug'
import { type Components, SECTION_LABELS } from '@/puck/config'

import {
  blankContent,
  copyPage,
  createPage,
  createPageFromTemplate,
  deleteSavedTemplate,
} from './api'
import { PanelIcon } from './PanelIcon'

/** Uma seção na miniatura do modelo. `band`: banner baixo, desenhado como uma faixa fina. */
export type MiniSection = { type: string; band?: boolean }

/**
 * Um modelo de página na tela. `group`: ligado ao que o site mostra (F1), outro da equipe, ou salvo
 * de uma página do site. `pageTitle`: o nome que a página nova já ganha.
 */
export type NewPageModel = {
  id: number
  key: string
  title: string
  text: string
  pageTitle: string
  group: PageModelGroup
  sections: MiniSection[]
}

type Props = {
  adminRoute: string
  apiRoute: string
  /** Cores do site nas variáveis `--ed-site-*`: as miniaturas dos modelos ficam nelas. */
  colors?: React.CSSProperties
  domain: string
  /** Identificador do modelo que já vem escolhido (`?modelo=`), como o "Criar agora" dos formulários. */
  initialModel: string | null
  /** Modelos de página (coleção Modelos, fase 4), já na ordem da tela. */
  models: NewPageModel[]
  pages: { id: number; title: string; slug: string }[]
}

const STARTS: { key: 'blank' | 'copy'; title: string; text: string }[] = [
  {
    key: 'blank',
    title: 'Em branco',
    text: 'Começa só com um título. Você acrescenta as seções no editor.',
  },
  {
    key: 'copy',
    title: 'Copiar uma página',
    text: 'Parte de uma página que já existe, com as seções e os textos dela.',
  },
]

const isSection = (type: string): type is keyof Components => type in SECTION_LABELS

/**
 * Miniatura do cartão: as seções que o modelo cria, empilhadas como numa folha nas cores do site,
 * com os mesmos desenhos da lista "Adicionar seção" (a vitrine com 3 fotos, o cardápio com linhas e
 * preços). O banner baixo é uma faixa fina. Em branco: um título e o "+"; cópia: o ícone de copiar.
 */
function StartMini({ start, sections }: { start: Start; sections?: MiniSection[] }) {
  if (start === 'copy') {
    return (
      <span aria-hidden="true" className="gp-mini gp-mini--icon">
        <PanelIcon name="copy" size={40} />
      </span>
    )
  }
  if (start === 'blank') {
    return (
      <span aria-hidden="true" className="gp-mini">
        <span className="gp-mini__sheet">
          <i className="gp-mini__title" />
          <i className="gp-mini__add">
            <PanelIcon name="plus" size={16} />
          </i>
        </span>
      </span>
    )
  }
  return (
    <span aria-hidden="true" className="gp-mini">
      <span className="gp-mini__sheet gp-mini__sheet--site">
        {(sections ?? []).map(({ type, band }, index) =>
          band ? (
            <i className="gp-mini__band" key={index} />
          ) : isSection(type) ? (
            <SectionThumb className="gp-mini__section" key={index} type={type} />
          ) : null,
        )}
      </span>
    </span>
  )
}

/** Um modelo (pelo id), em branco ou cópia. */
type Start = number | 'blank' | 'copy'

/** Nome da página, jeito de começar e "Criar e começar a editar". Segue o `vNewPage`. */
export function NewPageForm({
  adminRoute,
  apiRoute,
  colors,
  domain,
  initialModel,
  models,
  pages,
}: Props) {
  const router = useRouter()
  const [list, setList] = useState(models)
  const asked = list.find((model) => model.key === initialModel)
  const first = asked ?? list.find((model) => model.group !== 'saved')
  const [start, setStart] = useState<Start>(first?.id ?? 'blank')
  const [sourceId, setSourceId] = useState(pages[0]?.id ?? 0)
  // O nome já vem do modelo; se a pessoa trocar de modelo sem mexer nele, troca junto.
  const [name, setName] = useState(first?.pageTitle ?? '')
  const [autoName, setAutoName] = useState(first?.pageTitle ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const nameField = useRef<HTMLInputElement>(null)

  const choose = (key: Start) => {
    setStart(key)
    const model = list.find((item) => item.id === key)
    const next = model?.pageTitle ?? ''
    if (!name.trim() || name === autoName) {
      setName(next)
      setAutoName(next)
    }
    // No celular o campo fica bem abaixo dos cartões: leva até ele.
    const field = nameField.current
    if (field) {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      field.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' })
      field.focus({ preventScroll: true })
    }
  }

  const removeSaved = async (id: number) => {
    setDeleteError(null)
    try {
      await deleteSavedTemplate(apiRoute, id)
      setList((current) => current.filter((model) => model.id !== id))
      setDeleting(null)
      if (start === id) choose(list.find((model) => model.group !== 'saved')?.id ?? 'blank')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Tente de novo.')
    }
  }

  const title = name.trim()
  const taken = pages.map((page) => page.slug)
  const slug = title ? uniqueSlug(title, taken) : ''
  const changed = Boolean(title) && slug !== slugify(title)
  // O que ainda falta para criar, embaixo do botão desligado.
  const missing = !title ? 'Dê um nome para a página.' : null

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title) return
    setBusy(true)
    setError(null)
    try {
      const { doc } =
        typeof start === 'number'
          ? await createPageFromTemplate(apiRoute, start, { title, slug })
          : start === 'copy' && sourceId
            ? await copyPage(apiRoute, sourceId, title, slug)
            : await createPage(apiRoute, { title, slug, content: blankContent(title) })
      router.push(editorPath(adminRoute, doc.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tente de novo.')
      setBusy(false)
    }
  }

  const saved = list.filter((model) => model.group === 'saved')
  const card = (item: {
    id: Start
    title: string
    text: string
    sections?: MiniSection[]
    group?: NewPageModel['group']
  }) => (
    <button
      aria-checked={start === item.id}
      className="gp-start"
      key={item.id}
      onClick={() => choose(item.id)}
      role="radio"
      type="button"
    >
      <StartMini sections={item.sections} start={item.id} />
      <b>{item.title}</b>
      {item.group === 'suggested' && <span className="gp-start__tag">No seu site</span>}
      <span className="gp-small gp-muted">{item.text}</span>
    </button>
  )

  return (
    <div className="gp-page" role="main">
      <header className="gp-pagehead">
        <div>
          <Link
            className="gp-btn gp-btn--sm gp-btn--ghost gp-back"
            href={panelHref(adminRoute, 'pages')}
          >
            <PanelIcon name="back" size={14} />
            Páginas
          </Link>
          <h1>Nova página</h1>
          <p>
            Escolha um modelo. A estrutura vem pronta, com textos de exemplo para você trocar pelos
            seus. As fotos ficam para você escolher.
          </p>
        </div>
      </header>

      <div aria-label="Como começar" className="gp-starts" role="radiogroup" style={colors}>
        {[
          ...list.filter((model) => model.group !== 'saved').map(card),
          ...STARTS.filter((item) => item.key === 'blank' || pages.length > 0).map((item) =>
            card({ ...item, id: item.key }),
          ),
        ]}
      </div>

      {saved.length > 0 && (
        <section aria-labelledby="np-saved" className="gp-savedmodels">
          <h2 id="np-saved">Seus modelos</h2>
          <p className="gp-small gp-muted">
            Páginas do site guardadas como modelo, com os textos e as fotos delas.
          </p>
          <div aria-labelledby="np-saved" className="gp-starts" role="radiogroup" style={colors}>
            {saved.map((model) => (
              <div className="gp-savedstart" key={model.id}>
                {card(model)}
                {deleting === model.id ? (
                  <span className="gp-savedstart__ask" role="group" aria-label="Apagar o modelo?">
                    <span className="gp-small">
                      Apagar o modelo? As páginas feitas com ele ficam.
                    </span>
                    <button
                      className="gp-btn gp-btn--sm gp-btn--danger"
                      onClick={() => removeSaved(model.id)}
                      type="button"
                    >
                      Apagar
                    </button>
                    <button
                      className="gp-btn gp-btn--sm gp-btn--ghost"
                      onClick={() => setDeleting(null)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button
                    aria-label={`Apagar o modelo ${model.title}`}
                    className="gp-btn gp-btn--sm gp-btn--ghost gp-savedstart__delete"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleting(model.id)
                    }}
                    type="button"
                  >
                    <PanelIcon name="trash" size={14} />
                    Apagar
                  </button>
                )}
              </div>
            ))}
          </div>
          {deleteError && (
            <p className="gp-error" role="alert">
              Não deu para apagar: {deleteError}
            </p>
          )}
        </section>
      )}

      <form className="gp-card gp-card--narrow" onSubmit={create}>
        {start === 'copy' && (
          <div className="gp-field">
            <label htmlFor="np-source">Qual página copiar?</label>
            <select
              className="gp-input"
              id="np-source"
              onChange={(event) => setSourceId(Number(event.target.value))}
              value={sourceId}
            >
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="gp-field">
          <label htmlFor="np-name">Nome da página</label>
          <input
            className="gp-input"
            id="np-name"
            maxLength={80}
            ref={nameField}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Promoção de inverno"
            value={name}
          />
          <span className="gp-hint">
            Endereço:{' '}
            <b>
              {domain}/{slug || '…'}
            </b>
            {changed && ' (o endereço com esse nome já está em uso, então vamos usar este)'}
          </span>
        </div>
        {error && (
          <p className="gp-error" role="alert">
            Não deu para criar: {error}
          </p>
        )}
        <div className="gp-field">
          <button
            aria-describedby={missing ? 'np-missing' : undefined}
            className="gp-btn gp-btn--primary gp-btn--lg gp-btn--fit"
            disabled={Boolean(missing) || busy}
            type="submit"
          >
            {busy
              ? typeof start === 'number' && list.find((m) => m.id === start)?.group !== 'saved'
                ? 'Criando e copiando as fotos…'
                : 'Criando…'
              : 'Criar e começar a editar'}
          </button>
          {missing && (
            <span className="gp-hint" id="np-missing">
              {missing}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
