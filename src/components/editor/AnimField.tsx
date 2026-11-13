'use client'

import { toast } from '@payloadcms/ui'
import { createUsePuck } from '@puckeditor/core'
import React, { memo } from 'react'

import { panelHref } from '@/lib/panel'
import {
  type Anim,
  animLabel,
  type AnimatedSection,
  MOTION_LABELS,
  resolveAnim,
  safeMotion,
  type SectionAnim,
  sectionAnimValues,
} from '@/lib/motion'

import { announceChange } from './adjusted'
import { useEditor } from './context'
import { VisualChoiceField } from './VisualChoiceField'
import { previewDocument } from './insert'
import { MOBILE_WIDTH } from './puck'

const usePuck = createUsePuck()

/** Quanto tempo a classe `anim-play` fica na seção: o bastante para a animação mais longa. */
const PLAY_MS = 3000

/**
 * Miniatura de cada animação, nas cores do site: um desenho simples do que se mexe (como no
 * protótipo v3). `currentColor` é o texto do site; `--ed-site-primary`, a cor principal.
 */
function AnimThumbDrawing({ value }: { value: SectionAnim }) {
  const accent = 'var(--ed-site-primary, var(--ed-accent))'
  const arrow = (d: string) => (
    <path
      d={d}
      fill="none"
      stroke={accent}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    />
  )
  const shapes: Record<SectionAnim, React.ReactNode> = {
    site: (
      <>
        <rect fill="currentColor" height="6" opacity=".7" rx="2" width="80" x="10" y="12" />
        <rect fill="currentColor" height="4" opacity=".35" rx="2" width="60" x="10" y="24" />
        <rect fill={accent} height="10" opacity=".85" rx="5" width="28" x="10" y="36" />
      </>
    ),
    none: (
      <>
        <rect fill="currentColor" height="28" opacity=".15" rx="4" width="72" x="14" y="14" />
        <path d="M20 48L80 8" stroke="currentColor" strokeOpacity=".5" strokeWidth="2" />
      </>
    ),
    esmaecer: (
      <>
        <rect fill={accent} height="28" opacity=".22" rx="4" width="72" x="14" y="14" />
        <rect fill={accent} height="12" opacity=".5" rx="3" width="56" x="22" y="22" />
      </>
    ),
    cascata: (
      <>
        {[10, 38, 66].map((x, i) => (
          <rect
            fill={accent}
            height="22"
            key={x}
            opacity={0.35 + i * 0.25}
            rx="3"
            width="22"
            x={x}
            y={28 - i * 7}
          />
        ))}
        {arrow('M92 18v-8M88 14l4-4 4 4')}
      </>
    ),
    zoom: (
      <>
        <rect fill={accent} height="26" opacity=".6" rx="3" width="40" x="30" y="15" />
        <rect
          fill="none"
          height="40"
          rx="4"
          stroke={accent}
          strokeDasharray="3 3"
          strokeWidth="1.5"
          width="60"
          x="20"
          y="8"
        />
      </>
    ),
    deslizar: (
      <>
        <rect fill={accent} height="28" opacity=".6" rx="3" width="30" x="8" y="14" />
        <rect fill="currentColor" height="6" opacity=".7" rx="2" width="30" x="62" y="18" />
        <rect fill="currentColor" height="4" opacity=".35" rx="2" width="24" x="62" y="28" />
        {arrow('M44 28h12M52 24l4 4-4 4')}
      </>
    ),
    cortina: (
      <>
        <rect fill={accent} height="40" opacity=".22" rx="3" width="60" x="20" y="8" />
        <rect fill={accent} height="22" opacity=".75" rx="3" width="60" x="20" y="8" />
        {arrow('M50 34v8M46 38l4 4 4-4')}
      </>
    ),
    linhas: (
      <>
        <rect fill="currentColor" height="7" opacity=".75" rx="2" width="62" x="12" y="12" />
        <rect fill="currentColor" height="7" opacity=".5" rx="2" width="48" x="12" y="24" />
        <rect fill={accent} height="12" opacity=".35" rx="2" width="22" x="72" y="34" />
        {arrow('M84 24v-12M80 16l4-4 4 4')}
      </>
    ),
    sequencia: (
      <>
        {[8, 30, 52, 74].map((x, i) => (
          <rect
            fill={accent}
            height="18"
            key={x}
            opacity={0.9 - i * 0.2}
            rx="3"
            width="18"
            x={x}
            y="19"
          />
        ))}
      </>
    ),
    subir: (
      <>
        <rect fill="currentColor" height="8" opacity=".75" rx="2" width="72" x="14" y="32" />
        {arrow('M50 26v-14M46 16l4-4 4 4')}
      </>
    ),
  }
  return (
    <svg aria-hidden="true" className="ed-thumb__svg" viewBox="0 0 100 56">
      {shapes[value]}
    </svg>
  )
}

