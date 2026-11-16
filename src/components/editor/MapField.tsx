'use client'

import React from 'react'

import { mapsURL } from '@/lib/links'
import { panelHref } from '@/lib/panel'

import { useEditor } from './context'

type Props = {
  id: string
  value: boolean | undefined
  onChange: (value: boolean) => void
  readOnly?: boolean
}

/**
 * "Mostrar mapa do endereço" no Contato (Elementor, E9). O endereço vem das Configurações. Sem
 * endereço, a opção fica desligada e diz onde colocar. Com ele, o dono confere o pino no Google
 * Maps (abre numa aba; a página do editor não pede nada ao Google).
 */
export function MapField({ id, value, onChange, readOnly }: Props) {
  const { site, adminRoute } = useEditor()
  const address = site.contact?.address?.trim() ?? ''
  const settings = panelHref(adminRoute, 'settings')

  if (!address) {
    return (
      <div className="ed-devices">
        <label className="ed-switch">
          <input
            aria-describedby={`${id}-why`}
            checked={false}
            disabled
            role="switch"
            type="checkbox"
          />
          Mostrar mapa do endereço
        </label>
        <p className="ed-hint" id={`${id}-why`}>
          Ponha o endereço em{' '}
          <a href={settings} rel="noopener" target="_blank">
            Configurações
          </a>{' '}
          para mostrar o mapa.
        </p>
      </div>
    )
  }

  return (
    <div className="ed-devices">
      <label className="ed-switch">
        <input
          aria-describedby={`${id}-how`}
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.checked)}
          role="switch"
          type="checkbox"
        />
        Mostrar mapa do endereço
      </label>
      <p className="ed-hint" id={`${id}-how`}>
        {address}.{' '}
        <a href={mapsURL(address)} rel="noopener noreferrer" target="_blank">
          Conferir o pino no Google Maps
        </a>
        . Se estiver errado, mude em{' '}
        <a href={settings} rel="noopener" target="_blank">
          Configurações
        </a>
        . No site, o mapa do Google só carrega quando o visitante toca em &ldquo;Ver no mapa&rdquo;.
      </p>
    </div>
  )
}
