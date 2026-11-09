'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import React, { useState } from 'react'

import { thumbnailURL } from '@/components/editor/context'
import { panelHref } from '@/lib/panel'
import type { Media } from '@/payload-types'

import { PanelIcon } from './PanelIcon'
import { PhotoChooser } from './PhotoChooser'
import { SaveStatus } from './SaveStatus'
import type { SettingsState } from './settings'
import { Tip } from './Tip'
import { useSettingsDraft } from './useSettingsDraft'
import { WhyDisabled } from './WhyDisabled'

type Props = {
  adminRoute: string
  apiRoute: string
  domain: string
  initial: SettingsState
  livePages: { id: number; title: string }[]
  /** Página inicial escolhida que ainda não está no ar (o site novo nasce assim). */
  draftHome: { id: number; title: string } | null
  /** Página de privacidade escolhida que ainda não está no ar. */
  draftPrivacy: { id: number; title: string } | null
  /** Frase do modelo, só como dica no campo vazio: nunca vai para o site. */
  taglineHint: string
  pending: boolean
  /** Cartão "Pessoas com acesso", montado pela tela. */
  people: React.ReactNode
  /** Só administrador: começar de novo com um modelo (início guiado, fase 4). */
  canStartOver: boolean
  photos: Media[]
}

export type { SettingsState }

// Blocos da tela, na ordem, para os atalhos do topo.
const SECTIONS: [string, string][] = [
  ['st-identidade', 'Identidade'],
  ['st-inicial', 'Página inicial'],
  ['st-privacidade', 'Privacidade'],
  ['st-contato', 'Contato'],
  ['st-redes', 'Redes sociais'],
  ['st-google', 'Google'],
  ['st-pessoas', 'Pessoas com acesso'],
  ['st-modelo', 'Começar de novo'],
]

/**
 * Configurações: identidade, página inicial, contato, redes e Google. O logo, as cores, as letras,
 * o jeito e a animação do site ficam em Sua marca (`BrandEditor`), no mesmo rascunho.
 */
