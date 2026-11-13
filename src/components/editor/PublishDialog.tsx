'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from 'react'

import { isExamplePhoto } from '@/lib/examples'
import { panelHref } from '@/lib/panel'
import { photoLabel } from '@/lib/photos'
import type { Media } from '@/payload-types'
import { collectReferences, heroWithoutPhoto, pagePhotoIds, usesWhatsApp } from '@/puck/references'
import { sectionChecks } from '@/puck/checks'
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
  page: {
    title: string
    /** Como aparece no Google: da mesma função que o site usa. */
    googleTitle: string
    path: string
    /** É a página inicial e ainda não está no ar: publicar coloca o site no ar. */
    opensSite: boolean
    /** Foto escolhida em "Página e Google". */
    seoImage: Media | number | null | undefined
  }
  /** Seções que ainda têm texto de exemplo, na ordem da página. */
  exampleSections: { id: string; label: string }[]
  /** Botões e links com nome e sem destino: no site eles somem. */
  linkless: { id: string; label: string; section: string }[]
  /** Fecha a janela e mostra a seção na prévia. */
  onGoTo: (sectionId: string) => void
  /** Personalidade escolhida no editor que ainda não foi publicada em Sua marca. */
  personalityPending: string | null
  /** Outra página que já usa o endereço desta (o nome dela). */
  slugTakenBy: string | null
  onClose: () => void
  /** Publica a página; devolve quando terminar (ou lança o erro). */
  onPublish: () => Promise<void>
  onPhotoChanged: (photo: Media) => void
}

/**
 * Um único botão Publicar, com as checagens do protótipo. Nenhuma bloqueia: elas avisam e, quando
 * dá, oferecem o conserto ali mesmo (descrever a foto, colocar a página no menu).
 */
