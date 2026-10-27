'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from 'react'

import type { Media } from '@/payload-types'
import { collectReferences } from '@/puck/references'
import type { PuckPageData } from '@/puck/schema'

import { updatePhotoAlt } from './api'
import { thumbnailURL, useEditor } from './context'
import { Dialog } from './Dialog'
import { addMenuItem, linksTo, type MenuState, readMenu } from './menu'

/** Descrição que não ajuda ninguém: nome de arquivo ou uma palavra só (como o "sdfsds" da POC). */
export function weakAlt(alt: string | null | undefined): boolean {
  const text = (alt ?? '').trim()
  if (/\.(jpe?g|png|webp|avif|gif)$/i.test(text) || /^(img|dsc|foto|image)[-_ ]?\d+/i.test(text)) {
    return true
  }
  return text.split(/\s+/).filter((word) => word.length > 1).length < 2
}

type Props = {
  apiRoute: string
  data: PuckPageData
  page: { title: string; seoTitle: string; path: string }
  onClose: () => void
  /** Publica a página; devolve quando terminar (ou lança o erro). */
  onPublish: () => Promise<void>
  onPhotoChanged: (photo: Media) => void
}

/**
 * Um único botão Publicar, com as checagens do protótipo. Nenhuma bloqueia: elas avisam e, quando
 * dá, oferecem o conserto ali mesmo (descrever a foto, colocar a página no menu).
 */
