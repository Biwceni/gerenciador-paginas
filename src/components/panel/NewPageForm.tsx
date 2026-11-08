'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useRef, useState } from 'react'

import { SectionThumb } from '@/components/editor/SectionThumb'
import { editorPath } from '@/lib/editor'
import { panelHref } from '@/lib/panel'
import { PRIVACY_TEMPLATE_KEY, PRIVACY_TITLE } from '@/lib/privacy'
import { slugify, uniqueSlug } from '@/lib/slug'
import { type Components, SECTION_LABELS } from '@/puck/config'

import { blankContent, copyPage, createPage, createPageFromTemplate } from './api'
import { PanelIcon } from './PanelIcon'

/** Uma seção na miniatura do modelo. `band`: banner baixo, desenhado como uma faixa fina. */
export type MiniSection = { type: string; band?: boolean }

type Props = {
  adminRoute: string
  apiRoute: string
  /** Cores do site nas variáveis `--ed-site-*`: as miniaturas dos modelos ficam nelas. */
  colors?: React.CSSProperties
  domain: string
  /** Identificador do modelo que já vem escolhido (`?modelo=`), como o "Criar agora" dos formulários. */
  initialModel: string | null
  /** Modelos de página (coleção Modelos, fase 4). */
  models: { id: number; key: string; title: string; text: string; sections: MiniSection[] }[]
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
  const privacyModel = models.find((model) => model.key === PRIVACY_TEMPLATE_KEY)
  const asked = models.find((model) => model.key === initialModel)
  const [start, setStart] = useState<Start>(asked?.id ?? models[0]?.id ?? 'blank')
  const [sourceId, setSourceId] = useState(pages[0]?.id ?? 0)
  // A política já tem um bom nome: a pessoa só confirma.
  const [name, setName] = useState(asked && asked === privacyModel ? PRIVACY_TITLE : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameField = useRef<HTMLInputElement>(null)

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

  return (
    <div className="gp-page">
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
            Escolha um modelo. A estrutura vem pronta, com textos de exemplo do seu ramo para você
            trocar pelos seus. As fotos ficam para você escolher.
          </p>
        </div>
      </header>

      <div aria-label="Como começar" className="gp-starts" role="radiogroup" style={colors}>
        {[
          ...models.map((model) => ({ ...model, key: model.id as Start })),
          ...STARTS.filter((item) => item.key === 'blank' || pages.length > 0),
        ].map((item) => (
          <button
            aria-checked={start === item.key}
            className="gp-start"
            key={item.key}
            onClick={() => {
              setStart(item.key)
              if (item.key === privacyModel?.id && !name.trim()) setName(PRIVACY_TITLE)
              // No celular o campo fica bem abaixo dos cartões: leva até ele.
              const field = nameField.current
              if (field) {
                const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                field.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' })
                field.focus({ preventScroll: true })
              }
            }}
            role="radio"
            type="button"
          >
            <StartMini sections={'sections' in item ? item.sections : undefined} start={item.key} />
            <b>{item.title}</b>
            <span className="gp-small gp-muted">{item.text}</span>
          </button>
        ))}
      </div>

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
              ? typeof start === 'number'
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
