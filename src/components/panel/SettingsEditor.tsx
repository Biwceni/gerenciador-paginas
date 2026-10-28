'use client'

import '@/app/(frontend)/styles.css'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

import { request } from '@/components/editor/api'
import { thumbnailURL } from '@/components/editor/context'
import { footerSocial, SiteFooterView, SiteHeaderView } from '@/components/site/SiteChrome'
import { themeStyle } from '@/components/site/theme'
import { HEX_COLOR_PATTERN } from '@/lib/colors'
import { normalizeWhatsApp, validateExternalURL, validateInstagram, whatsAppURL } from '@/lib/links'
import { panelHref } from '@/lib/panel'
import { initials } from '@/lib/site'
import {
  COLOR_FIELDS,
  COLOR_PRESETS,
  contrastWarnings,
  FONT_PRESETS,
  FONT_SUGGESTIONS,
  formatRatio,
  normalizeFontName,
  type SiteColors,
} from '@/lib/style-presets'
import { FONT_NAME_PATTERN } from '@/lib/theme'
import type { Media, Site } from '@/payload-types'

import { PanelIcon } from './PanelIcon'
import { PhotoChooser } from './PhotoChooser'
import { SiteFrame } from './SiteFrame'

export type SettingsState = {
  name: string
  tagline: string
  logo: number | null
  homepage: number | null
  colors: SiteColors
  fonts: { headings: string; body: string }
  contact: { whatsapp: string; phone: string; email: string; address: string; hours: string }
  social: { instagram: string; facebook: string; youtube: string; tiktok: string; linkedin: string }
  seoDescription: string
  shareImage: number | null
}

type Props = {
  adminRoute: string
  apiRoute: string
  domain: string
  fontFaces: string | null
  initial: SettingsState
  livePages: { id: number; title: string }[]
  pending: boolean
  /** Cartão "Pessoas com acesso", montado pela tela. */
  people: React.ReactNode
  /** Só administrador: começar de novo com um modelo (início guiado, fase 4). */
  canStartOver: boolean
  photos: Media[]
}

type SaveState = 'idle' | 'waiting' | 'saving' | 'invalid' | 'error'
type FontRole = 'headings' | 'body'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Problemas que impedem salvar, por campo, em linguagem simples. */
function validate(state: SettingsState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!state.name.trim()) errors.name = 'Escreva o nome do negócio.'
  if (state.contact.whatsapp && !normalizeWhatsApp(state.contact.whatsapp)) {
    errors.whatsapp = 'Digite o número com DDD. Ex.: (31) 99999-0000.'
  }
  if (state.contact.email && !EMAIL.test(state.contact.email.trim())) {
    errors.email = 'Confira o e-mail. Ex.: contato@seunegocio.com.br'
  }
  const instagram = validateInstagram(state.social.instagram)
  if (instagram !== true) errors.instagram = instagram
  for (const key of ['facebook', 'youtube', 'tiktok', 'linkedin'] as const) {
    const value = state.social[key].trim()
    const result = value ? validateExternalURL(value) : true
    if (result !== true) errors[key] = result
  }
  return errors
}

/** As configurações como o Payload guarda (texto vazio vira "sem valor"). */
function toSiteData(state: SettingsState) {
  const orNull = (value: string) => value.trim() || null
  return {
    name: state.name.trim(),
    tagline: orNull(state.tagline),
    logo: state.logo,
    homepage: state.homepage,
    colors: state.colors,
    fonts: { headings: orNull(state.fonts.headings), body: orNull(state.fonts.body) },
    contact: {
      whatsapp: orNull(state.contact.whatsapp),
      phone: orNull(state.contact.phone),
      email: orNull(state.contact.email),
      address: orNull(state.contact.address),
      hours: orNull(state.contact.hours),
    },
    social: {
      instagram: orNull(state.social.instagram),
      facebook: orNull(state.social.facebook),
      youtube: orNull(state.social.youtube),
      tiktok: orNull(state.social.tiktok),
      linkedin: orNull(state.social.linkedin),
    },
    seoDescription: orNull(state.seoDescription),
    shareImage: state.shareImage,
  }
}

