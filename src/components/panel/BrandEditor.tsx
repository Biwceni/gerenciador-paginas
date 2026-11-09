'use client'

import '@/app/(frontend)/styles.css'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import { Render } from '@puckeditor/core'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { thumbnailURL } from '@/components/editor/context'
import {
  type FooterSocial,
  type MenuItem,
  siteBrand,
  SiteFooterView,
  SiteHeaderView,
} from '@/components/site/SiteChrome'
import { themeStyle } from '@/components/site/theme'
import {
  brandCombos,
  brandPalette,
  type BrandPalette,
  currentCombo,
  type LogoColor,
  pickMainColor,
} from '@/lib/brand'
import { HEX_COLOR_PATTERN } from '@/lib/colors'
import { type Business, businessLabel, FONT_PAIRS } from '@/lib/fontPairs'
import type { FormDefinition } from '@/lib/forms'
import { whatsAppURL } from '@/lib/links'
import { MOTION_LABELS, MOTIONS } from '@/lib/motion'
import {
  COLOR_FIELDS,
  COLOR_PRESETS,
  contrastChecks,
  FONT_PRESETS,
  FONT_SUGGESTIONS,
  formatRatio,
  normalizeFontName,
  type SiteColors,
} from '@/lib/style-presets'
import { FONT_NAME_PATTERN } from '@/lib/theme'
import type { Media, Site } from '@/payload-types'
import { renderConfig } from '@/puck/config'
import {
  collectReferences,
  type ContentMetadata,
  mainHeadingID,
  type SiteInfo,
} from '@/puck/references'
import type { PuckPageData } from '@/puck/schema'

import { fontStack, googleFontsURL, useFontSample } from './fontSamples'
import { readLogoColors } from './logoColors'
import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'
import { PersonalityPicker } from './PersonalityPicker'
import { PhotoChooser } from './PhotoChooser'
import { SaveStatus } from './SaveStatus'
import type { SettingsState } from './settings'
import { SiteFrame } from './SiteFrame'
import { useSettingsDraft } from './useSettingsDraft'
import { WhyDisabled } from './WhyDisabled'

/** A página inicial no rascunho, para a prévia mostrar o site de verdade. */
export type BrandHome = {
  id: number
  data: PuckPageData
  campaign: boolean
  forms: Record<number, FormDefinition>
  info: SiteInfo
  whatsappHref: string | null
}

/** Topo e rodapé como estão no rascunho (o menu muda em Menu e rodapé, não aqui). */
type Chrome = {
  items: MenuItem[]
  button: { label: string; href: string } | null
  footerMenu: MenuItem[]
  footerText: string | null
  showContact: boolean
  social: FooterSocial[]
  privacyHref: string | null
}

type Props = {
  apiRoute: string
  business: Business
  chrome: Chrome
  fontFaces: string | null
  home: BrandHome | null
  initial: SettingsState
  pending: boolean
  photos: Media[]
}

type FontRole = 'headings' | 'body'
type Reading = 'idle' | 'reading' | 'failed'

