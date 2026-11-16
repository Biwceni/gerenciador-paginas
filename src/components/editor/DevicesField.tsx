'use client'

import React from 'react'

import type { SectionDevices } from '@/puck/schema'

import { ROOT_ZONE, usePuck } from './puck'

type Props = {
  id: string
  value: SectionDevices | undefined
  onChange: (value: SectionDevices) => void
  readOnly?: boolean
}

/**
 * "Onde aparece" (Elementor, E3): dois interruptores, "Mostrar no computador" e "Mostrar no
 * celular". Os dois não desligam juntos. A primeira seção da página não tem a opção: é o começo
 * da página e o que o Google mede primeiro.
 */
export function DevicesField({ id, value, onChange, readOnly }: Props) {
  const first = usePuck((s) => {
    const selector = s.appState.ui.itemSelector
    return Boolean(
      selector && selector.index === 0 && (!selector.zone || selector.zone === ROOT_ZONE),
    )
  })
  const devices = value ?? 'all'
  const desktop = devices !== 'mobile'
  const mobile = devices !== 'desktop'

  if (first) {
    return (
      <p className="ed-hint" id={`${id}-first`}>
        A primeira seção aparece sempre, no computador e no celular: é o começo da página e o que o
        Google olha primeiro. Para mostrar só num aparelho, use uma seção mais abaixo.
      </p>
    )
  }

  const set = (next: { desktop: boolean; mobile: boolean }) => {
    // Pelo menos um fica ligado (o interruptor que sobrou fica travado).
    if (!next.desktop && !next.mobile) return
    onChange(next.desktop && next.mobile ? 'all' : next.desktop ? 'desktop' : 'mobile')
  }

  return (
    <div className="ed-devices">
      <label className="ed-switch">
        <input
          aria-describedby={!mobile ? `${id}-one` : undefined}
          checked={desktop}
          disabled={readOnly || (desktop && !mobile)}
          onChange={(event) => set({ desktop: event.target.checked, mobile })}
          role="switch"
          type="checkbox"
        />
        Mostrar no computador
      </label>
      <label className="ed-switch">
        <input
          aria-describedby={!desktop ? `${id}-one` : `${id}-seo`}
          checked={mobile}
          disabled={readOnly || (mobile && !desktop)}
          onChange={(event) => set({ desktop, mobile: event.target.checked })}
          role="switch"
          type="checkbox"
        />
        Mostrar no celular
      </label>
      {devices !== 'all' && (
        <p className="ed-hint" id={`${id}-one`}>
          Pelo menos um fica ligado.{' '}
          {devices === 'desktop'
            ? 'No celular, a seção some (o tablet segue o computador).'
            : 'No computador e no tablet, a seção some.'}
        </p>
      )}
      <p className="ed-hint" id={`${id}-seo`}>
        O Google lê o site como no celular: texto escondido no celular conta menos na busca.
      </p>
    </div>
  )
}
