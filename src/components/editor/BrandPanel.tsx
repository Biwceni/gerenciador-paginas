'use client'

import React, { useEffect, useId, useMemo, useRef, useState } from 'react'

import { fontStack, googleFontsURL } from '@/components/panel/fontSamples'
import { readLogoColors } from '@/components/panel/logoColors'
import type { SiteLook } from '@/components/panel/settings'
import {
  type BrandCombo,
  brandCombos,
  brandPalette,
  currentCombo,
  type LogoColor,
  pickMainColor,
} from '@/lib/brand'
import { type Business, FONT_PAIRS } from '@/lib/fontPairs'
import type { SiteColors } from '@/lib/style-presets'
import { PERSONALITIES, PERSONALITY_LABELS } from '@/lib/theme'

import { PanelIcon } from '@/components/panel/PanelIcon'

type Props = {
  look: SiteLook
  onChange: (look: SiteLook) => void
  /** Sua marca tem mudança guardada que ainda não está no ar. */
  pending: boolean
  logoURL: string | null
  business: Business
  siteName: string
  /** A tela Sua marca completa, no painel. */
  brandHref: string
  onClose: () => void
}

/** Sem logo (ou sem dar para ler as cores dele): as combinações saem das cores de hoje. */
function paletteFromColors(colors: SiteColors) {
  return brandPalette(colors.primary, [
    { color: colors.text, share: 1 },
    { color: colors.footer, share: 1 },
  ])
}

/**
 * As combinações do logo. A cor principal pode ter sido trocada em Sua marca (tocando noutra cor do
 * logo): se as cores de hoje batem com a combinação de alguma cor do logo, vale ela.
 */
export function combosFor(colors: SiteColors, logoColors: LogoColor[] | null): BrandCombo[] {
  if (!logoColors?.length) return brandCombos(paletteFromColors(colors))
  const main = pickMainColor(logoColors) ?? logoColors[0].color
  const first = brandCombos(brandPalette(main, logoColors))
  if (currentCombo(colors, first)) return first
  for (const { color } of logoColors) {
    const combos = brandCombos(brandPalette(color, logoColors))
    if (currentCombo(colors, combos)) return combos
  }
  return first
}

/**
 * Sua marca dentro do editor (E8): a mesma Sua marca do painel, em versão curta. Personalidade,
 * cores tiradas do logo e letras, com um toque cada. Logo, cor exata e outras letras ficam na tela
 * completa. Não é uma janela que tranca a página: a prévia muda ao lado, na hora.
 */
