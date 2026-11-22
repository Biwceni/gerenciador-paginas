'use client'

// Miniaturas prontas do Storage (400 px): o otimizador de imagens do Next não ajuda no painel.
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from 'react'

import { thumbnailURL } from '@/components/editor/context'
import { readableTextColor } from '@/lib/colors'
import type { Media } from '@/payload-types'

import { cutOutBackground, solidBackground } from './logoColors'
import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'
import type { SettingsState } from './settings'
import { usePhotoUploads } from './usePhotoUploads'

type OnDark = SettingsState['logoOnDark']

type Props = {
  logo: Media
  light: Media | null
  state: SettingsState
  update: (next: Partial<SettingsState>) => void
  photos: Media[]
  /** Uma foto nova chegou à biblioteca (o logo sem fundo). */
  onUploaded: (photo: Media) => void
  /** Abre a escolha da versão clara. */
  onChooseLight: () => void
  /** O topo do site no celular, com o logo como vai ficar (A3). */
  headerPreview: React.ReactNode
}

/** Fundo escuro das amostras: o rodapé, se ele é escuro; senão, um quase preto. */
function darkSample(state: SettingsState): string {
  return readableTextColor(state.colors.footer) === '#ffffff' ? state.colors.footer : '#1d1b1a'
}

/**
 * O logo no topo e sobre fundo escuro (A3, E2): só o logo ou com o nome, a versão clara, a versão
 * branca e a placa branca, cada uma com a amostra de como fica, e tirar o fundo de uma cor só.
 */
