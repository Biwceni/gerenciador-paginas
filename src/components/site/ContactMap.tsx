'use client'

import React, { useState } from 'react'

import { mapsURL } from '@/lib/links'

/** Chave da Maps Embed API da plataforma (presa aos domínios dos sites). Sem ela, só o quadro. */
const EMBED_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ?? ''

/** Rota até o endereço no app de mapas: link público, sem API nem chave. */
export const directionsURL = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.replace(/\s+/g, ' ').trim())}`

/** Endereço do mapa embutido (Maps Embed API, modo "place"). */
export const embedURL = (address: string, key: string) =>
  `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(address.replace(/\s+/g, ' ').trim())}&language=pt-BR`

/**
 * Mapa do Contato (Elementor, E9). Primeiro, um quadro desenhado pela página, nas cores do site,
 * com o pino, o endereço, "Ver no mapa" e "Como chegar": nenhum pedido ao Google. "Ver no mapa"
 * troca o quadro pelo mapa do Google (só com a chave; sem ela, abre o Google Maps numa aba). No
 * editor, os botões não fazem nada (só o desenho).
 */
export function ContactMap({ address, editing = false }: { address: string; editing?: boolean }) {
  const [open, setOpen] = useState(false)
  const canEmbed = Boolean(EMBED_KEY)

  if (open && canEmbed) {
    return (
      <div className="contact-map contact-map--open">
        <iframe
          allowFullScreen
          className="contact-map__frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={embedURL(address, EMBED_KEY)}
          title={`Mapa: ${address}`}
        />
        <a
          className="contact-map__route"
          href={directionsURL(address)}
          rel="noopener noreferrer"
          target="_blank"
        >
          Como chegar
        </a>
      </div>
    )
  }

  return (
    <div className="contact-map">
      <svg
        aria-hidden="true"
        className="contact-map__art"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 400 200"
      >
        <rect fill="var(--color-surface)" height="200" width="400" />
        <g
          fill="none"
          stroke="color-mix(in srgb, var(--color-text) 14%, transparent)"
          strokeLinecap="round"
        >
          <path d="M-10 60 C 80 40, 160 90, 260 60 S 380 30, 420 50" strokeWidth="14" />
          <path d="M-10 150 C 90 160, 200 120, 300 150 S 390 170, 420 160" strokeWidth="10" />
          <path d="M120 -10 C 110 60, 150 130, 130 210" strokeWidth="10" />
          <path d="M300 -10 C 290 70, 320 130, 310 210" strokeWidth="8" />
        </g>
        <g transform="translate(200 82)">
          <path
            d="M0 34 C -14 14 -20 4 -20 -6 a20 20 0 0 1 40 0 c0 10 -6 20 -20 40z"
            fill="var(--color-primary)"
          />
          <circle cx="0" cy="-6" fill="var(--color-on-primary)" r="7" />
        </g>
      </svg>
      <div className="contact-map__info">
        <span className="contact-map__address">{address}</span>
        <span className="contact-map__actions">
          {editing ? (
            <>
              <span className="button contact-map__button">Ver no mapa</span>
              <span className="contact-map__route">Como chegar</span>
            </>
          ) : (
            <>
              {canEmbed ? (
                <button
                  className="button contact-map__button"
                  onClick={() => setOpen(true)}
                  type="button"
                >
                  Ver no mapa
                </button>
              ) : (
                <a
                  className="button contact-map__button"
                  href={mapsURL(address)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Ver no mapa
                </a>
              )}
              <a
                className="contact-map__route"
                href={directionsURL(address)}
                rel="noopener noreferrer"
                target="_blank"
              >
                Como chegar
              </a>
            </>
          )}
        </span>
      </div>
    </div>
  )
}