const googleFontCSS = (name: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}&display=swap`

/** Amostra embaixo do campo de fonte, assim que o Google acha a fonte digitada. */
function FontSampleLine({ name, text }: { name: string; text: string }) {
  const sample = useFontSample(name)
  if (sample !== 'found') return null
  return (
    <span className="gp-fontsample" style={{ fontFamily: fontStack(normalizeFontName(name)) }}>
      {text}
    </span>
  )
}

/** Sem logo (ou sem ler as cores dele): as combinações saem das cores de hoje. */
function paletteFromColors(colors: SiteColors): BrandPalette {
  return brandPalette(colors.primary, [
    { color: colors.text, share: 1 },
    { color: colors.footer, share: 1 },
  ])
}

export function BrandEditor({
  apiRoute,
  business,
  chrome,
  fontFaces,
  home,
  initial,
  pending: initialPending,
  photos: initialPhotos,
}: Props) {
  const [fontError, setFontError] = useState<Partial<Record<FontRole, string>>>({})
  const [fontText, setFontText] = useState(initial.fonts)
  const [hexText, setHexText] = useState<SiteColors>(initial.colors)

  const draft = useSettingsDraft({
    apiRoute,
    initial,
    initialPending,
    publishedText: 'Sua marca foi publicada em todo o site.',
    // Fonte que o Google não tem: volta para a anterior e mostra o erro no campo.
    recover: (text, tried, from) => {
      const role = (['headings', 'body'] as const).find(
        (key) => tried.fonts[key] !== from.fonts[key],
      )
      if (!role || !text.includes('Google Fonts')) return null
      setFontError({ [role]: text })
      setFontText((current) => ({ ...current, [role]: from.fonts[role] }))
      return { fonts: { ...tried.fonts, [role]: from.fonts[role] } }
    },
    onReset: (next) => {
      setFontText(next.fonts)
      setHexText(next.colors)
      setFontError({})
    },
    onSaved: () => setFontError({}),
  })
  const { state, update, save, busy, pending, message } = draft

  const [photos, setPhotos] = useState(initialPhotos)
  const [choosing, setChoosing] = useState(false)
  // Resultado da leitura, guardado com o endereço do logo lido: trocar o logo invalida o anterior.
  const [read, setRead] = useState<{ url: string; colors: LogoColor[] | null } | null>(null)
  const [main, setMain] = useState<string | null>(null)
  // A base das combinações fica parada enquanto a pessoa escolhe: aplicar uma combinação muda a cor
  // principal, e as combinações não podem mudar junto.
  const [palette, setPalette] = useState<BrandPalette>(() => paletteFromColors(initial.colors))
  const [manual, setManual] = useState(false)
  const [fullPreview, setFullPreview] = useState(false)
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')

  const logo = photos.find((item) => item.id === state.logo) ?? null
  const logoURL = logo ? thumbnailURL(logo) : undefined

  // Cores de hoje, para a leitura (que termina depois) voltar a elas se o logo não der para ler.
  const colorsNow = useRef(state.colors)
  useEffect(() => {
    colorsNow.current = state.colors
  }, [state.colors])

  /**
   * Sem as cores de um logo (tirado, ou sem dar para ler): as combinações voltam a sair das cores de
   * hoje, e nenhuma cor do logo antigo fica marcada como principal.
   */
  const forgetLogoColors = (colors: SiteColors) => {
    setMain(null)
    setPalette(paletteFromColors(colors))
  }

  // As cores do logo são lidas aqui, no navegador, sempre que o logo muda.
  useEffect(() => {
    if (!logoURL) return
    let active = true
    readLogoColors(logoURL).then((colors) => {
      if (!active) return
      const chosen = colors?.length ? pickMainColor(colors) : null
      setRead({ url: logoURL, colors: chosen ? colors : null })
      if (colors && chosen) {
        setMain(chosen)
        setPalette(brandPalette(chosen, colors))
      } else {
        setMain(null)
        setPalette(paletteFromColors(colorsNow.current))
      }
    })
    return () => {
      active = false
    }
  }, [logoURL])
  const current = logoURL && read?.url === logoURL ? read : null
  const removeLogo = () => {
    update({ logo: null })
    forgetLogoColors(state.colors)
  }
  const logoColors = current?.colors ?? null
  const reading: Reading = !logoURL
    ? 'idle'
    : !current
      ? 'reading'
      : current.colors
        ? 'idle'
        : 'failed'

  const combos = useMemo(() => brandCombos(palette), [palette])
  const activeCombo = currentCombo(state.colors, combos)

  const applyColors = (colors: SiteColors) => {
    setHexText(colors)
    update({ colors })
  }
  const setColor = (key: keyof SiteColors, value: string) => {
    setHexText((current) => ({ ...current, [key]: value }))
    if (HEX_COLOR_PATTERN.test(value)) {
      update({ colors: { ...state.colors, [key]: value.toLowerCase() } })
    }
  }

  /** Tocar numa cor do logo: ela vira a principal e a combinação em uso acompanha. */
  const chooseMain = (color: string) => {
    if (!logoColors) return
    const next = brandPalette(color, logoColors)
    setMain(color)
    setPalette(next)
    if (activeCombo) {
      const combo = brandCombos(next).find((item) => item.key === activeCombo)
      if (combo) applyColors(combo.colors)
    }
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

  const siteName = state.name.trim() || 'Meu site'
  const sampleText = state.tagline.trim() || 'Venha conhecer o nosso trabalho'
  const headingFont = fontStack(state.fonts.headings || state.fonts.body || 'system-ui')
  const pairs = FONT_PAIRS[business]
  const pairsFor = businessLabel(business)
  // Só as fontes das sugestões, e só as letras que aparecem nelas.
  const sampleFontsURL = googleFontsURL(
    [
      ...pairs.flatMap((pair) => [pair.headings, pair.body]),
      ...FONT_PRESETS.flatMap((p) => [p.headings, p.body]),
    ],
    `Aa${siteName}${sampleText}${FONT_PRESETS.map((preset) => preset.name).join('')}`,
  )
  const previewFonts = [...new Set([state.fonts.headings, state.fonts.body].filter(Boolean))]
  const theme = themeStyle({
    colors: state.colors,
    fonts: state.fonts,
    personality: state.personality,
  } as Partial<Site>) as Record<string, string>
  const checks = contrastChecks(state.colors)
  const failing = checks.filter((check) => check.ratio < 4.5)

  const preview = (
    <BrandPreview chrome={chrome} home={home} logo={logo} photos={photos} state={state} />
  )

  return (
    <div className="gp-page" role="main">
      <header className="gp-pagehead">
        <div>
          <h1>Sua marca</h1>
          <p>
            O site inteiro sai daqui: logo, cores, letras e o jeito das seções. O conteúdo das
            páginas não muda. Suas mudanças ficam guardadas e vão ao ar quando você publicar.
          </p>
        </div>
        <SaveStatus
          blocked={save === 'invalid' ? 'Corrija o nome do negócio em Configurações' : null}
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
        <nav aria-label="Blocos desta tela" className="gp-toc">
          <a href="#mc-cores">Logo e cores</a>
          <a href="#mc-letras">Letras</a>
          <a href="#mc-jeito">Jeito do site</a>
          <a href="#mc-animacao">Animação</a>
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
              aria-describedby={draft.cantPublish ? 'mc-why' : undefined}
              className="gp-btn gp-btn--primary"
              disabled={busy || Boolean(draft.cantPublish)}
              onClick={draft.publish}
              type="button"
            >
              {busy ? 'Aguarde…' : 'Publicar'}
            </button>
            <WhyDisabled id="mc-why" reason={draft.cantPublish} />
          </div>
        </div>
      </div>

      {message && (
        <p className={message.tone === 'ok' ? 'gp-notice' : 'gp-error'} role="status">
          {message.text}
        </p>
      )}

      {/* Só as fontes das sugestões e dos atalhos, e só as letras que aparecem neles. */}
      <link href={sampleFontsURL} precedence="default" rel="stylesheet" />
      {state.fonts.headings && FONT_NAME_PATTERN.test(state.fonts.headings) && (
        <link href={googleFontCSS(state.fonts.headings)} precedence="default" rel="stylesheet" />
      )}

      <div className="gp-brand" inert={busy}>
        <div className="gp-brand__controls">
          <section className="gp-card" id="mc-cores">
            <h2>Logo e cores</h2>
            <div className="gp-logopick">
              {logo ? (
                <img alt="Logo" className="gp-thumb gp-thumb--logo" src={logoURL} />
              ) : (
                <span aria-hidden="true" className="gp-thumb gp-thumb--empty">
                  <PanelIcon name="image" />
                </span>
              )}
              <div className="gp-stack">
                <button
                  className="gp-btn gp-btn--sm"
                  onClick={() => setChoosing(true)}
                  type="button"
                >
                  <PanelIcon name="upload" size={14} />
                  {logo ? 'Trocar o logo' : 'Enviar o logo'}
                </button>
                {logo && (
                  <button
                    className="gp-btn gp-btn--sm gp-btn--ghost"
                    onClick={removeLogo}
                    type="button"
                  >
                    Tirar o logo
                  </button>
                )}
                <span className="gp-small gp-muted">
                  {logo
                    ? 'As cores são lidas do logo aqui no seu computador. O logo não vai para nenhum outro lugar.'
                    : 'Mande o logo: as cores do site saem dele. Sem logo, o topo do site mostra só o nome.'}
                </span>
              </div>
            </div>

            <div aria-live="polite">
              {reading === 'reading' && (
                <p className="gp-small gp-muted">Lendo as cores do logo…</p>
              )}
              {reading === 'failed' && (
                <p className="gp-small gp-muted">
                  Não deu para ler as cores deste logo. Escolha uma combinação abaixo ou ajuste as
                  cores à mão.
                </p>
              )}
            </div>

            {logoColors && (
              <div className="gp-field">
                <span className="gp-label" id="mc-logo-colors">
                  Cores encontradas no logo. Toque numa para ela ser a principal.
                </span>
                <div aria-labelledby="mc-logo-colors" className="gp-logocolors" role="group">
                  {logoColors.slice(0, 8).map((item) => (
                    <button
                      aria-label={`Usar ${item.color} como cor principal`}
                      aria-pressed={main === item.color}
                      className="gp-logocolor"
                      key={item.color}
                      onClick={() => chooseMain(item.color)}
                      style={{ background: item.color }}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="gp-field">
              <span className="gp-label" id="mc-combos">
                Combinações prontas, todas fáceis de ler
              </span>
              <div aria-labelledby="mc-combos" className="gp-combos" role="group">
                {combos.map((combo) => (
                  <button
                    aria-pressed={activeCombo === combo.key}
                    className="gp-combo"
                    key={combo.key}
                    onClick={() => applyColors(combo.colors)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="gp-combo__pv"
                      style={{ background: combo.colors.background, color: combo.colors.text }}
                    >
                      <b style={{ fontFamily: headingFont }}>{siteName}</b>
                      <i style={{ background: combo.colors.primary }} />
                    </span>
                    <span className="gp-combo__text">
                      <b>{combo.name}</b>
                      <span className="gp-small gp-muted">
                        {combo.note} · texto {formatRatio(combo.ratio)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              aria-controls="mc-manual"
              aria-expanded={manual}
              className="gp-btn gp-btn--sm gp-btn--ghost gp-brand__toggle"
              onClick={() => setManual((open) => !open)}
              type="button"
            >
              <PanelIcon name={manual ? 'up' : 'sliders'} size={14} />
              {manual ? 'Fechar o ajuste à mão' : 'Ajustar cores à mão'}
            </button>

            {manual && (
              <div className="gp-brand__manual" id="mc-manual">
                <div className="gp-field">
                  <span className="gp-label">Outros pontos de partida</span>
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
                    Clique no quadrado para escolher qualquer cor, ou digite o código (ex.:
                    #6b3f24).
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
                          <label htmlFor={`mc-hex-${key}`}>
                            <b>{label}</b>
                          </label>
                          <span className="gp-hint">{hint}</span>
                        </div>
                        <input
                          aria-invalid={!HEX_COLOR_PATTERN.test(hexText[key])}
                          className="gp-input gp-input--hex"
                          id={`mc-hex-${key}`}
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
                    {failing.map((warning) => (
                      <p className="gp-contrast__line gp-contrast__line--warn" key={warning.label}>
                        <b>{warning.label}: difícil de ler</b> (contraste{' '}
                        {formatRatio(warning.ratio)}). {warning.hint} Você pode manter assim, é só
                        um aviso.
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="gp-card" id="mc-letras">
            <div>
              <h2>Letras</h2>
              <p className="gp-small gp-muted">
                {pairsFor
                  ? `Sugestões que combinam com ${pairsFor}.`
                  : 'Sugestões de letras que combinam entre si.'}{' '}
                A primeira letra é a dos títulos; a segunda, a dos textos.
              </p>
            </div>
            <div aria-label="Sugestões de letras" className="gp-pairs" role="group">
              {pairs.map((pair) => (
                <button
                  aria-pressed={
                    state.fonts.headings === pair.headings && state.fonts.body === pair.body
                  }
                  className="gp-pair"
                  key={`${pair.headings}-${pair.body}`}
                  onClick={() => applyFonts({ headings: pair.headings, body: pair.body })}
                  type="button"
                >
                  <span className="gp-pair__title" style={{ fontFamily: fontStack(pair.headings) }}>
                    {siteName}
                  </span>
                  <span className="gp-pair__text" style={{ fontFamily: fontStack(pair.body) }}>
                    {sampleText}
                  </span>
                  <span className="gp-small gp-muted">
                    <b>{pair.name}</b> · {pair.headings} e {pair.body}
                  </span>
                </button>
              ))}
            </div>

            <details className="gp-disclosure">
              <summary>
                Escolher outras letras
                <span aria-hidden="true" className="gp-disclosure__icon">
                  <PanelIcon name="back" size={16} />
                </span>
              </summary>
              <div className="gp-disclosure__body">
                <span className="gp-hint">
                  Use qualquer fonte do Google Fonts: escolha um atalho ou digite o nome.
                </span>
                <div aria-label="Combinações de letras" className="gp-fontpresets" role="group">
                  {FONT_PRESETS.map((preset) => (
                    <button
                      aria-pressed={
                        state.fonts.headings === preset.headings && state.fonts.body === preset.body
                      }
                      className="gp-fontpreset"
                      key={preset.name}
                      onClick={() => applyFonts({ headings: preset.headings, body: preset.body })}
                      title={`${preset.headings} e ${preset.body}`}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className="gp-fontpreset__aa"
                        style={{ fontFamily: fontStack(preset.headings) }}
                      >
                        Aa
                      </span>
                      <span style={{ fontFamily: fontStack(preset.body) }}>{preset.name}</span>
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
                      <label htmlFor={`mc-font-${role}`}>{label}</label>
                      <input
                        aria-invalid={Boolean(fontError[role])}
                        autoComplete="off"
                        className="gp-input"
                        id={`mc-font-${role}`}
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
                      {fontError[role] ? (
                        <span className="gp-hint gp-hint--error">{fontError[role]}</span>
                      ) : (
                        <FontSampleLine name={fontText[role]} text={sampleText} />
                      )}
                    </div>
                  ))}
                </div>
                <datalist id="gp-font-list">
                  {FONT_SUGGESTIONS.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
            </details>
            <span className="gp-hint">
              Ao publicar, a fonte é copiada do Google para o seu site: os visitantes não acessam o
              Google.
            </span>
          </section>

          <section className="gp-card" id="mc-jeito">
            <PersonalityPicker
              colors={state.colors}
              onChange={(personality) => update({ personality })}
              value={state.personality}
            />
          </section>

          <section className="gp-card" id="mc-animacao">
            <fieldset className="gp-choices gp-choices--stack gp-field">
              <legend className="gp-label">Animação do site</legend>
              <span className="gp-hint">
                Vale para todas as seções que estão em “Igual ao site”. No editor, cada seção pode
                ter a sua própria animação ou ficar sem. Quem pediu ao celular para reduzir
                movimentos vê só um esmaecer.
              </span>
              <div className="gp-choices__list">
                {MOTIONS.map((motion) => (
                  <label className="gp-choice" key={motion}>
                    <input
                      checked={state.motion === motion}
                      name="mc-motion"
                      onChange={() => update({ motion })}
                      type="radio"
                      value={motion}
                    />
                    <span>
                      <b>{MOTION_LABELS[motion].name}</b>
                      <span className="gp-hint">{MOTION_LABELS[motion].description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
        </div>

        <div className="gp-brand__side">
          <section className="gp-card gp-brandpreview">
            <div className="gp-previewbox__cap">
              <span className="gp-label">
                {home ? 'Prévia da página inicial' : 'Prévia do seu site'}
              </span>
              <div className="gp-seg" role="group" aria-label="Tamanho da prévia">
                <button
                  aria-pressed={device === 'desktop'}
                  onClick={() => setDevice('desktop')}
                  type="button"
                >
                  Computador
                </button>
                <button
                  aria-pressed={device === 'phone'}
                  onClick={() => setDevice('phone')}
                  type="button"
                >
                  Celular
                </button>
              </div>
            </div>
            <div
              className={`gp-brandpreview__frame${device === 'phone' ? ' gp-brandpreview__frame--phone' : ''}`}
            >
              <SiteFrame
                fontFaces={fontFaces}
                stylesheets={previewFonts.map(googleFontCSS)}
                theme={theme}
                title="Prévia da sua marca"
                width={device === 'phone' ? 390 : 1280}
              >
                {preview}
              </SiteFrame>
            </div>
            <button
              className="gp-btn gp-btn--sm"
              onClick={() => setFullPreview(true)}
              type="button"
            >
              <PanelIcon name="eye" size={14} />
              Ver em tamanho real
            </button>
          </section>

          <section aria-labelledby="mc-reading" className="gp-card">
            <h2 id="mc-reading">Leitura das cores</h2>
            <p className="gp-small gp-muted">
              Conferimos cada par de cores que o site usa. O mínimo para ler bem é 4,5:1.
            </p>
            <ul className="gp-readings">
              {checks.map((check) => {
                const ok = check.ratio >= 4.5
                return (
                  <li key={check.label}>
                    <span>{check.label}</span>
                    <span className="gp-readings__ratio">{formatRatio(check.ratio)}</span>
                    <span className={`gp-readings__mark gp-readings__mark--${ok ? 'ok' : 'bad'}`}>
                      <PanelIcon name={ok ? 'check' : 'x'} size={12} />
                      <span className="gp-sr">{ok ? 'Passa' : 'Difícil de ler'}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>

      {fullPreview && (
        <PanelDialog
          onClose={() => setFullPreview(false)}
          size="full"
          title="Prévia em tamanho real"
        >
          <div className="gp-previewbox__frame">
            <SiteFrame
              fontFaces={fontFaces}
              stylesheets={previewFonts.map(googleFontCSS)}
              theme={theme}
              title="Prévia da sua marca em tamanho real"
              width={1280}
            >
              {preview}
            </SiteFrame>
          </div>
        </PanelDialog>
      )}

      {choosing && (
        <PhotoChooser
          onClose={() => setChoosing(false)}
          onPick={(picked) => {
            update({ logo: picked.id })
            setChoosing(false)
          }}
          onUploaded={(uploaded) => setPhotos((current) => [uploaded, ...current])}
          photos={photos}
          title="Escolha o logo"
        />
      )}
    </div>
  )
}

/**
 * O site na prévia: a página inicial do rascunho, com o topo e o rodapé, nas cores e letras da tela.
 * Sem página inicial, um site de mentira com as partes que mudam (banner, títulos, faixas).
 */
function BrandPreview({
  chrome,
  home,
  logo,
  photos,
  state,
}: {
  chrome: Chrome
  home: BrandHome | null
  logo: Media | null
  photos: Media[]
  state: SettingsState
}) {
  const name = state.name.trim() || 'Meu site'
  const brand = siteBrand({ personality: state.personality, tagline: state.tagline })

  const metadata = useMemo<ContentMetadata | null>(() => {
    if (!home) return null
    const { pageIds } = collectReferences(home.data)
    return {
      photos: Object.fromEntries(photos.map((photo) => [photo.id, photo])),
      forms: home.forms,
      pageId: home.id,
      // Os links da prévia não levam a lugar nenhum, mas aparecem.
      pageHrefs: Object.fromEntries(pageIds.map((id) => [id, '/'])),
      pageAnchors: {},
      anchors: {},
      whatsappHref: home.whatsappHref,
      site: { ...home.info, name, logo, motion: state.motion },
      mainHeadingId: mainHeadingID(home.data),
    }
  }, [home, logo, name, photos, state.motion])

  return (
    <>
      <SiteHeaderView
        brand={brand}
        button={chrome.button}
        campaign={home?.campaign}
        items={chrome.items}
        logo={logo}
        name={name}
      />
      {home && metadata ? (
        <main>
          <Render config={renderConfig} data={home.data} metadata={metadata} />
        </main>
      ) : (
        <main>
          <section className="section section--soft hero hero--side">
            <div className="container hero__container">
              <div className="hero__inner">
                <h2 className="hero__title">
                  {state.tagline.split('.')[0] || 'Assim fica o seu site'}
                </h2>
                <p className="hero__text">
                  Assim ficam os textos do seu site, com as letras e as cores que você escolheu.
                </p>
                <span className="button">Conheça</span>
              </div>
              <div
                aria-hidden="true"
                className="hero__photo"
                style={{
                  background:
                    'linear-gradient(160deg, var(--color-primary), var(--color-deep) 85%)',
                }}
              />
            </div>
          </section>
          <section className="section section--light">
            <div className="container">
              <h2 className="section-title">Títulos das seções</h2>
              <p>Cada seção do site segue este jeito: tamanhos, espaços e cantos.</p>
            </div>
          </section>
          <section className="section section--brand" style={{ paddingBlock: 28 }}>
            <div className="container">
              <b>Faixa com a cor principal</b>
            </div>
          </section>
        </main>
      )}
      <SiteFooterView
        brand={brand}
        campaign={home?.campaign}
        contact={{
          whatsapp: state.contact.whatsapp || null,
          whatsappHref: whatsAppURL(state.contact.whatsapp),
          email: state.contact.email || null,
          address: state.contact.address || null,
          hours: state.contact.hours || null,
        }}
        logo={logo}
        menu={chrome.footerMenu}
        name={name}
        privacyHref={chrome.privacyHref}
        showContact={chrome.showContact}
        social={chrome.social}
        text={chrome.footerText}
      />
    </>
  )
}