const googleFontCSS = (name: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}&display=swap`

export function SettingsEditor({
  adminRoute,
  apiRoute,
  domain,
  fontFaces,
  initial,
  livePages,
  pending,
  people,
  canStartOver,
  photos: initialPhotos,
}: Props) {
  const [state, setState] = useState(initial)
  const [published, setPublished] = useState(initial)
  const [touched, setTouched] = useState(false)
  const [save, setSave] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fontError, setFontError] = useState<Partial<Record<FontRole, string>>>({})
  const [fontText, setFontText] = useState(initial.fonts)
  const [hexText, setHexText] = useState<SiteColors>(initial.colors)
  const [photos, setPhotos] = useState(initialPhotos)
  const [choosing, setChoosing] = useState<'logo' | 'shareImage' | null>(null)

  const errors = validate(state)
  const photo = (id: number | null) => photos.find((item) => item.id === id) ?? null

  const update = (next: Partial<SettingsState>) => {
    setState((current) => ({ ...current, ...next }))
    setTouched(true)
    setSave('waiting')
  }

  // Cada mudança é salva e publicada sozinha, um pouco depois da última (como no protótipo).
  useEffect(() => {
    // Já salvo: depois de salvar, `published` passa a ser este mesmo estado.
    if (!touched || state === published) return
    const timer = setTimeout(async () => {
      if (Object.keys(validate(state)).length) {
        setSave('invalid')
        return
      }
      setSave('saving')
      try {
        await request(apiRoute, '/globals/site', {
          method: 'POST',
          body: JSON.stringify({ ...toSiteData(state), _status: 'published' }),
        })
        setPublished(state)
        setFontError({})
        setSaveError(null)
        setSave('idle')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Tente de novo.'
        // Fonte que o Google não tem: volta para a anterior e salva o resto de novo.
        const role = (['headings', 'body'] as const).find(
          (key) => state.fonts[key] !== published.fonts[key],
        )
        if (role && message.includes('Google Fonts')) {
          setFontError({ [role]: message })
          setFontText((current) => ({ ...current, [role]: published.fonts[role] }))
          setState((current) => ({
            ...current,
            fonts: { ...current.fonts, [role]: published.fonts[role] },
          }))
          setSave('waiting')
          return
        }
        setSaveError(message)
        setSave('error')
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [apiRoute, published, state, touched])

  // Aviso ao fechar a aba com mudança ainda não salva.
  useEffect(() => {
    if (save === 'idle') return
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [save])

  const setColor = (key: keyof SiteColors, value: string) => {
    setHexText((current) => ({ ...current, [key]: value }))
    if (HEX_COLOR_PATTERN.test(value)) {
      update({ colors: { ...state.colors, [key]: value.toLowerCase() } })
    }
  }
  const applyColors = (colors: SiteColors) => {
    setHexText(colors)
    update({ colors })
  }

  const commitFont = (role: FontRole) => {
    const name = fontText[role].trim() ? normalizeFontName(fontText[role]) : ''
    if (name && !FONT_NAME_PATTERN.test(name)) {
      setFontError({ [role]: 'Use só o nome da fonte, sem símbolos. Ex.: Playfair Display.' })
      return
    }
    setFontError((current) => ({ ...current, [role]: undefined }))
    setFontText((current) => ({ ...current, [role]: name }))
    if (name !== state.fonts[role]) update({ fonts: { ...state.fonts, [role]: name } })
  }
  const applyFonts = (fonts: { headings: string; body: string }) => {
    setFontError({})
    setFontText(fonts)
    update({ fonts })
  }

  const contrast = contrastWarnings(state.colors)
  const previewSite = { colors: state.colors, fonts: state.fonts } as Partial<Site>
  const previewFonts = [...new Set([state.fonts.headings, state.fonts.body].filter(Boolean))]
  const status = {
    idle: 'Tudo salvo e no ar',
    waiting: 'Salvando…',
    saving: 'Salvando…',
    invalid: 'Corrija o campo marcado para salvar',
    error: 'Não deu para salvar',
  }[save]

  const text = (
    key: 'name' | 'tagline' | 'seoDescription',
    label: string,
    options: { multiline?: boolean; max: number; hint?: string },
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

  const logo = photo(state.logo)
  const shareImage = photo(state.shareImage)

  return (
    <div className="gp-page">
      <header className="gp-pagehead">
        <div>
          <h1>Configurações</h1>
          <p>
            Informações que valem para o site todo. As mudanças são salvas sozinhas e aparecem no
            site na hora.
          </p>
        </div>
      </header>

      <div className="gp-pubbar">
        <span
          aria-live="polite"
          className={`gp-chip gp-chip--${save === 'idle' ? 'ok' : save === 'waiting' || save === 'saving' ? 'draft' : 'warn'}`}
        >
          {status}
        </span>
        {saveError && <span className="gp-error">{saveError}</span>}
      </div>

      {pending && !touched && (
        <p className="gp-tip">
          <PanelIcon name="help" size={16} />
          <span>
            Há mudanças feitas pela tela avançada que ainda não estão no ar. Elas vão junto na
            próxima mudança que você fizer aqui.
          </span>
        </p>
      )}

      <div className="gp-grid2">
        <section className="gp-card">
          <h2>Identidade</h2>
          {text('name', 'Nome do negócio', { max: 80 })}
          {text('tagline', 'Frase de apresentação', {
            multiline: true,
            max: 200,
            hint: 'Uma frase curta sobre o negócio. Também vai no título da página inicial no Google.',
          })}
          <div className="gp-field">
            <span className="gp-label">Logo</span>
            <div className="gp-thumbrow">
              {logo ? (
                <img alt="Logo" className="gp-thumb gp-thumb--logo" src={thumbnailURL(logo)} />
              ) : (
                <span
                  aria-hidden="true"
                  className="gp-thumb gp-thumb--initials"
                  style={themeStyle(previewSite) as React.CSSProperties}
                >
                  {initials(state.name || 'Meu site')}
                </span>
              )}
              <div className="gp-stack">
                <button
                  className="gp-btn gp-btn--sm"
                  onClick={() => setChoosing('logo')}
                  type="button"
                >
                  <PanelIcon name="upload" size={14} />
                  {logo ? 'Trocar logo' : 'Escolher logo'}
                </button>
                {logo ? (
                  <button
                    className="gp-btn gp-btn--sm gp-btn--ghost"
                    onClick={() => update({ logo: null })}
                    type="button"
                  >
                    Usar as iniciais
                  </button>
                ) : (
                  <span className="gp-small gp-muted">Sem logo, o site usa as iniciais.</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="gp-col">
          <section className="gp-card">
            <h2>Página inicial</h2>
            <div className="gp-field">
              <label htmlFor="st-home">Qual página abre em {domain}?</label>
              <select
                className="gp-input"
                id="st-home"
                onChange={(event) => update({ homepage: Number(event.target.value) || null })}
                value={state.homepage ?? ''}
              >
                {!livePages.some((page) => page.id === state.homepage) && (
                  <option value="">Escolha uma página</option>
                )}
                {livePages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
              <span className="gp-hint">Só aparecem páginas que já estão no ar.</span>
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

        <section className="gp-card gp-grid2__full">
          <div>
            <h2>Cores e letras</h2>
            <p className="gp-small gp-muted">Valem para o site todo.</p>
          </div>
          <div className="gp-style">
            <div className="gp-style__controls">
              <div className="gp-field">
                <span className="gp-label">Combinações prontas</span>
                <span className="gp-hint">
                  Um ponto de partida. Depois ajuste cada cor como quiser.
                </span>
                <div className="gp-swatches">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      className="gp-swatch"
                      key={preset.name}
                      onClick={() => applyColors(preset.colors)}
                      type="button"
                    >
                      <i
                        style={{
                          background: `linear-gradient(135deg, ${preset.colors.primary} 0 50%, ${preset.colors.background} 50% 100%)`,
                        }}
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="gp-field">
                <span className="gp-label">Suas cores</span>
                <span className="gp-hint">
                  Clique no quadrado para escolher qualquer cor, ou digite o código (ex.: #6b3f24).
                </span>
                <div className="gp-colors">
                  {COLOR_FIELDS.map(({ key, label, hint }) => (
                    <div className="gp-colorrow" key={key}>
                      <input
                        aria-label={label}
                        onChange={(event) => setColor(key, event.target.value)}
                        type="color"
                        value={state.colors[key]}
                      />
                      <div>
                        <label htmlFor={`st-hex-${key}`}>
                          <b>{label}</b>
                        </label>
                        <span className="gp-hint">{hint}</span>
                      </div>
                      <input
                        aria-invalid={!HEX_COLOR_PATTERN.test(hexText[key])}
                        className="gp-input gp-input--hex"
                        id={`st-hex-${key}`}
                        maxLength={7}
                        onBlur={() =>
                          setHexText((current) => ({ ...current, [key]: state.colors[key] }))
                        }
                        onChange={(event) => setColor(key, event.target.value.trim())}
                        spellCheck={false}
                        value={hexText[key]}
                      />
                    </div>
                  ))}
                </div>
                <div aria-live="polite" className="gp-contrast">
                  {contrast.length ? (
                    contrast.map((warning) => (
                      <p className="gp-contrast__line gp-contrast__line--warn" key={warning.label}>
                        <b>{warning.label}: difícil de ler</b> (contraste{' '}
                        {formatRatio(warning.ratio)}). {warning.hint} Você pode manter assim, é só
                        um aviso.
                      </p>
                    ))
                  ) : (
                    <p className="gp-contrast__line gp-contrast__line--ok">
                      Todas as combinações estão fáceis de ler.
                    </p>
                  )}
                </div>
              </div>

              <div className="gp-field">
                <span className="gp-label">Letras</span>
                <span className="gp-hint">
                  Use qualquer fonte do Google Fonts: escolha da lista ou digite o nome. As
                  combinações abaixo são só atalhos.
                </span>
                <div className="gp-seg" role="group" aria-label="Combinações de letras">
                  {FONT_PRESETS.map((preset) => (
                    <button
                      aria-pressed={
                        state.fonts.headings === preset.headings && state.fonts.body === preset.body
                      }
                      key={preset.name}
                      onClick={() => applyFonts({ headings: preset.headings, body: preset.body })}
                      type="button"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div className="gp-grid2 gp-grid2--tight">
                  {(
                    [
                      ['headings', 'Fonte dos títulos'],
                      ['body', 'Fonte dos textos'],
                    ] as const
                  ).map(([role, label]) => (
                    <div className="gp-field" key={role}>
                      <label htmlFor={`st-font-${role}`}>{label}</label>
                      <input
                        aria-invalid={Boolean(fontError[role])}
                        autoComplete="off"
                        className="gp-input"
                        id={`st-font-${role}`}
                        list="gp-font-list"
                        maxLength={60}
                        onBlur={() => commitFont(role)}
                        onChange={(event) =>
                          setFontText((current) => ({ ...current, [role]: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') commitFont(role)
                        }}
                        placeholder="Fonte padrão"
                        spellCheck={false}
                        value={fontText[role]}
                      />
                      {fontError[role] && (
                        <span className="gp-hint gp-hint--error">{fontError[role]}</span>
                      )}
                    </div>
                  ))}
                </div>
                <datalist id="gp-font-list">
                  {FONT_SUGGESTIONS.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <span className="gp-hint">
                  Ao salvar, a fonte é copiada do Google para o seu site: os visitantes não acessam
                  o Google.
                </span>
              </div>
            </div>

            <div className="gp-style__preview">
              <span className="gp-label">Prévia</span>
              <div className="gp-previewbox__frame">
                <SiteFrame
                  fontFaces={fontFaces}
                  stylesheets={previewFonts.map(googleFontCSS)}
                  theme={themeStyle(previewSite) as Record<string, string>}
                  title="Prévia das cores e letras"
                  width={1100}
                >
                  <SiteHeaderView
                    button={{ label: 'Fale conosco', href: '/' }}
                    items={['Início', 'Sobre', 'Contato'].map((label) => ({
                      id: label,
                      label,
                      href: '/',
                      current: label === 'Início',
                    }))}
                    logo={logo}
                    name={state.name || 'Meu site'}
                  />
                  <section className="section section--light">
                    <div className="container">
                      <h2 className="section-title">
                        {state.tagline.split('.')[0] || 'Assim fica o seu site'}
                      </h2>
                      <p>
                        Assim ficam os textos do seu site, com as letras e as cores que você
                        escolheu.
                      </p>
                      <p style={{ marginTop: 20 }}>
                        <span className="button">Conheça</span>
                      </p>
                    </div>
                  </section>
                  <section className="section section--soft" style={{ paddingBlock: 28 }}>
                    <div className="container">Faixa com o fundo suave</div>
                  </section>
                  <section className="section section--brand" style={{ paddingBlock: 28 }}>
                    <div className="container">
                      <b>Faixa com a cor principal</b>
                    </div>
                  </section>
                  <SiteFooterView
                    contact={{
                      whatsapp: state.contact.whatsapp || null,
                      whatsappHref: whatsAppURL(state.contact.whatsapp),
                      email: state.contact.email || null,
                      address: state.contact.address || null,
                      hours: state.contact.hours || null,
                    }}
                    menu={[]}
                    name={state.name || 'Meu site'}
                    showContact
                    social={footerSocial({ social: state.social } as Partial<Site>)}
                    text={null}
                  />
                </SiteFrame>
              </div>
            </div>
          </div>
        </section>

        <section className="gp-card">
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

        <div className="gp-col">
          <section className="gp-card">
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

          <section className="gp-card">
            <h2>Google e compartilhamento</h2>
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
                    onClick={() => setChoosing('shareImage')}
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
                    <span className="gp-small gp-muted">Sem foto, usamos o logo.</span>
                  )}
                </div>
              </div>
              <span className="gp-hint">
                Aparece quando alguém manda o link do site no WhatsApp ou nas redes. Cada página
                pode ter a sua.
              </span>
            </div>
            <ul className="gp-checklist">
              <li>Mapa do site enviado ao Google, atualizado sozinho a cada publicação.</li>
              <li>Páginas em rascunho ficam escondidas: o Google só vê o que está no ar.</li>
            </ul>
          </section>
        </div>

        <div className="gp-grid2__full">{people}</div>

        {canStartOver && (
          <section className="gp-card gp-grid2__full">
            <h2>Começar de novo com um modelo</h2>
            <p className="gp-muted gp-small">
              Escolha outro tipo de site e um modelo pronto. As páginas de hoje saem do ar e ficam
              guardadas como rascunho; o menu, o rodapé, as cores e as letras passam a ser os do
              modelo. Antes de trocar, você vê o modelo e confirma.
            </p>
            <div>
              <Link className="gp-btn" href={panelHref(adminRoute, 'start')}>
                Ver os modelos
              </Link>
            </div>
          </section>
        )}
      </div>

      <p className="gp-tip">
        <PanelIcon name="help" size={16} />
        <span>
          O menu e o rodapé ficam em{' '}
          <Link className="gp-link" href={panelHref(adminRoute, 'menu')}>
            Menu e rodapé
          </Link>
          .
        </span>
      </p>

      {choosing && (
        <PhotoChooser
          onClose={() => setChoosing(null)}
          onPick={(picked) => {
            setPhotos((current) =>
              current.some((item) => item.id === picked.id) ? current : [picked, ...current],
            )
            update({ [choosing]: picked.id })
            setChoosing(null)
          }}
          photos={photos}
          title={choosing === 'logo' ? 'Escolha o logo' : 'Escolha a foto ao compartilhar'}
        />
      )}
    </div>
  )
}
