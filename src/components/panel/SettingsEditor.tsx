'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import React, { useState } from 'react'

import { thumbnailURL } from '@/components/editor/context'
import {
  DEFAULT_WHATSAPP_MESSAGE,
  normalizeWhatsApp,
  socialURL,
  whatsAppGreeting,
} from '@/lib/links'
import { distinctPageTitles } from '@/lib/pageTitle'
import { panelHref } from '@/lib/panel'
import type { Media } from '@/payload-types'

import { type Block, BlockNav } from './BlockNav'
import { ConflictNotice } from './ConflictNotice'
import { DiscardButton } from './DiscardButton'
import { ErrorSummary } from './ErrorSummary'
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
  /** Data da versão das configurações que a tela abriu (A3). */
  version: string
  livePages: { id: number; title: string; slug?: string | null }[]
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

/**
 * Configurações: identidade, página inicial, contato, redes e Google. O logo, as cores, as letras,
 * o jeito e a animação do site ficam em Sua marca (`BrandEditor`), no mesmo rascunho.
 */
export function SettingsEditor({
  adminRoute,
  apiRoute,
  domain,
  initial,
  version,
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
    version,
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
        onBlur={(event) => {
          // Redes: "facebook.com/loja" ganha o https:// ao sair do campo, como no Menu e rodapé.
          if (groupKey !== 'social') return
          const next = socialURL(key as keyof SettingsState['social'], event.target.value)
          if (next !== event.target.value) update({ social: { ...state.social, [key]: next } })
        }}
        onChange={(event) =>
          update({ [groupKey]: { ...state[groupKey], [key]: event.target.value } })
        }
        value={(state[groupKey] as Record<string, string>)[key]}
      />
      {errors[key] ? (
        <span className="gp-hint gp-hint--error">{errors[key]}</span>
      ) : groupKey === 'social' && willBecome(key as keyof SettingsState['social']) ? (
        <span className="gp-hint">
          Vai ficar: {willBecome(key as keyof SettingsState['social'])}
        </span>
      ) : (
        hint && <span className="gp-hint">{hint}</span>
      )}
    </div>
  )

  /** O endereço completo que a rede vai ter, quando é diferente do que foi digitado. */
  const willBecome = (key: keyof SettingsState['social']) => {
    const typed = state.social[key].trim()
    const next = socialURL(key, typed)
    return typed && next !== typed ? next : null
  }

  const homeLive = livePages.some((page) => page.id === state.homepage)
  // Duas páginas com o mesmo nome ("Início" e "Início") aparecem com o endereço junto.
  const liveTitles = distinctPageTitles(livePages)
  const homeInList = homeLive || draftHome?.id === state.homepage
  const shareImage = photos.find((item) => item.id === state.shareImage) ?? null

  // B8 v2: o resumo de cada bloco sai do rascunho e muda na hora.
  const pageName = (id: number | null, draftPage: { id: number; title: string } | null) =>
    livePages.find((page) => page.id === id)?.title ??
    (draftPage?.id === id ? `${draftPage.title} (rascunho)` : null)
  const homeName = pageName(state.homepage, draftHome)
  const privacyName = pageName(state.privacyPage, draftPrivacy)
  const filled = (entries: [string, string][]) =>
    entries.filter(([, value]) => value.trim()).map(([label]) => label)
  const contactParts = filled([
    ['WhatsApp', state.contact.whatsapp],
    ['telefone', state.contact.phone],
    ['e-mail', state.contact.email],
    ['endereço', state.contact.address],
    ['horário', state.contact.hours],
  ])
  const socialParts = filled([
    ['Instagram', state.social.instagram],
    ['Facebook', state.social.facebook],
    ['YouTube', state.social.youtube],
    ['TikTok', state.social.tiktok],
    ['LinkedIn', state.social.linkedin],
  ])
  const fix = (keys: string[]) =>
    keys.some((key) => errors[key]) ? 'Campo para corrigir' : undefined
  const join = (parts: string[]) =>
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}` : (parts[0] ?? '')
  const blocks: Block[] = [
    {
      id: 'st-identidade',
      label: 'Identidade',
      summary: state.name.trim(),
      missing:
        fix(['name']) ??
        (!state.name.trim()
          ? 'Falta o nome do negócio'
          : !state.tagline.trim()
            ? 'Falta a frase de apresentação'
            : undefined),
    },
    {
      id: 'st-inicial',
      label: 'Página inicial',
      summary: homeName ?? undefined,
      missing: homeName ? undefined : 'Falta escolher a página',
    },
    {
      id: 'st-privacidade',
      label: 'Privacidade',
      summary: privacyName ?? undefined,
      missing: privacyName ? undefined : 'Falta escolher a página',
    },
    {
      id: 'st-contato',
      label: 'Contato',
      summary: contactParts.length ? join(contactParts).replace(/^./, (c) => c.toUpperCase()) : '',
      missing:
        fix(['whatsapp', 'email']) ??
        (state.contact.whatsapp.trim() || state.contact.email.trim()
          ? undefined
          : 'Falta o WhatsApp ou o e-mail'),
    },
    {
      id: 'st-redes',
      label: 'Redes sociais',
      summary: socialParts.length ? join(socialParts) : 'Nenhuma rede',
      missing: fix(['instagram', 'facebook', 'youtube', 'tiktok', 'linkedin']),
    },
    {
      id: 'st-google',
      label: 'Google',
      summary: state.seoDescription.trim() ? 'Descrição escrita' : 'Sem descrição própria',
    },
    // Nome curto no atalho: com o nome inteiro, os atalhos quebravam em 2 linhas perto de 1050 px.
    { id: 'st-pessoas', label: 'Pessoas', summary: 'Quem pode mexer no painel' },
    ...(canStartOver
      ? [
          {
            id: 'st-modelo',
            label: 'Começar de novo',
            summary: 'Troca o site inteiro por um modelo',
            danger: true,
            phoneOnly: true,
          },
        ]
      : []),
  ]

  return (
    <div className="gp-page" role="main">
      <header className="gp-pagehead">
        <div>
          <h1>Configurações</h1>
          <p>
            Informações que valem para o site todo. Suas mudanças ficam guardadas e vão ao ar quando
            você publicar.
          </p>
        </div>
        <SaveStatus
          blocked={
            draft.conflict
              ? 'Não salvo: escolha a versão'
              : save === 'invalid'
                ? Object.keys(errors).length > 1
                  ? `Corrija os ${Object.keys(errors).length} campos marcados para salvar`
                  : 'Corrija o campo marcado para salvar'
                : null
          }
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
        {/* Atalhos para cada bloco: a tela é longa. "Começar de novo" fica fora da linha do
            computador (é o último bloco, de perigo) e separado no fim da lista do celular. */}
        <BlockNav blocks={blocks} label="Blocos desta tela" />
        <div className="gp-actions">
          {pending && (
            <DiscardButton
              detail="Os nomes, contatos, redes e páginas escolhidas voltam a ser os que estão no ar."
              disabled={busy || save === 'saving'}
              onDiscard={draft.discard}
              what="Configurações"
            />
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

      {draft.conflict && (
        <ConflictNotice
          onKeepMine={draft.keepMine}
          onSeeLatest={draft.seeLatest}
          what="As Configurações"
        />
      )}
      <ErrorSummary count={Object.keys(errors).length} />

      {message && (
        <p className={message.tone === 'ok' ? 'gp-notice' : 'gp-error'} role="status">
          {message.text}
        </p>
      )}

      {/* Travada enquanto publica ou descarta: o que fosse digitado no meio seria desfeito. */}
      <div className="gp-grid2" inert={busy}>
        {/* L2: duas colunas que se encaixam como um mural, sem vão embaixo de Identidade. No
            celular, uma coluna na ordem dos atalhos. */}
        <div className="gp-col gp-col--left">
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
            {group(
              'contact',
              'hours',
              'Horário de funcionamento',
              'Ex.: Seg a sáb, das 7h às 19h.',
            )}
            <fieldset className="gp-fieldset gp-wa">
              <legend className="gp-label">Botões de WhatsApp do site</legend>
              <div className="gp-field">
                <label htmlFor="st-whatsappMessage">Mensagem que já vem escrita</label>
                <input
                  className="gp-input"
                  id="st-whatsappMessage"
                  maxLength={200}
                  onChange={(event) =>
                    update({ contact: { ...state.contact, whatsappMessage: event.target.value } })
                  }
                  placeholder={DEFAULT_WHATSAPP_MESSAGE}
                  value={state.contact.whatsappMessage}
                />
                <span className="gp-hint">
                  Quem toca num botão de WhatsApp do site já encontra este texto, com a página de
                  onde veio. Os produtos continuam com o nome do produto.
                </span>
              </div>
              <div aria-label="Como a conversa começa" className="gp-wa__chat" role="group">
                <span className="gp-small gp-muted">A conversa começa assim:</span>
                <p className="gp-wa__bubble">
                  {whatsAppGreeting(state.contact.whatsappMessage, 'Contato')}
                </p>
              </div>
              <label className="gp-switch">
                <input
                  checked={state.whatsappFloat.phone}
                  onChange={(event) =>
                    update({
                      whatsappFloat: { ...state.whatsappFloat, phone: event.target.checked },
                    })
                  }
                  type="checkbox"
                />
                Botão no canto da tela no celular
              </label>
              <label className="gp-switch">
                <input
                  checked={state.whatsappFloat.desktop}
                  onChange={(event) =>
                    update({
                      whatsappFloat: { ...state.whatsappFloat, desktop: event.target.checked },
                    })
                  }
                  type="checkbox"
                />
                Botão no canto da tela também no computador
              </label>
              {!normalizeWhatsApp(state.contact.whatsapp) && (
                <span className="gp-hint">
                  Os botões de WhatsApp só aparecem no site com o número preenchido acima.
                </span>
              )}
            </fieldset>
          </section>
        </div>

        <div className="gp-col gp-col--right">
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
                    {liveTitles.get(page.id)}
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
                    {liveTitles.get(page.id)}
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
          <section className="gp-card" id="st-redes">
            <div>
              <h2>Redes sociais</h2>
              <p className="gp-small gp-muted">Deixe em branco o que não usa.</p>
            </div>
            {group('social', 'instagram', 'Instagram', 'O perfil, como @seunegocio.')}
            {group('social', 'facebook', 'Facebook', 'Ex.: facebook.com/seunegocio')}
            {group('social', 'youtube', 'YouTube', 'Ex.: youtube.com/@seunegocio')}
            {group('social', 'tiktok', 'TikTok', 'Ex.: tiktok.com/@seunegocio')}
            {group('social', 'linkedin', 'LinkedIn', 'Ex.: linkedin.com/company/seunegocio')}
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
