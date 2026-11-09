'use client'

import React from 'react'

import { blendColors, deepShade } from '@/lib/colors'
import type { SiteColors } from '@/lib/style-presets'
import { type Personality, PERSONALITIES, PERSONALITY_LABELS } from '@/lib/theme'

/**
 * Desenho simples de cada personalidade, nas cores escolhidas: o jeito do banner e das formas,
 * para comparar de longe (como no protótipo v3).
 */
export function PersonalityThumb({
  personality,
  colors,
}: {
  personality: Personality
  colors: SiteColors
}) {
  const { primary, background, surface, text } = colors
  const deep = deepShade(primary)
  const shapes: Record<Personality, React.ReactNode> = {
    classico: (
      <>
        <rect fill={background} height="72" width="120" />
        <rect fill={text} height="7" rx="2" width="52" x="10" y="16" />
        <rect fill={text} height="4" opacity=".5" rx="2" width="40" x="10" y="27" />
        <rect fill={primary} height="9" rx="4.5" width="22" x="10" y="37" />
        <rect fill={primary} height="40" opacity=".5" rx="6" width="40" x="70" y="12" />
        <rect fill={surface} height="10" rx="2" width="100" x="10" y="56" />
      </>
    ),
    vitrine: (
      <>
        <rect fill={deep} height="72" width="120" />
        <rect fill={blendColors(primary, deep, 0.5)} height="44" width="120" />
        <rect fill="#ffffff" height="10" width="66" x="10" y="20" />
        <rect fill="#ffffff" height="5" opacity=".6" width="40" x="10" y="33" />
        <rect fill={primary} height="7" width="120" y="44" />
        <rect fill={surface} height="17" width="30" x="10" y="55" />
        <rect fill={surface} height="12" width="30" x="45" y="60" />
        <rect fill={surface} height="17" width="30" x="80" y="55" />
      </>
    ),
    aconchego: (
      <>
        <rect fill={surface} height="72" width="120" />
        <rect fill={text} height="7" rx="3" width="50" x="10" y="22" />
        <rect fill={text} height="4" opacity=".5" rx="2" width="36" x="10" y="33" />
        <rect fill={primary} height="9" rx="4.5" width="26" x="10" y="42" />
        <path d="M74 64V30a18 18 0 0 1 36 0v34z" fill={primary} opacity=".65" />
      </>
    ),
    editorial: (
      <>
        <rect fill={background} height="72" width="120" />
        <rect fill={text} height="1" width="104" x="8" y="8" />
        <rect fill={text} height="12" width="64" x="8" y="16" />
        <rect fill={text} height="12" width="48" x="8" y="31" />
        <rect fill={text} height="3" opacity=".5" width="38" x="8" y="50" />
        <rect fill={primary} height="56" opacity=".7" width="32" x="80" y="16" />
      </>
    ),
  }
  return (
    <svg aria-hidden="true" className="gp-personality__thumb" viewBox="0 0 120 72">
      {shapes[personality]}
    </svg>
  )
}

/** "Jeito do site" (a personalidade), em Sua marca: uma miniatura por opção. */
export function PersonalityPicker({
  value,
  colors,
  onChange,
}: {
  value: Personality
  colors: SiteColors
  onChange: (value: Personality) => void
}) {
  return (
    <div className="gp-field">
      <span className="gp-label" id="st-personality">
        Jeito do site
      </span>
      <span className="gp-hint">
        A personalidade do site: muda formas, tamanhos e a arrumação do banner e das seções em todas
        as páginas. O texto e as fotos continuam os mesmos.
      </span>
      <div aria-labelledby="st-personality" className="gp-personality" role="group">
        {PERSONALITIES.map((personality) => (
          <button
            aria-pressed={value === personality}
            className="gp-personality__option"
            key={personality}
            onClick={() => onChange(personality)}
            type="button"
          >
            <PersonalityThumb colors={colors} personality={personality} />
            <span className="gp-personality__text">
              <b>{PERSONALITY_LABELS[personality].name}</b>
              <span>{PERSONALITY_LABELS[personality].description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
