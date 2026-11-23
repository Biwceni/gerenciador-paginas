'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useRef, useState } from 'react'

import { isExamplePhoto } from '@/lib/examples'
import { panelHref } from '@/lib/panel'
import { photoLabel } from '@/lib/photos'
import type { Media } from '@/payload-types'
import { collectReferences, heroWithoutPhoto, pagePhotoIds, usesWhatsApp } from '@/puck/references'
import { sectionChecks } from '@/puck/checks'
import { SECTION_LABELS } from '@/puck/config'
import { deviceLimitedSections, linksToDeviceHidden, menuToDeviceHidden } from '@/puck/devices'
import { hiddenSections } from '@/puck/hiddenSections'
import type { PuckPageData } from '@/puck/schema'

import { getHeader, updatePhotoAlt } from './api'
import { thumbnailURL, useEditor } from './context'
import { Dialog } from './Dialog'
import { EXAMPLES_SHOWN } from './ExampleTexts'
import {
  addMenuItem,
  linksTo,
  menuLabel,
  type MenuItems,
  type MenuState,
  readMenu,
  swapMenuItem,
} from './menu'

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
    /** Página de campanha: não costuma ir para o menu. */
    campaign: boolean
  }
  /**
   * Textos de exemplo, na ordem da página (A7): o lugar, o texto e a seção (vazia nos do rodapé,
   * que mudam em Menu e rodapé).
   */
  examples: { id: string; label: string; text: string }[]
  /** Botões e links com nome e sem destino: no site eles somem. */
  linkless: { id: string; label: string; section: string }[]
  /** Botões que levam para uma seção sem nome no menu: no site, vão para o topo (achado 13.6). */
  unnamedLinks: { id: string; label: string; section: string }[]
  /** Fecha a janela e mostra a seção na prévia. */
  onGoTo: (sectionId: string) => void
  /**
   * Sua marca com mudança fora do ar (E8). `changedHere`: mudou neste editor, e a caixa "Publicar
   * também Sua marca" já vem marcada. `personality`: o nome da personalidade nova, se ela mudou.
   */
  brand: { changedHere: boolean; personality: string | null; publish: () => Promise<void> } | null
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
  examples,
  linkless,
  unnamedLinks,
  onGoTo,
  brand,
  slugTakenBy,
  onClose,
  onPublish,
  onPhotoChanged,
}: Props) {
  const { pageId, homepageId, pages, photoById, whatsappHref, site, adminRoute } = useEditor()
  const [alts, setAlts] = useState<Record<number, string>>({})
  // "Colocar no menu" vem marcado só nas páginas que costumam ir para o topo (A6): campanha e
  // privacidade, não. Ficar fora do menu não é aviso.
  const [addToMenu, setAddToMenu] = useState(
    () => !page.campaign && !data.content.some((section) => section.type === 'Privacy'),
  )
  // Menu cheio: o passo em que a pessoa escolhe qual link sai (o último vem marcado).
  const [choosing, setChoosing] = useState(false)
  const [leaving, setLeaving] = useState<number | 'none'>(-1)
  // A página inicial não precisa estar no menu: o logo já leva até ela.
  const [menu, setMenu] = useState<MenuState>(
    pageId === homepageId ? { kind: 'in-menu' } : { kind: 'loading' },
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{
    addedToMenu: boolean
    /** O link que saiu do menu para a página entrar. */
    replaced?: string
    menuError?: string
  } | null>(null)
  const [withBrand, setWithBrand] = useState(Boolean(brand?.changedHere))
  // Sua marca depois de publicar a página: foi junto, falhou (com o "Tentar de novo") ou nem foi.
  const [brandResult, setBrandResult] = useState<
    { state: 'published' } | { state: 'failed'; message: string } | { state: 'retrying' } | null
  >(null)
  const publishBrand = useRef(brand?.publish)
  // Guarda o último pedido: depois de publicar, `brand` some (já não falta nada), e o "Tentar de
  // novo" ainda precisa dele.
  if (brand) publishBrand.current = brand.publish

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
  // Seções que o site não mostra (achado 13.2), com o motivo e o "Ir até".
  const hidden = hiddenSections(data, (id) => Boolean(photoById[id])).map((section) => ({
    id: section.id,
    label: `${(SECTION_LABELS as Record<string, string>)[section.type] ?? 'Seção'}: ${section.reason}`,
  }))
  // "Onde aparece" (E3): seções que aparecem só num aparelho, e botões ou itens do menu que levam
  // para uma seção escondida no aparelho em que eles aparecem.
  const sectionName = (type: string) => (SECTION_LABELS as Record<string, string>)[type] ?? 'Seção'
  const deviceOnly = deviceLimitedSections(data).map((section) => ({
    id: section.id,
    label: `${sectionName(section.type)}: só no ${section.devices === 'desktop' ? 'computador' : 'celular'}`,
  }))
  const [menuItems, setMenuItems] = useState<MenuItems>([])
  const deviceLinks = [
    ...linksToDeviceHidden(data, pageId).map((link) => ({
      id: link.sectionId,
      label: `“${link.label}”, em ${sectionName(link.sectionType)} (o destino some no ${link.device})`,
    })),
    ...menuToDeviceHidden(data, pageId, menuItems).map((item) => ({
      id: '',
      label: `Menu: “${item.label}” (o destino some no ${item.device})`,
    })),
  ]
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
    if (!deviceOnly.length) return
    let active = true
    getHeader(apiRoute, false)
      .then((header) => active && setMenuItems(header.items ?? []))
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [apiRoute, deviceOnly.length])

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
    examples.length > 0 ||
    hidden.length > 0 ||
    deviceLinks.length > 0 ||
    examplePhotos.length > 0 ||
    weakPhotos.some((photo) => !alts[photo.id]?.trim()) ||
    draftLinks.length > 0 ||
    linkless.length > 0 ||
    unnamedLinks.length > 0 ||
    (brand !== null && !withBrand) ||
    slugTakenBy !== null ||
    whatsappWithoutNumber ||
    missing.length > 0

  const menuItemFor = {
    label: menuLabel(page.title),
    link: { kind: 'page' as const, page: pageId },
  }
  // Vai entrar no menu cheio: antes de publicar, a escolha do link que sai.
  const swapping = menu.kind === 'full' && addToMenu

  const publish = async () => {
    if (swapping && !choosing) {
      setLeaving(menu.items.length - 1)
      setChoosing(true)
      return
    }
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
    // A página já está no ar: Sua marca e o menu vêm depois. Se um falhar, a página continua no
    // ar e a tela de "Pronto" avisa, com o jeito de resolver.
    if (brand && withBrand) await sendBrand()
    try {
      if (menu.kind === 'can-add' && addToMenu) {
        await addMenuItem(apiRoute, menu.items, menuItemFor)
        setDone({ addedToMenu: true })
      } else if (swapping && typeof leaving === 'number' && menu.items[leaving]) {
        await swapMenuItem(apiRoute, menu.items, leaving, menuItemFor)
        setDone({ addedToMenu: true, replaced: menu.items[leaving].label })
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

  async function sendBrand() {
    const send = publishBrand.current
    if (!send) return
    try {
      await send()
      setBrandResult({ state: 'published' })
    } catch (caught) {
      setBrandResult({
        state: 'failed',
        message: caught instanceof Error ? caught.message : 'erro desconhecido',
      })
    }
  }

  const address = `${window.location.host}${page.path}`

  if (done) {
    return (
      <Dialog onClose={onClose} title="Pronto, a página está no ar">
        <p>
          Quem acessar <b>{address}</b> já vê a versão nova.
          {done.addedToMenu &&
            (done.replaced
              ? ` Ela também entrou no menu, no lugar de “${done.replaced}”.`
              : ' Ela também entrou no menu.')}
          {brandResult?.state === 'published' &&
            ' Sua marca também foi publicada: todas as páginas já mostram as cores e letras novas.'}
        </p>
        {(brandResult?.state === 'failed' || brandResult?.state === 'retrying') && (
          <div className="ed-hint ed-hint--warn ed-publish-brandfail" role="alert">
            <span>
              Sua marca não foi publicada
              {brandResult.state === 'failed' ? ` (${brandResult.message})` : ''}. A página está no
              ar com Sua marca de antes.
            </span>
            <button
              className="ed-btn"
              disabled={brandResult.state === 'retrying'}
              onClick={async () => {
                setBrandResult({ state: 'retrying' })
                await sendBrand()
              }}
              type="button"
            >
              {brandResult.state === 'retrying' ? 'Tentando…' : 'Tentar de novo'}
            </button>
          </div>
        )}
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

  if (choosing && menu.kind === 'full') {
    const name = menuLabel(page.title)
    return (
      <Dialog
        description={`Para entrar “${name}”, escolha qual link sai do topo.`}
        footer={
          <>
            <button
              className="ed-btn"
              disabled={busy}
              onClick={() => setChoosing(false)}
              type="button"
            >
              Voltar
            </button>
            <button
              className="ed-btn ed-btn--primary"
              disabled={busy || slugTakenBy !== null}
              onClick={publish}
              type="button"
            >
              {busy
                ? 'Publicando…'
                : leaving === 'none'
                  ? 'Publicar sem pôr no menu'
                  : `Publicar com “${name}”`}
            </button>
          </>
        }
        onClose={onClose}
        title={`O menu já tem ${menu.items.length} links`}
      >
        <fieldset aria-label="Qual link sai do topo" className="ed-menu-swap">
          {menu.items.map((item, index) => (
            <label className="ed-menu-swap__option" key={item.id ?? index}>
              <input
                checked={leaving === index}
                name="ed-menu-swap"
                onChange={() => setLeaving(index)}
                type="radio"
              />
              <span>{item.label}</span>
              {leaving === index && <span className="ed-hint">sai do topo e continua no ar</span>}
            </label>
          ))}
          <label className="ed-menu-swap__option ed-menu-swap__option--none">
            <input
              checked={leaving === 'none'}
              name="ed-menu-swap"
              onChange={() => setLeaving('none')}
              type="radio"
            />
            <span>Não pôr “{name}” no menu agora</span>
          </label>
        </fieldset>
        {error && <p className="ed-hint ed-hint--warn">Não deu para publicar: {error}</p>}
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
          {/* Fica sempre à vista, junto dos botões: a pessoa decide antes de publicar, mesmo com
              uma lista comprida de avisos (rodada 2, F9). */}
          {(menu.kind === 'can-add' || menu.kind === 'full') && (
            <label className="ed-switch ed-publish-menu">
              <input
                checked={addToMenu}
                onChange={(event) => setAddToMenu(event.target.checked)}
                type="checkbox"
              />
              Colocar esta página no menu do topo e do rodapé
            </label>
          )}
          {brand && (
            <label className="ed-switch ed-publish-menu">
              <input
                checked={withBrand}
                onChange={(event) => setWithBrand(event.target.checked)}
                type="checkbox"
              />
              Publicar também Sua marca (muda todas as páginas)
            </label>
          )}
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
                : swapping
                  ? 'Continuar'
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
        {examples.length ? (
          <Check
            title={
              examples.length === 1
                ? 'Um texto de exemplo para trocar'
                : `${examples.length} textos de exemplo para trocar`
            }
          >
            Os visitantes vão ver esse texto. Troque pelo seu:
            <ExampleList items={examples} onGoTo={onGoTo} />
          </Check>
        ) : (
          <Check ok title="Sem texto de exemplo" />
        )}
        {hidden.length > 0 && (
          <Check
            title={
              hidden.length === 1
                ? 'Uma seção não vai aparecer no site'
                : `${hidden.length} seções não vão aparecer no site`
            }
          >
            {hidden.length === 1
              ? 'No editor ela aparece, mas no site fica de fora (ou vazia) até ganhar conteúdo:'
              : 'No editor elas aparecem, mas no site ficam de fora (ou vazias) até ganharem conteúdo:'}
            <GoToList items={hidden} onGoTo={onGoTo} />
          </Check>
        )}
        {deviceLinks.length > 0 && (
          <Check
            title={
              deviceLinks.length === 1
                ? 'Um link leva para uma seção escondida num aparelho'
                : `${deviceLinks.length} links levam para seções escondidas num aparelho`
            }
          >
            Nesse aparelho, o visitante toca e fica no topo da página. Mostre a seção nos dois ou
            mude o destino:
            <GoToList items={deviceLinks} onGoTo={onGoTo} />
          </Check>
        )}
        {deviceOnly.length > 0 && (
          <Check
            ok
            title={
              deviceOnly.length === 1
                ? 'Uma seção aparece só num aparelho'
                : `${deviceOnly.length} seções aparecem só num aparelho`
            }
          >
            Confira se é isso mesmo:
            <GoToList items={deviceOnly} onGoTo={onGoTo} />
          </Check>
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
        {unnamedLinks.length > 0 && (
          <Check
            title={
              unnamedLinks.length === 1
                ? 'Um botão leva para uma seção sem nome no menu'
                : `${unnamedLinks.length} botões levam para seções sem nome no menu`
            }
          >
            No site, ele leva para o topo da página. Dê um nome à seção ou escolha outro destino:
            <GoToList
              items={unnamedLinks.map((button) => ({
                id: button.id,
                label: `“${button.label}”, em ${button.section}`,
              }))}
              onGoTo={onGoTo}
            />
          </Check>
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
        {brand &&
          (withBrand ? (
            <Check ok title="Sua marca vai junto">
              {brand.personality ? `Visual ${brand.personality}, cores` : 'Cores'} e letras mudam em
              todas as páginas. Vai junto também o que estiver guardado em Configurações.
            </Check>
          ) : (
            <Check
              title={
                brand.personality
                  ? `O visual ${brand.personality} ainda não está no ar`
                  : 'Sua marca tem mudanças que ainda não estão no ar'
              }
            >
              Sem a caixa “Publicar também Sua marca”, o site continua com as cores e letras de
              antes. Marque a caixa ou{' '}
              <a href={panelHref(adminRoute, 'brand')}>publique em Sua marca</a>.
            </Check>
          ))}
        {whatsappWithoutNumber && (
          <Check title="Botão de WhatsApp sem número">
            Ele fica escondido até você pôr o número em Configurações.
          </Check>
        )}
        {menu.kind === 'cannot-add' && (
          <Check ok title="Esta página fica fora do menu">
            {menu.reason}
          </Check>
        )}
      </ul>
      {error && <p className="ed-hint ed-hint--warn">Não deu para publicar: {error}</p>}
    </Dialog>
  )
}

/** Textos de exemplo (A7): o lugar, o texto e o "Ir até"; até 3, e o resto num toque. */
function ExampleList({
  items,
  onGoTo,
}: {
  items: { id: string; label: string; text: string }[]
  onGoTo: (id: string) => void
}) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, EXAMPLES_SHOWN)
  return (
    <span className="ed-goto-list">
      {shown.map((item, index) => (
        <span className="ed-goto ed-goto--example" key={`${item.id}-${index}`}>
          <span className="ed-goto__text">
            <span>{item.label}</span>
            <q className="ed-examples__quote">
              {item.text.length > 120 ? `${item.text.slice(0, 117).trimEnd()}…` : item.text}
            </q>
          </span>
          {item.id && (
            <button className="ed-btn ed-btn--sm" onClick={() => onGoTo(item.id)} type="button">
              Ir até
            </button>
          )}
        </span>
      ))}
      {shown.length < items.length && (
        <button className="ed-linkbtn" onClick={() => setAll(true)} type="button">
          {items.length - shown.length === 1
            ? 'Ver o outro'
            : `Ver os outros ${items.length - shown.length}`}
        </button>
      )}
    </span>
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
          {item.id && (
            <button className="ed-btn ed-btn--sm" onClick={() => onGoTo(item.id)} type="button">
              Ir até
            </button>
          )}
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