export function SettingsEditor({
  adminRoute,
  apiRoute,
  domain,
  initial,
  livePages,
  draftHome,
  draftPrivacy,
  taglineHint,
  pending: initialPending,
  people,
  canStartOver,
  photos: initialPhotos,
}: Props) {
  const draft = useSettingsDraft({
    apiRoute,
    initial,
    initialPending,
    publishedText: 'Configurações publicadas em todo o site.',
  })
  const { state, update, errors, save, busy, pending, message } = draft
  const [photos, setPhotos] = useState(initialPhotos)
  const [choosing, setChoosing] = useState(false)

  const text = (
    key: 'name' | 'tagline' | 'seoDescription',
    label: string,
    options: { multiline?: boolean; max: number; hint?: string; placeholder?: string },
  ) => {
    const Tag = options.multiline ? 'textarea' : 'input'
    return (
      <div className="gp-field">
        <label htmlFor={`st-${key}`}>{label}</label>
        <Tag
          aria-invalid={Boolean(errors[key])}
          className="gp-input"
          id={`st-${key}`}
          maxLength={options.max}
          onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            update({ [key]: event.target.value })
          }
          placeholder={options.placeholder}
          rows={options.multiline ? 3 : undefined}
          value={state[key]}
        />
        {errors[key] ? (
          <span className="gp-hint gp-hint--error">{errors[key]}</span>
        ) : (
          options.hint && <span className="gp-hint">{options.hint}</span>
        )}
      </div>
    )
  }

  const group = <G extends 'contact' | 'social'>(
    groupKey: G,
    key: keyof SettingsState[G] & string,
    label: string,
    hint?: string,
  ) => (
    <div className="gp-field" key={key}>
      <label htmlFor={`st-${key}`}>{label}</label>
      <input
        aria-invalid={Boolean(errors[key])}
        className="gp-input"
        id={`st-${key}`}
        maxLength={200}
        onChange={(event) =>
          update({ [groupKey]: { ...state[groupKey], [key]: event.target.value } })
        }
        value={(state[groupKey] as Record<string, string>)[key]}
      />
      {errors[key] ? (
        <span className="gp-hint gp-hint--error">{errors[key]}</span>
      ) : (
        hint && <span className="gp-hint">{hint}</span>
      )}
    </div>
  )

  const homeLive = livePages.some((page) => page.id === state.homepage)
  const homeInList = homeLive || draftHome?.id === state.homepage
  const shareImage = photos.find((item) => item.id === state.shareImage) ?? null

  return (
    <div className="gp-page">
      <header className="gp-pagehead">
        <div>
          <h1>Configurações</h1>
          <p>
            Informações que valem para o site todo. Suas mudanças ficam guardadas e vão ao ar quando
            você publicar.
          </p>
        </div>
        <SaveStatus
          blocked={save === 'invalid' ? 'Corrija o campo marcado para salvar' : null}
          error={draft.saveError}
          mode="publish"
          onRetry={draft.retry}
          pending={pending}
          state={
            save === 'error' ? 'error' : save === 'idle' || save === 'invalid' ? 'saved' : 'saving'
          }
        />
      </header>

      <div className="gp-pubbar">
        {/* Atalhos para cada bloco: a tela é longa. "Começar de novo" fica de fora: é o último bloco,
            de perigo, e sem ele os atalhos cabem numa linha no computador. */}
        <nav aria-label="Blocos desta tela" className="gp-toc gp-toc--row">
          {SECTIONS.filter(([id]) => id !== 'st-modelo').map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
        </nav>
        <div className="gp-actions">
          {pending && (
            <button
              className="gp-btn"
              disabled={busy || save === 'saving'}
              onClick={draft.discard}
              type="button"
            >
              Descartar mudanças
            </button>
          )}
          <div className="gp-btnwrap">
            <button
              aria-describedby={draft.cantPublish ? 'st-why' : undefined}
              className="gp-btn gp-btn--primary"
              disabled={busy || Boolean(draft.cantPublish)}
              onClick={draft.publish}
              type="button"
            >
              {busy ? 'Aguarde…' : 'Publicar configurações'}
            </button>
            <WhyDisabled id="st-why" reason={draft.cantPublish} />
          </div>
        </div>
      </div>

      {message && (
        <p className={message.tone === 'ok' ? 'gp-notice' : 'gp-error'} role="status">
          {message.text}
        </p>
      )}

      {/* Travada enquanto publica ou descarta: o que fosse digitado no meio seria desfeito. */}
      <div className="gp-grid2" inert={busy}>
        <section className="gp-card" id="st-identidade">
          <h2>Identidade</h2>
          {text('name', 'Nome do negócio', { max: 80 })}
          {text('tagline', 'Frase de apresentação', {
            multiline: true,
            max: 200,
            hint: 'Uma frase curta sobre o negócio. Também vai no título da página inicial no Google.',
            placeholder: `Ex.: ${taglineHint}`,
          })}
          <p className="gp-small gp-muted">
            O logo, as cores e as letras ficam em{' '}
            <Link className="gp-link" href={panelHref(adminRoute, 'brand')}>
              Sua marca
            </Link>
            .
          </p>
        </section>

        <div className="gp-col">
          <section className="gp-card" id="st-inicial">
            <h2>Página inicial</h2>
            <div className="gp-field">
              <label htmlFor="st-home">Qual página abre em {domain}?</label>
              <select
                className="gp-input"
                id="st-home"
                onChange={(event) => update({ homepage: Number(event.target.value) || null })}
                value={state.homepage ?? ''}
              >
                {!homeInList && <option value="">Escolha uma página</option>}
                {draftHome && <option value={draftHome.id}>{draftHome.title} (rascunho)</option>}
                {livePages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
              <span className="gp-hint">
                {homeLive
                  ? 'Só aparecem páginas que já estão no ar.'
                  : `Enquanto a página inicial não estiver no ar, quem abre ${domain} vê só o nome do site e o aviso "Site em construção. Volte em breve.", com o botão do WhatsApp se ele estiver preenchido.`}
              </span>
            </div>
          </section>
          <section className="gp-card" id="st-privacidade">
            <h2>Página de privacidade</h2>
            <div className="gp-field">
              <label htmlFor="st-privacy">Qual página explica como você cuida dos dados?</label>
              <select
                className="gp-input"
                id="st-privacy"
                onChange={(event) => update({ privacyPage: Number(event.target.value) || null })}
                value={state.privacyPage ?? ''}
              >
                <option value="">Nenhuma</option>
                {draftPrivacy && (
                  <option value={draftPrivacy.id}>{draftPrivacy.title} (rascunho)</option>
                )}
                {livePages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
              <span className="gp-hint">
                Quando ela estiver no ar, o link “Privacidade” aparece no rodapé e nos formulários.
              </span>
            </div>
          </section>
          <section className="gp-card">
            <h2>Endereço do site</h2>
            <div className="gp-live">
              <span aria-hidden="true" className="gp-live__dot" />
              {domain}
            </div>
            <span className="gp-small gp-muted">
              Com cadeado de segurança (https). Para trocar o domínio, fale com o suporte.
            </span>
          </section>
        </div>

        <section className="gp-card" id="st-contato">
          <div>
            <h2>Contato</h2>
            <p className="gp-small gp-muted">
              Aparece no rodapé e na seção “Contato e endereço” de todas as páginas.
            </p>
          </div>
          {group(
            'contact',
            'whatsapp',
            'WhatsApp',
            'Com DDD. Os botões de WhatsApp usam este número.',
          )}
          {group('contact', 'phone', 'Telefone')}
          {group('contact', 'email', 'E-mail')}
          {group('contact', 'address', 'Endereço')}
          {group('contact', 'hours', 'Horário de funcionamento', 'Ex.: Seg a sáb, das 7h às 19h.')}
        </section>

        <div>
          <section className="gp-card" id="st-redes">
            <div>
              <h2>Redes sociais</h2>
              <p className="gp-small gp-muted">Deixe em branco o que não usa.</p>
            </div>
            {group('social', 'instagram', 'Instagram', 'O perfil, como @seunegocio.')}
            {group('social', 'facebook', 'Facebook', 'Endereço completo, começando com https://')}
            {group('social', 'youtube', 'YouTube')}
            {group('social', 'tiktok', 'TikTok')}
            {group('social', 'linkedin', 'LinkedIn')}
          </section>
        </div>

        <section className="gp-card gp-grid2__full" id="st-google">
          <h2>Google e compartilhamento</h2>
          <div className="gp-grid2">
            {text('seoDescription', 'Descrição do site no Google', {
              multiline: true,
              max: 160,
              hint: 'Usada quando uma página não tem frase própria. Até 160 letras.',
            })}
            <div className="gp-field">
              <span className="gp-label">Foto ao compartilhar o site</span>
              <div className="gp-thumbrow">
                {shareImage ? (
                  <img alt="" className="gp-thumb" src={thumbnailURL(shareImage)} />
                ) : (
                  <span className="gp-thumb gp-thumb--empty">
                    <PanelIcon name="image" />
                  </span>
                )}
                <div className="gp-stack">
                  <button
                    className="gp-btn gp-btn--sm"
                    onClick={() => setChoosing(true)}
                    type="button"
                  >
                    {shareImage ? 'Trocar foto' : 'Escolher foto'}
                  </button>
                  {shareImage ? (
                    <button
                      className="gp-btn gp-btn--sm gp-btn--ghost"
                      onClick={() => update({ shareImage: null })}
                      type="button"
                    >
                      Tirar a foto
                    </button>
                  ) : (
                    <span className="gp-small gp-muted">
                      Sem foto, cada página ganha uma imagem pronta: a foto do banner, o título e o
                      logo, nas cores do site.
                    </span>
                  )}
                </div>
              </div>
              <span className="gp-hint">
                Aparece quando alguém manda o link do site no WhatsApp ou nas redes. Cada página
                pode ter a sua.
              </span>
            </div>
          </div>
          <ul className="gp-checklist">
            <li>Mapa do site enviado ao Google, atualizado sozinho a cada publicação.</li>
            <li>Páginas em rascunho ficam escondidas: o Google só vê o que está no ar.</li>
            <li>Ícone do site (a aba do navegador) feito a partir do logo.</li>
          </ul>
        </section>

        <div className="gp-grid2__full" id="st-pessoas">
          {people}
        </div>

        {canStartOver && (
          <section className="gp-card gp-card--danger gp-grid2__full" id="st-modelo">
            <h2>Começar de novo com um modelo</h2>
            <p>
              <b>Troca o site inteiro.</b> As páginas de hoje saem do ar e ficam guardadas em
              Páginas, no grupo Arquivadas; o menu, o rodapé, as cores e as letras passam a ser os
              do modelo. Antes de trocar, você vê o modelo e confirma.
            </p>
            <div>
              <Link className="gp-btn gp-btn--danger" href={panelHref(adminRoute, 'start')}>
                Ver os modelos
              </Link>
            </div>
          </section>
        )}
      </div>

      <Tip>
        O menu e o rodapé ficam em{' '}
        <Link className="gp-link" href={panelHref(adminRoute, 'menu')}>
          Menu e rodapé
        </Link>
        .
      </Tip>

      {choosing && (
        <PhotoChooser
          onClose={() => setChoosing(false)}
          onPick={(picked) => {
            update({ shareImage: picked.id })
            setChoosing(false)
          }}
          onUploaded={(uploaded) => setPhotos((current) => [uploaded, ...current])}
          photos={photos}
          title="Escolha a foto ao compartilhar"
        />
      )}
    </div>
  )
}