/** Desenho fixo: não muda a cada letra digitada, então não redesenha (achado 13.5). */
const AnimThumb = memo(AnimThumbDrawing)

/** Relógio de cada seção tocando, para tocar de novo sem a classe sumir no meio. */
const playing = new WeakMap<HTMLElement, number>()

/** Toca a animação da seção escolhida na prévia, uma vez (a classe some depois de alguns segundos). */
function playSection(id: string) {
  const wrapper = previewDocument()?.querySelector(`[data-puck-component="${CSS.escape(id)}"]`)
  const section = wrapper?.querySelector<HTMLElement>('.anim')
  if (!section) return false
  section.scrollIntoView({ block: 'start' })
  section.classList.remove('anim-play')
  // Lê o tamanho para o navegador "esquecer" a animação anterior e começar do zero.
  void section.offsetWidth
  section.classList.add('anim-play')
  window.clearTimeout(playing.get(section))
  playing.set(
    section,
    window.setTimeout(() => section.classList.remove('anim-play'), PLAY_MS),
  )
  return true
}

/**
 * "Animação" de uma seção, no fim das opções: escolhida por miniatura. Em "Igual ao site", mostra o
 * que isso dá agora ("Marcante: um depois do outro"). "Ver a animação" toca a animação na prévia
 * sem mudar nada no conteúdo.
 */
export function AnimField({
  section,
  name,
  value,
  onChange,
  readOnly,
}: {
  section: AnimatedSection
  name: string
  value: SectionAnim | undefined
  onChange: (value: SectionAnim) => void
  readOnly?: boolean
}) {
  const { site, adminRoute } = useEditor()
  const id = usePuck((s) => s.selectedItem?.props.id as string | undefined)
  const motion = safeMotion(site.motion)
  const current = value ?? 'site'
  const resolved = resolveAnim({ type: section, anim: current }, motion)
  const fromSite = resolveAnim({ type: section, anim: 'site' }, motion)
  const describe = (anim: Anim | 'none') =>
    anim === 'none' ? 'sem animação' : animLabel(section, anim).toLocaleLowerCase('pt-BR')

  const options = sectionAnimValues(section).map((option) => ({
    value: option,
    label:
      option === 'site'
        ? 'Igual ao site'
        : option === 'none'
          ? 'Sem animação'
          : animLabel(section, option),
    hint: option === 'site' ? `${MOTION_LABELS[motion].name}: ${describe(fromSite)}` : undefined,
    thumb: <AnimThumb value={option} />,
  }))

  const play = () => {
    if (resolved === 'none') {
      toast.info('Esta seção está sem animação.')
      return
    }
    if (!id) return
    // No celular o painel cobre a prévia (achado 11.8): ele desce antes, e a animação toca na tela.
    if (window.innerWidth < MOBILE_WIDTH) {
      announceChange('tocando na prévia', { label: 'Animação:', quiet: true })
      window.setTimeout(() => {
        if (!playSection(id)) toast.info('Não deu para achar a seção na prévia.')
      }, 350)
      return
    }
    if (!playSection(id)) toast.info('Não deu para achar a seção na prévia.')
  }

  return (
    <div className="ed-anim">
      <VisualChoiceField
        label="Animação"
        name={name}
        onChange={(next) => onChange(next as SectionAnim)}
        options={options}
        readOnly={readOnly}
        value={current}
      />
      <div className="ed-anim__play">
        <button className="ed-btn ed-anim__button" onClick={play} type="button">
          <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
            <path d="M7 5v14l12-7z" fill="currentColor" />
          </svg>
          Ver a animação
        </button>
        <span className="ed-hint">
          A animação do site muda em{' '}
          <a href={`${panelHref(adminRoute, 'brand')}#mc-animacao`} rel="noopener" target="_blank">
            Sua marca
          </a>
          .
        </span>
      </div>
    </div>
  )
}