export function PublishDialog({
  apiRoute,
  data,
  page,
  exampleSections,
  linkless,
  onGoTo,
  personalityPending,
  slugTakenBy,
  onClose,
  onPublish,
  onPhotoChanged,
}: Props) {
  const { pageId, homepageId, pages, photoById, whatsappHref, site, adminRoute } = useEditor()
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
  const examplePhotos = pagePhotoIds(data, page.seoImage).filter((id) =>
    isExamplePhoto(photoById[id]),
  )
  const whatsappWithoutNumber = !whatsappHref && usesWhatsApp(data)
  // O que falta nas seções novas: foto dos produtos, fotos e @ do Instagram.
  const missing = sectionChecks(data, {
    hasPhoto: (id) => Boolean(photoById[id]),
    instagram: site.instagram,
  })
  // Aviso leve: não muda o botão para "Publicar mesmo assim".
  const homeHeroWithoutPhoto =
    pageId === homepageId && heroWithoutPhoto(data, (id) => Boolean(photoById[id]))
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

  // O que está na tela como aviso. A foto já descrita e o menu marcado se resolvem ao publicar.
  const hasWarning =
    data.content.length === 0 ||
    exampleSections.length > 0 ||
    examplePhotos.length > 0 ||
    weakPhotos.some((photo) => !alts[photo.id]?.trim()) ||
    draftLinks.length > 0 ||
    linkless.length > 0 ||
    personalityPending !== null ||
    slugTakenBy !== null ||
    whatsappWithoutNumber ||
    missing.length > 0 ||
    menu.kind === 'cannot-add' ||
    (menu.kind === 'can-add' && !addToMenu)

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
          {page.opensSite && '. É a página inicial: com ela, o site sai do "em construção".'}
        </>
      }
      footer={
        <>
          <button className="ed-btn" onClick={onClose} type="button">
            Agora não
          </button>
          <button
            className="ed-btn ed-btn--primary"
            disabled={busy || menu.kind === 'loading' || slugTakenBy !== null}
            onClick={publish}
            type="button"
          >
            {busy
              ? 'Publicando…'
              : menu.kind === 'loading'
                ? 'Conferindo o menu…'
                : hasWarning
                  ? 'Publicar mesmo assim'
                  : 'Publicar agora'}
          </button>
        </>
      }
      onClose={onClose}
      title={`Publicar “${page.title}”`}
    >
      <ul className="ed-checks">
        {slugTakenBy !== null && (
          <Check title={`O endereço ${page.path} já é da página “${slugTakenBy}”`}>
            Duas páginas não podem ter o mesmo endereço. Troque em Página e Google para publicar.
          </Check>
        )}
        {exampleSections.length ? (
          <Check
            title={
              exampleSections.length === 1
                ? 'Uma seção ainda tem texto de exemplo'
                : `${exampleSections.length} seções ainda têm texto de exemplo`
            }
          >
            Os visitantes vão ver esse texto. Troque pelo seu:
            <GoToList items={exampleSections} onGoTo={onGoTo} />
          </Check>
        ) : (
          <Check ok title="Sem texto de exemplo" />
        )}
        {examplePhotos.length > 0 && (
          <Check
            title={
              examplePhotos.length === 1
                ? 'Uma foto é do modelo'
                : `${examplePhotos.length} fotos são do modelo`
            }
          >
            Funciona, mas o site fica mais seu com fotos suas.
          </Check>
        )}
        {homeHeroWithoutPhoto && (
          <Check title="O banner da página inicial fica mais forte com uma foto">
            Escolha uma nas opções do banner: em &ldquo;Foto ao lado&rdquo; ela aparece ao lado do
            texto.
          </Check>
        )}
        <Check ok title="Aparece certinho no Google">
          “{page.googleTitle}”
        </Check>
        <Check ok title="Funciona no celular">
          As seções se ajustam sozinhas à tela.
        </Check>
        {data.content.length === 0 && (
          <Check title="A página está vazia">Quem abrir vai ver só o topo e o rodapé.</Check>
        )}
        {missing.map((check) => (
          <Check key={check.title} title={check.title}>
            {check.text}
          </Check>
        ))}
        {weakPhotos.length ? (
          <Check
            title={
              weakPhotos.every((photo) => !photo.alt?.trim())
                ? weakPhotos.length === 1
                  ? 'Uma foto está sem descrição'
                  : `${weakPhotos.length} fotos estão sem descrição`
                : weakPhotos.length === 1
                  ? 'Uma foto tem uma descrição fraca'
                  : `${weakPhotos.length} fotos têm descrições fracas`
            }
          >
            Escreva em poucas palavras o que aparece. É opcional, mas ajuda no Google e em leitores
            de tela.
            {weakPhotos.map((photo) => (
              <span className="ed-alt-row" key={photo.id}>
                <img alt="" className="ed-pic ed-pic--sm" src={thumbnailURL(photo)} />
                <input
                  aria-label={`Nova descrição para a foto "${photoLabel(photo)}"`}
                  className="ed-input"
                  onChange={(event) => setAlts({ ...alts, [photo.id]: event.target.value })}
                  placeholder={
                    photo.alt?.trim()
                      ? `Hoje: "${photo.alt}". Ex.: xícara de café vista de cima`
                      : 'Ex.: xícara de café vista de cima'
                  }
                  value={alts[photo.id] ?? ''}
                />
              </span>
            ))}
          </Check>
        ) : (
          <Check ok title="Todas as fotos têm descrição" />
        )}
        {linkless.length > 0 && (
          <Check
            title={
              linkless.length === 1
                ? 'Um botão está sem destino'
                : `${linkless.length} botões estão sem destino`
            }
          >
            Sem destino, o botão não aparece no site. Escolha em &ldquo;Leva para&rdquo;:
            <GoToList
              items={linkless.map((button) => ({
                id: button.id,
                label: `“${button.label}”, em ${button.section}`,
              }))}
              onGoTo={onGoTo}
            />
          </Check>
        )}
        {draftLinks.length ? (
          <Check title="Um botão leva para uma página que ainda não está no ar">
            {draftLinks.join(', ')}. Esse botão não aparece no site até a página ser publicada.
          </Check>
        ) : (
          linkless.length === 0 && <Check ok title="Todos os botões levam para páginas no ar" />
        )}
        {personalityPending !== null && (
          <Check title={`A personalidade ${personalityPending} ainda não está no ar`}>
            Publicar esta página não muda a personalidade do site.{' '}
            <a href={panelHref(adminRoute, 'brand')}>Publique em Sua marca</a> para o site todo
            mudar.
          </Check>
        )}
        {whatsappWithoutNumber && (
          <Check title="Botão de WhatsApp sem número">
            Ele fica escondido até você pôr o número em Configurações.
          </Check>
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

/** Lista de seções com o botão "Ir até" de cada uma. */
function GoToList({
  items,
  onGoTo,
}: {
  items: { id: string; label: string }[]
  onGoTo: (id: string) => void
}) {
  return (
    <span className="ed-goto-list">
      {items.map((item, index) => (
        <span className="ed-goto" key={`${item.id}-${index}`}>
          <span>{item.label}</span>
          <button className="ed-btn ed-btn--sm" onClick={() => onGoTo(item.id)} type="button">
            Ir até
          </button>
        </span>
      ))}
    </span>
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