export function PublishDialog({ apiRoute, data, page, onClose, onPublish, onPhotoChanged }: Props) {
  const { pageId, homepageId, pages, photoById, site } = useEditor()
  const [alts, setAlts] = useState<Record<number, string>>({})
  const [addToMenu, setAddToMenu] = useState(true)
  // A página inicial não precisa estar no menu: o logo já leva até ela.
  const [menu, setMenu] = useState<MenuState>(
    pageId === homepageId ? { kind: 'in-menu' } : { kind: 'loading' },
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ addedToMenu: boolean; menuError?: string } | null>(null)

  const { mediaIds, pageIds } = useMemo(() => collectReferences(data), [data])
  const weakPhotos = mediaIds.flatMap((id) => {
    const photo = photoById[id]
    return photo && weakAlt(photo.alt) ? [photo] : []
  })
  const draftLinks = pageIds
    .filter((id) => id !== pageId)
    .flatMap((id) => {
      const target = pages.find((item) => item.id === id)
      if (!target) return ['Página apagada']
      return target.published ? [] : [target.title]
    })

  useEffect(() => {
    if (pageId === homepageId) return
    let active = true
    readMenu(apiRoute, linksTo(pageId)).then((state) => active && setMenu(state))
    return () => {
      active = false
    }
  }, [apiRoute, homepageId, pageId])

  const publish = async () => {
    setBusy(true)
    setError(null)
    try {
      for (const photo of weakPhotos) {
        const alt = alts[photo.id]?.trim()
        if (alt) onPhotoChanged((await updatePhotoAlt(apiRoute, photo.id, alt)).doc)
      }
      await onPublish()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não deu para publicar.')
      setBusy(false)
      return
    }
    // A página já está no ar: se o menu falhar, é só um aviso na tela de "Pronto".
    try {
      if (menu.kind === 'can-add' && addToMenu) {
        await addMenuItem(apiRoute, menu.items, {
          label: page.title.slice(0, 30),
          link: { kind: 'page', page: pageId },
        })
        setDone({ addedToMenu: true })
      } else setDone({ addedToMenu: false })
    } catch (caught) {
      setDone({
        addedToMenu: false,
        menuError: caught instanceof Error ? caught.message : 'erro desconhecido',
      })
    } finally {
      setBusy(false)
    }
  }

  const address = `${window.location.host}${page.path}`

  if (done) {
    return (
      <Dialog onClose={onClose} title="Pronto, a página está no ar">
        <p>
          Quem acessar <b>{address}</b> já vê a versão nova.
          {done.addedToMenu && ' Ela também entrou no menu.'}
        </p>
        {done.menuError && (
          <p className="ed-hint ed-hint--warn">
            Não deu para colocar a página no menu ({done.menuError}). Coloque em Menu e rodapé.
          </p>
        )}
        <div className="ed-row">
          <a className="ed-btn ed-btn--primary" href={page.path} rel="noopener" target="_blank">
            Ver no site
          </a>
          <button
            className="ed-btn"
            onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${page.path}`)}
            type="button"
          >
            Copiar endereço
          </button>
          <button className="ed-btn ed-btn--ghost" onClick={onClose} type="button">
            Continuar editando
          </button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      description={
        <>
          Vai ficar no ar em <b>{address}</b>
        </>
      }
      footer={
        <>
          <button className="ed-btn" onClick={onClose} type="button">
            Agora não
          </button>
          <button
            className="ed-btn ed-btn--primary"
            disabled={busy || menu.kind === 'loading'}
            onClick={publish}
            type="button"
          >
            {busy ? 'Publicando…' : 'Publicar agora'}
          </button>
        </>
      }
      onClose={onClose}
      title={`Publicar “${page.title}”`}
    >
      <ul className="ed-checks">
        <Check ok title="Aparece certinho no Google">
          “{page.seoTitle || `${page.title} | ${site.name}`}”
        </Check>
        <Check ok title="Funciona no celular">
          As seções se ajustam sozinhas à tela.
        </Check>
        {data.content.length === 0 && (
          <Check title="A página está vazia">Quem abrir vai ver só o topo e o rodapé.</Check>
        )}
        {weakPhotos.length ? (
          <Check
            title={
              weakPhotos.length === 1
                ? 'Uma foto tem uma descrição fraca'
                : `${weakPhotos.length} fotos têm descrições fracas`
            }
          >
            Escreva em poucas palavras o que aparece. É opcional, mas ajuda no Google e em leitores
            de tela.
            {weakPhotos.map((photo) => (
              <span className="ed-alt-row" key={photo.id}>
                <img alt="" className="ed-thumb ed-thumb--sm" src={thumbnailURL(photo)} />
                <input
                  aria-label={`Nova descrição para a foto "${photo.alt}"`}
                  className="ed-input"
                  onChange={(event) => setAlts({ ...alts, [photo.id]: event.target.value })}
                  placeholder={`Hoje: "${photo.alt}". Ex.: xícara de café vista de cima`}
                  value={alts[photo.id] ?? ''}
                />
              </span>
            ))}
          </Check>
        ) : (
          <Check ok title="Todas as fotos têm descrição" />
        )}
        {draftLinks.length ? (
          <Check title="Um botão leva para uma página que ainda não está no ar">
            {draftLinks.join(', ')}. Esse botão não aparece no site até a página ser publicada.
          </Check>
        ) : (
          <Check ok title="Todos os botões levam para páginas no ar" />
        )}
        {menu.kind === 'can-add' && (
          <Check title="Esta página não está no menu">
            <label className="ed-switch">
              <input
                checked={addToMenu}
                onChange={(event) => setAddToMenu(event.target.checked)}
                type="checkbox"
              />
              Colocar no menu do topo e do rodapé
            </label>
          </Check>
        )}
        {menu.kind === 'cannot-add' && (
          <Check title="Esta página não está no menu">{menu.reason}</Check>
        )}
      </ul>
      {error && <p className="ed-hint ed-hint--warn">Não deu para publicar: {error}</p>}
    </Dialog>
  )
}

function Check({
  ok,
  title,
  children,
}: {
  ok?: boolean
  title: string
  children?: React.ReactNode
}) {
  return (
    <li className={`ed-check${ok ? ' ed-check--ok' : ' ed-check--warn'}`}>
      <span aria-hidden="true" className="ed-check__icon">
        {ok ? '✓' : '!'}
      </span>
      <div>
        <b>{title}</b>
        {children && <span className="ed-check__text">{children}</span>}
      </div>
    </li>
  )
}
