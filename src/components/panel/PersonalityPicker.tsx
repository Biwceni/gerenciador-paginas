'use client'

import React, { useState } from 'react'

import { blendColors, deepShade, readableTextColor } from '@/lib/colors'
import type { SiteColors } from '@/lib/style-presets'
import { type Personality, PERSONALITIES, PERSONALITY_LABELS } from '@/lib/theme'

import { PanelDialog } from './PanelDialog'

/**
 * Desenho de cada visual nas cores escolhidas (F2): o alto da página (topo e banner) e um pedaço
 * dos cartões, que é onde os visuais mais diferem. Cantos, letras e o jeito do banner aparecem
 * mesmo pequenos.
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
  const onPrimary = readableTextColor(primary)
  // Topo comum: marca à esquerda e três links à direita.
  const top = (ink: string, y = 4) => (
    <>
      <rect
        fill={primary}
        height="5"
        rx={personality === 'papel' ? 0 : 1.5}
        width="16"
        x="8"
        y={y}
      />
      <g fill={ink} opacity=".55">
        <rect height="1.6" width="10" x="74" y={y + 1.7} />
        <rect height="1.6" width="10" x="88" y={y + 1.7} />
        <rect height="1.6" width="10" x="102" y={y + 1.7} />
      </g>
    </>
  )
  const shapes: Record<Personality, React.ReactNode> = {
    // Simples: tudo reto, fios finos, sem enfeite.
    papel: (
      <>
        <rect fill={background} height="72" width="120" />
        {top(text)}
        <rect fill={text} height=".6" opacity=".35" width="120" y="13" />
        <rect fill={text} height="6" width="58" x="8" y="19" />
        <rect fill={text} height="2.4" opacity=".5" width="44" x="8" y="28" />
        <rect fill={primary} height="6" width="22" x="8" y="33" />
        <rect
          fill={surface}
          height="24"
          stroke={text}
          strokeOpacity=".3"
          strokeWidth=".6"
          width="34"
          x="78"
          y="17"
        />
        <g fill={surface} stroke={text} strokeOpacity=".35" strokeWidth=".6">
          <rect height="22" width="30" x="8" y="46" />
          <rect height="22" width="30" x="45" y="46" />
          <rect height="22" width="30" x="82" y="46" />
        </g>
        <g fill={text} opacity=".5">
          <rect height="1.6" width="18" x="12" y="62" />
          <rect height="1.6" width="18" x="49" y="62" />
          <rect height="1.6" width="18" x="86" y="62" />
        </g>
      </>
    ),
    // Sóbrio: cantos arredondados, cores calmas, cartões cheios.
    classico: (
      <>
        <rect fill={background} height="72" width="120" />
        {top(text)}
        <rect fill={text} height="6" rx="2" width="52" x="8" y="19" />
        <rect fill={text} height="2.4" opacity=".5" rx="1.2" width="40" x="8" y="28" />
        <rect fill={primary} height="7" rx="3.5" width="22" x="8" y="33" />
        <rect
          fill={blendColors(primary, background, 0.55)}
          height="26"
          rx="5"
          width="36"
          x="76"
          y="16"
        />
        <g fill={surface}>
          <rect height="22" rx="4" width="30" x="8" y="46" />
          <rect height="22" rx="4" width="30" x="45" y="46" />
          <rect height="22" rx="4" width="30" x="82" y="46" />
        </g>
        <g fill={primary} opacity=".55">
          <rect height="9" rx="2" width="24" x="11" y="49" />
          <rect height="9" rx="2" width="24" x="48" y="49" />
          <rect height="9" rx="2" width="24" x="85" y="49" />
        </g>
      </>
    ),
    // Impacto: foto ocupando o alto, topo por cima dela, letras enormes.
    vitrine: (
      <>
        <rect fill={background} height="72" width="120" />
        <rect fill={deep} height="44" width="120" />
        <rect fill={blendColors(primary, deep, 0.45)} height="44" opacity=".8" width="62" x="58" />
        {top('#ffffff')}
        <rect fill="#ffffff" height="9" width="70" x="8" y="17" />
        <rect fill="#ffffff" height="9" width="48" x="8" y="28" />
        <rect fill={primary} height="5" width="20" x="8" y="39" />
        <rect fill={onPrimary} height="1.2" opacity=".7" width="12" x="12" y="40.9" />
        <g fill={surface}>
          <rect height="20" width="33" x="8" y="49" />
          <rect height="20" width="33" x="44" y="49" />
          <rect height="20" width="33" x="80" y="49" />
        </g>
        <g fill={text}>
          <rect height="3" width="20" x="11" y="62" />
          <rect height="3" width="20" x="47" y="62" />
          <rect height="3" width="20" x="83" y="62" />
        </g>
      </>
    ),
    // Acolhedor: formas redondas, botão em pílula e foto em arco.
    aconchego: (
      <>
        <rect fill={surface} height="72" width="120" />
        {top(text)}
        <rect fill={text} height="6" rx="3" width="48" x="8" y="19" />
        <rect fill={text} height="2.4" opacity=".5" rx="1.2" width="36" x="8" y="28" />
        <rect fill={primary} height="8" rx="4" width="26" x="8" y="33" />
        <path d="M78 44V27a14 14 0 0 1 28 0v17z" fill={primary} opacity=".65" />
        <g fill={background}>
          <rect height="20" rx="9" width="30" x="8" y="48" />
          <rect height="20" rx="9" width="30" x="45" y="48" />
          <rect height="20" rx="9" width="30" x="82" y="48" />
        </g>
        <g fill={primary} opacity=".5">
          <circle cx="23" cy="56" r="4" />
          <circle cx="60" cy="56" r="4" />
          <circle cx="97" cy="56" r="4" />
        </g>
      </>
    ),
    // Revista: títulos gigantes, fios e grade de revista.
    editorial: (
      <>
        <rect fill={background} height="72" width="120" />
        {top(text)}
        <rect fill={text} height=".8" width="104" x="8" y="13" />
        <rect fill={text} height="11" width="62" x="8" y="17" />
        <rect fill={text} height="11" width="44" x="8" y="30" />
        <rect fill={primary} height="25" opacity=".75" width="30" x="82" y="17" />
        <rect fill={text} height=".8" width="104" x="8" y="46" />
        <g fill={text}>
          <rect height="4" width="22" x="8" y="51" />
          <rect height="4" width="22" x="45" y="51" />
          <rect height="4" width="22" x="82" y="51" />
        </g>
        <g fill={text} opacity=".45">
          <rect height="1.4" width="30" x="8" y="59" />
          <rect height="1.4" width="26" x="8" y="63" />
          <rect height="1.4" width="30" x="45" y="59" />
          <rect height="1.4" width="26" x="45" y="63" />
          <rect height="1.4" width="30" x="82" y="59" />
          <rect height="1.4" width="26" x="82" y="63" />
        </g>
      </>
    ),
  }
  return (
    <svg aria-hidden="true" className="gp-personality__thumb" viewBox="0 0 120 72">
      {shapes[personality]}
    </svg>
  )
}

/**
 * "Visual do site", em Sua marca: uma miniatura por visual. O toque abre a prévia grande do próprio
 * site naquele visual, e só "Usar este visual" troca (F2).
 */