export function LogoOptions({
  logo,
  light,
  state,
  update,
  photos,
  onUploaded,
  onChooseLight,
  headerPreview,
}: Props) {
  const logoURL = thumbnailURL(logo)
  const lightURL = light ? thumbnailURL(light) : undefined
  const dark = darkSample(state)

  // Fundo de uma cor só no logo: oferece tirar, com a prévia de antes e depois.
  const [solid, setSolid] = useState<{ url: string; color: string | null } | null>(null)
  useEffect(() => {
    if (!logoURL) return
    let active = true
    solidBackground(logoURL).then((color) => {
      if (active) setSolid({ url: logoURL, color })
    })
    return () => {
      active = false
    }
  }, [logoURL])
  const background = solid && solid.url === logoURL ? solid.color : null

  const options: { value: OnDark; label: string; hint: string }[] = [
    {
      value: 'white',
      label: 'Usar versão branca',
      hint: 'O desenho todo em branco. Bom para logo de uma cor.',
    },
    {
      value: 'plate',
      label: 'Placa branca atrás do logo',
      hint: 'O logo como é, sobre um retângulo branco.',
    },
    {
      value: 'auto',
      label: 'Deixar como está',
      hint: 'Ganha um contorno quando quase some no fundo.',
    },
  ]

  return (
    <div className="gp-logoopts">
      <div className="gp-field">
        <label className="gp-switch">
          <input
            checked={state.showNameWithLogo}
            onChange={(event) => update({ showNameWithLogo: event.target.checked })}
            type="checkbox"
          />
          Mostrar o nome ao lado do logo
        </label>
        <span className="gp-hint">
          {state.showNameWithLogo
            ? 'O topo mostra o logo e o nome. Desligue se o logo já tem o nome escrito.'
            : 'O topo mostra só o logo. Ligue se o logo não tem o nome escrito.'}
        </span>
      </div>

      <div className="gp-field">
        <span className="gp-label">Topo no celular</span>
        <div className="gp-logoopts__phone">{headerPreview}</div>
      </div>

      {background && (
        <CutOut
          background={background}
          logo={logo}
          logoURL={logoURL}
          onUsed={(photo) => {
            onUploaded(photo)
            update({ logo: photo.id })
          }}
          photos={photos}
        />
      )}

      <fieldset className="gp-field gp-logodark">
        <legend className="gp-label">Logo em fundo escuro</legend>
        <span className="gp-hint">
          No rodapé escuro, no topo escuro e no topo por cima da foto do banner.
        </span>

        <div className="gp-logodark__light">
          <span aria-hidden="true" className="gp-logodark__sample" style={{ background: dark }}>
            {lightURL ? <img alt="" src={lightURL} /> : <PanelIcon name="image" />}
          </span>
          <div className="gp-stack">
            <b>{light ? 'Versão clara enviada' : 'Enviar versão clara'}</b>
            <span className="gp-hint">
              {light
                ? 'Ela entra no lugar do logo em todo fundo escuro.'
                : 'O melhor jeito: o mesmo logo, feito para fundo escuro.'}
            </span>
            <div className="gp-actions">
              <button className="gp-btn gp-btn--sm" onClick={onChooseLight} type="button">
                <PanelIcon name="upload" size={14} />
                {light ? 'Trocar' : 'Enviar versão clara'}
              </button>
              {light && (
                <button
                  className="gp-btn gp-btn--sm gp-btn--ghost"
                  onClick={() => update({ logoLight: null })}
                  type="button"
                >
                  Tirar
                </button>
              )}
            </div>
          </div>
        </div>

        {!light && (
          <div className="gp-logodark__list">
            {options.map((option) => (
              <label className="gp-choice gp-logodark__choice" key={option.value}>
                <input
                  checked={state.logoOnDark === option.value}
                  name="mc-logo-dark"
                  onChange={() => update({ logoOnDark: option.value })}
                  type="radio"
                  value={option.value}
                />
                <span
                  aria-hidden="true"
                  className={`gp-logodark__sample gp-logodark__sample--${option.value}`}
                  style={{ background: dark }}
                >
                  <img alt="" src={logoURL} />
                </span>
                <span>
                  <b>{option.label}</b>
                  <span className="gp-hint">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <TabIcon logoURL={logoURL} name={state.name} background={state.colors.background} />
    </div>
  )
}

/** O ícone da aba do navegador, feito do logo (extra do E2): como vai aparecer. */
function TabIcon({
  logoURL,
  name,
  background,
}: {
  logoURL: string | undefined
  name: string
  background: string
}) {
  return (
    <div className="gp-field">
      <span className="gp-label">Ícone da aba do navegador</span>
      <div aria-hidden="true" className="gp-tabicon">
        <span className="gp-tabicon__icon" style={{ background }}>
          {logoURL && <img alt="" src={logoURL} />}
        </span>
        <span className="gp-tabicon__title">{name.trim() || 'Meu site'}</span>
      </div>
      <span className="gp-hint">
        Sai do logo, ao publicar. Logo largo fica pequeno na aba: um logo quadrado aparece melhor.
      </span>
    </div>
  )
}

/** Tirar o fundo de uma cor só (E2), com a prévia de antes e depois antes de usar. */
function CutOut({
  background,
  logo,
  logoURL,
  onUsed,
  photos,
}: {
  background: string
  logo: Media
  logoURL: string | undefined
  onUsed: (photo: Media) => void
  photos: Media[]
}) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{ blob: Blob; url: string } | null | 'failed'>(null)
  const [sending, setSending] = useState(false)
  const uploads = usePhotoUploads({
    library: photos,
    onUploaded: (photo) => {
      setSending(false)
      setOpen(false)
      onUsed(photo)
    },
    onFinished: ({ problems }) => {
      if (problems) setSending(false)
    },
  })
  const failedUpload = uploads.items.some((item) => item.state === 'failed')

  useEffect(() => {
    if (!open || !logoURL) return
    let active = true
    let made: string | null = null
    cutOutBackground(logoURL, background).then((blob) => {
      if (!active) return
      if (!blob) return setResult('failed')
      made = URL.createObjectURL(blob)
      setResult({ blob, url: made })
    })
    return () => {
      active = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [open, logoURL, background])

  const use = () => {
    if (!result || result === 'failed') return
    const base = (logo.filename ?? 'logo').replace(/\.[a-z0-9]+$/i, '')
    setSending(true)
    uploads.addFiles([new File([result.blob], `${base}-sem-fundo.png`, { type: 'image/png' })])
  }

  return (
    <div className="gp-field gp-cutout">
      <span className="gp-hint">
        Este logo tem um fundo de uma cor só. Sem ele, o logo fica bem em qualquer fundo do site.
      </span>
      <button className="gp-btn gp-btn--sm" onClick={() => setOpen(true)} type="button">
        Tirar o fundo do logo
      </button>
      {open && (
        <PanelDialog onClose={() => setOpen(false)} title="Tirar o fundo do logo">
          <div className="gp-stack">
            <div className="gp-cutout__compare">
              <figure>
                <span className="gp-cutout__box">
                  <img alt="Logo com o fundo" src={logoURL} />
                </span>
                <figcaption>Antes</figcaption>
              </figure>
              <figure>
                <span className="gp-cutout__box gp-cutout__box--clear">
                  {result && result !== 'failed' ? (
                    <img alt="Logo sem o fundo" src={result.url} />
                  ) : (
                    <span className="gp-small gp-muted">
                      {result === 'failed' ? 'Não deu para tirar o fundo.' : 'Tirando o fundo…'}
                    </span>
                  )}
                </span>
                <figcaption>Depois</figcaption>
              </figure>
            </div>
            <p className="gp-small gp-muted">
              O logo sem fundo entra na biblioteca como uma foto nova. O de antes continua lá.
            </p>
            {failedUpload && (
              <p className="gp-error" role="alert">
                Não deu para enviar o logo sem fundo. Confira a internet e tente de novo.
              </p>
            )}
            <div className="gp-actions gp-actions--end">
              <button className="gp-btn" onClick={() => setOpen(false)} type="button">
                Cancelar
              </button>
              <button
                className="gp-btn gp-btn--primary"
                disabled={!result || result === 'failed' || sending}
                onClick={use}
                type="button"
              >
                {sending ? 'Enviando…' : 'Usar o logo sem fundo'}
              </button>
            </div>
          </div>
        </PanelDialog>
      )}
    </div>
  )
}
