'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { editorPath } from '@/lib/editor'
import { panelHref } from '@/lib/panel'
import { slugify, uniqueSlug } from '@/lib/slug'

import { blankContent, copyPage, createPage } from './api'
import { PanelIcon } from './PanelIcon'

type Props = {
  adminRoute: string
  apiRoute: string
  domain: string
  pages: { id: number; title: string; slug: string }[]
}

const STARTS = [
  {
    key: 'blank',
    title: 'Em branco',
    text: 'Começa só com um título. Você acrescenta as seções no editor.',
    mini: ['hero'],
  },
  {
    key: 'copy',
    title: 'Copiar uma página',
    text: 'Parte de uma página que já existe, com as seções e os textos dela.',
    mini: ['l', 'l', 'cols', 'l'],
  },
] as const

type Start = (typeof STARTS)[number]['key']

/** Nome da página, jeito de começar e "Criar e começar a editar". Segue o `vNewPage`. */
export function NewPageForm({ adminRoute, apiRoute, domain, pages }: Props) {
  const router = useRouter()
  const [start, setStart] = useState<Start>('blank')
  const [sourceId, setSourceId] = useState(pages[0]?.id ?? 0)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = name.trim()
  const taken = pages.map((page) => page.slug)
  const slug = title ? uniqueSlug(title, taken) : ''
  const changed = Boolean(title) && slug !== slugify(title)

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title) return
    setBusy(true)
    setError(null)
    try {
      const { doc } =
        start === 'copy' && sourceId
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
          <p>Escolha como começar. Depois é só trocar os textos e as fotos no editor.</p>
        </div>
      </header>

      <div className="gp-starts" role="radiogroup" aria-label="Como começar">
        {STARTS.filter((item) => item.key === 'blank' || pages.length > 0).map((item) => (
          <button
            aria-checked={start === item.key}
            className="gp-start"
            key={item.key}
            onClick={() => setStart(item.key)}
            role="radio"
            type="button"
          >
            <span aria-hidden="true" className="gp-mini">
              {item.mini.map((block, index) => (
                <i className={block} key={index} />
              ))}
            </span>
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
        <div>
          <button
            className="gp-btn gp-btn--primary gp-btn--lg"
            disabled={!title || busy}
            type="submit"
          >
            {busy ? 'Criando…' : 'Criar e começar a editar'}
          </button>
        </div>
      </form>
    </div>
  )
}