export function PersonalityPicker({
  value,
  colors,
  onChange,
  renderPreview,
  previewNote = 'É o seu site, com o seu nome, logo e páginas.',
}: {
  value: Personality
  colors: SiteColors
  onChange: (value: Personality) => void
  /** A frase da prévia grande, depois da descrição do visual. */
  previewNote?: string
  /** A prévia do site num visual (com o nome, o logo e as páginas da pessoa). */
  renderPreview?: (personality: Personality, device: 'desktop' | 'phone') => React.ReactNode
}) {
  const [looking, setLooking] = useState<Personality | null>(null)
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const open = (personality: Personality) => {
    if (!renderPreview) return onChange(personality)
    // Celular estreito: a prévia abre já no celular.
    setDevice(window.matchMedia('(max-width: 720px)').matches ? 'phone' : 'desktop')
    setLooking(personality)
  }
  const close = () => {
    const from = looking
    setLooking(null)
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-personality-option="${from}"]`)?.focus(),
    )
  }

  return (
    <div className="gp-field">
      <span className="gp-label" id="st-personality">
        Visual do site
      </span>
      <span className="gp-hint">
        Muda formas, tamanhos e a arrumação do banner e das seções em todas as páginas. O texto e as
        fotos continuam os mesmos, e dá para trocar de novo quando quiser.
      </span>
      <div aria-labelledby="st-personality" className="gp-personality" role="group">
        {PERSONALITIES.map((personality) => (
          <button
            aria-pressed={value === personality}
            className="gp-personality__option"
            data-personality-option={personality}
            key={personality}
            onClick={() => open(personality)}
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

      {looking && renderPreview && (
        <PanelDialog
          onClose={close}
          size="full"
          title={`Visual ${PERSONALITY_LABELS[looking].name}`}
        >
          <div className="gp-lookpreview">
            <div className="gp-lookpreview__bar">
              <p className="gp-lookpreview__text">
                {PERSONALITY_LABELS[looking].description}{' '}
                <span className="gp-muted">{previewNote}</span>
              </p>
              <div aria-label="Tamanho da prévia" className="gp-seg" role="group">
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
              <div className="gp-actions">
                <button className="gp-btn" onClick={close} type="button">
                  Voltar
                </button>
                <button
                  autoFocus
                  className="gp-btn gp-btn--primary"
                  onClick={() => {
                    onChange(looking)
                    close()
                  }}
                  type="button"
                >
                  {looking === value
                    ? `Continuar com ${PERSONALITY_LABELS[looking].name}`
                    : `Usar o visual ${PERSONALITY_LABELS[looking].name}`}
                </button>
              </div>
            </div>
            <div className="gp-previewbox__frame">{renderPreview(looking, device)}</div>
          </div>
        </PanelDialog>
      )}
    </div>
  )
}