export function BrandPanel({
  look,
  onChange,
  pending,
  logoURL,
  business,
  siteName,
  brandHref,
  onClose,
}: Props) {
  const titleId = useId()
  const ref = useRef<HTMLElement>(null)
  // Como estava ao abrir: fica na lista para dar para voltar, mesmo sem ser uma das sugestões.
  const [opening] = useState(look)
  const [logoColors, setLogoColors] = useState<LogoColor[] | null | 'loading'>(
    logoURL ? 'loading' : null,
  )

  useEffect(() => {
    if (!logoURL) return
    let alive = true
    void readLogoColors(logoURL).then((colors) => {
      if (alive) setLogoColors(colors?.length ? colors : null)
    })
    return () => {
      alive = false
    }
  }, [logoURL])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      // Uma janela por cima (a de publicar) fecha primeiro.
      if (event.key === 'Escape' && !document.querySelector('.ed-overlay')) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (previous?.isConnected) previous.focus()
    }
  }, [onClose])

  const combos = useMemo(
    () => combosFor(opening.colors, logoColors === 'loading' ? null : logoColors),
    [opening.colors, logoColors],
  )
  const activeCombo = currentCombo(look.colors, combos)
  const openingIsCombo = currentCombo(opening.colors, combos) !== null

  const pairs = FONT_PAIRS[business]
  const samePair = (fonts: SiteLook['fonts'], pair: SiteLook['fonts']) =>
    fonts.headings.trim() === pair.headings && fonts.body.trim() === pair.body
  const openingIsPair = pairs.some((pair) => samePair(opening.fonts, pair))
  const name = siteName.trim() || 'Meu site'
  const sample = 'Texto do site'
  const families = [
    ...pairs.flatMap((pair) => [pair.headings, pair.body]),
    ...(openingIsPair ? [] : [opening.fonts.headings, opening.fonts.body]),
  ].filter(Boolean)
  const headingFont = fontStack(look.fonts.headings || look.fonts.body || 'system-ui')

  const colorItem = (key: string, label: string, note: string, colors: SiteColors) => {
    const pressed =
      key === 'opening' ? !activeCombo && sameColors(look.colors, colors) : activeCombo === key
    return (
      <button
        aria-pressed={pressed}
        className="ed-brandpanel__option ed-brandpanel__option--color"
        key={key}
        onClick={() => onChange({ ...look, colors })}
        type="button"
      >
        <span
          aria-hidden="true"
          className="ed-brandpanel__swatch"
          style={{ background: colors.background, color: colors.text }}
        >
          <b style={{ fontFamily: headingFont }}>Aa</b>
          <i style={{ background: colors.primary }} />
          <i style={{ background: colors.footer }} />
        </span>
        <span className="ed-brandpanel__text">
          <b>{label}</b>
          <span>{note}</span>
        </span>
      </button>
    )
  }

  return (
    <aside
      aria-labelledby={titleId}
      className="ed-brandpanel"
      ref={ref}
      role="dialog"
      tabIndex={-1}
    >
      {families.length > 0 && (
        <link
          href={googleFontsURL(families, `${name}${sample}`)}
          precedence="default"
          rel="stylesheet"
        />
      )}
      <div className="ed-brandpanel__head">
        <h2 id={titleId}>Sua marca</h2>
        <button
          aria-label="Fechar Sua marca"
          className="ed-icon-btn"
          onClick={onClose}
          title="Fechar"
          type="button"
        >
          ×
        </button>
      </div>
      <div className="ed-brandpanel__body">
        <p className="ed-brandpanel__same">
          É a mesma Sua marca do painel. <b>Vale para todas as páginas do site.</b>
        </p>
        <p
          className={`ed-brandpanel__state${pending ? ' ed-brandpanel__state--draft' : ''}`}
          role="status"
        >
          {pending ? 'Em rascunho: o site muda quando você publicar.' : 'Igual ao que está no ar.'}
        </p>

        <section aria-labelledby={`${titleId}-p`} className="ed-brandpanel__group">
          <h3 id={`${titleId}-p`}>Visual</h3>
          <div aria-labelledby={`${titleId}-p`} className="ed-brandpanel__list" role="group">
            {PERSONALITIES.map((personality) => (
              <button
                aria-pressed={look.personality === personality}
                className="ed-brandpanel__option"
                key={personality}
                onClick={() => onChange({ ...look, personality })}
                type="button"
              >
                <span className="ed-brandpanel__text">
                  <b>{PERSONALITY_LABELS[personality].name}</b>
                  <span>{PERSONALITY_LABELS[personality].description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby={`${titleId}-c`} className="ed-brandpanel__group">
          <h3 id={`${titleId}-c`}>{logoURL ? 'Cores do logo' : 'Cores'}</h3>
          <p className="ed-hint">
            {logoColors === 'loading'
              ? 'Lendo as cores do logo…'
              : logoColors
                ? 'Combinações tiradas do logo, todas fáceis de ler.'
                : logoURL
                  ? 'Não deu para ler as cores do logo: as combinações saem das cores de hoje.'
                  : 'Sem logo: as combinações saem das cores de hoje.'}
          </p>
          <div aria-labelledby={`${titleId}-c`} className="ed-brandpanel__list" role="group">
            {!openingIsCombo &&
              colorItem('opening', 'Como estava', 'As cores de quando você abriu', opening.colors)}
            {combos.map((combo) => colorItem(combo.key, combo.name, combo.note, combo.colors))}
          </div>
        </section>

        <section aria-labelledby={`${titleId}-f`} className="ed-brandpanel__group">
          <h3 id={`${titleId}-f`}>Letras</h3>
          <p className="ed-hint">A primeira é a dos títulos; a segunda, a dos textos.</p>
          <div aria-labelledby={`${titleId}-f`} className="ed-brandpanel__list" role="group">
            {[
              ...(openingIsPair
                ? []
                : [
                    {
                      name: 'Como estava',
                      headings: opening.fonts.headings,
                      body: opening.fonts.body,
                    },
                  ]),
              ...pairs,
            ].map((pair) => (
              <button
                aria-pressed={samePair(look.fonts, pair)}
                className="ed-brandpanel__option"
                key={`${pair.name}-${pair.headings}-${pair.body}`}
                onClick={() =>
                  onChange({ ...look, fonts: { headings: pair.headings, body: pair.body } })
                }
                type="button"
              >
                <span className="ed-brandpanel__text">
                  <b
                    className="ed-brandpanel__font"
                    style={{ fontFamily: fontStack(pair.headings || pair.body || 'system-ui') }}
                  >
                    {name}
                  </b>
                  <span style={{ fontFamily: fontStack(pair.body || 'system-ui') }}>{sample}</span>
                  <span>
                    {pair.name} · {fontNames(pair)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="ed-brandpanel__more">
          <a className="ed-btn" href={brandHref} rel="noopener" target="_blank">
            <PanelIcon name="sliders" size={16} /> Abrir Sua marca completa
          </a>
          <p className="ed-hint">Logo, cor exata e outras letras. Abre em outra aba.</p>
        </div>
      </div>
    </aside>
  )
}

function sameColors(a: SiteColors, b: SiteColors) {
  return (Object.keys(b) as (keyof SiteColors)[]).every(
    (key) => a[key]?.toLowerCase() === b[key]?.toLowerCase(),
  )
}

function fontNames(fonts: SiteLook['fonts']) {
  const headings = fonts.headings.trim()
  const body = fonts.body.trim()
  if (!headings && !body) return 'letras do sistema'
  if (!headings || headings === body) return headings || body
  return `${headings} e ${body || 'letra do sistema'}`
}

/** As bolinhas de cor do botão "Sua marca" no topo: principal, fundo e texto. */
export function BrandDots({ colors }: { colors: SiteColors }) {
  return (
    <span aria-hidden="true" className="ed-brandbtn__dots">
      <i style={{ background: colors.primary }} />
      <i style={{ background: colors.background }} />
      <i style={{ background: colors.text }} />
    </span>
  )
}
