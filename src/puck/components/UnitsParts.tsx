'use client'

import React, { useEffect, useState } from 'react'

import { directionsURL, embedURL } from '@/components/site/ContactMap'
import { todayInBrazil } from '@/lib/events'
import { mapsURL } from '@/lib/links'
import { shortDate, type SpecialDay, specialHoursText, upcomingSpecials } from '@/lib/units'

/** Chave da Maps Embed API da plataforma. Sem ela, "Ver no mapa" abre o Google Maps numa aba. */
const EMBED_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ?? ''

/**
 * "Ver no mapa" e "Como chegar" de uma unidade (D1). O mapa do Google só carrega depois do toque,
 * dentro do próprio cartão: a lista de unidades continua inteira à vista. No editor, só o desenho.
 */
export function UnitMap({
  address,
  name,
  editing = false,
}: {
  address: string
  name: string
  editing?: boolean
}) {
  const [open, setOpen] = useState(false)
  if (editing) {
    return (
      <span className="unit__actions">
        <span className="button unit__map-button">Ver no mapa</span>
        <span className="unit__route">Como chegar</span>
      </span>
    )
  }
  return (
    <>
      <span className="unit__actions">
        {EMBED_KEY ? (
          <button
            aria-expanded={open}
            aria-label={`${open ? 'Fechar o mapa' : 'Ver no mapa'}: ${name}`}
            className="button unit__map-button"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? 'Fechar o mapa' : 'Ver no mapa'}
          </button>
        ) : (
          <a
            aria-label={`Ver no mapa: ${name}`}
            className="button unit__map-button"
            href={mapsURL(address)}
            rel="noopener noreferrer"
            target="_blank"
          >
            Ver no mapa
          </a>
        )}
        <a
          aria-label={`Como chegar: ${name}`}
          className="unit__route"
          href={directionsURL(address)}
          rel="noopener noreferrer"
          target="_blank"
        >
          Como chegar
        </a>
      </span>
      {open && EMBED_KEY && (
        <iframe
          allowFullScreen
          className="unit__frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={embedURL(address, EMBED_KEY)}
          title={`Mapa: ${name}`}
        />
      )}
    </>
  )
}

/**
 * Os próximos feriados e horários especiais da unidade. A página é gerada uma vez e fica pronta,
 * então o navegador confere de novo o dia de hoje: o que já passou some sozinho.
 */
export function UnitSpecials({
  specials,
  today: serverToday,
  editing = false,
}: {
  specials: SpecialDay[]
  today: string
  editing?: boolean
}) {
  const [today, setToday] = useState(serverToday)
  useEffect(() => {
    // O dia de hoje no navegador, depois de abrir (a página pode ter sido gerada dias antes).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(todayInBrazil(new Date()))
  }, [])
  const shown = editing ? specials.slice(0, 6) : upcomingSpecials(specials, today)
  if (!shown.length) return null
  return (
    <div className="unit__specials">
      <span className="unit__label">Horário especial</span>
      <ul>
        {shown.map((special) => (
          <li key={special.date}>
            <time dateTime={special.date}>{shortDate(special.date)}</time>
            {special.label && ` ${special.label}`}: <b>{specialHoursText(special)}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
