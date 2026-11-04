import React from 'react'

import type { FeatureIconName } from '../schema'

// Ícones dos Destaques (marcador "Ícone"): desenhados em linha, na cor principal do site.

const PATHS: Record<FeatureIconName, React.ReactNode> = {
  tooth: (
    <path d="M7 3c-2.5 0-4 2-4 4.5 0 2.2 1 3.5 1.6 5.8.5 2 .8 7.7 2.9 7.7 1.8 0 1.5-5 4.5-5s2.7 5 4.5 5c2.1 0 2.4-5.7 2.9-7.7.6-2.3 1.6-3.6 1.6-5.8C21 5 19.5 3 17 3c-2 0-3 1.2-5 1.2S9 3 7 3z" />
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14.5c1 1.4 2.4 2 4 2s3-.6 4-2M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect height="16" rx="2" width="18" x="3" y="5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  card: (
    <>
      <rect height="14" rx="2" width="20" x="2" y="5" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  heart: (
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" />
  ),
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  phone: (
    <path d="M5 3h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2L19 13.5V17a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 2-2z" />
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15" />
      <path d="M5 19l7-7" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16.5 9" />
    </>
  ),
  cup: (
    <>
      <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3" />
    </>
  ),
  tool: (
    <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5zM14.5 6.5L17 4l3 3-2.5 2.5M4 20l3-3" />
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10M10 20v-5h4v5" />
    </>
  ),
}

/** Nomes que aparecem na escolha do ícone, no editor. */
export const FEATURE_ICON_LABELS: Record<FeatureIconName, string> = {
  tooth: 'Dente',
  smile: 'Sorriso',
  clock: 'Relógio',
  calendar: 'Calendário',
  card: 'Cartão',
  shield: 'Escudo',
  heart: 'Coração',
  star: 'Estrela',
  phone: 'Telefone',
  pin: 'Local',
  leaf: 'Folha',
  check: 'Certo',
  cup: 'Xícara',
  tool: 'Ferramenta',
  bag: 'Sacola',
  home: 'Casa',
}

export function FeatureIcon({ name }: { name: FeatureIconName }) {
  return (
    <svg
      aria-hidden="true"
      className="features__icon"
      fill="none"
      height="32"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width="32"
    >
      {PATHS[name]}
    </svg>
  )
}

// Ícones do Contato e endereço, no mesmo traço dos Destaques. Os que já existem lá são reaproveitados.
const CONTACT_PATHS = {
  whatsapp: (
    <>
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z" />
      <path d="M9 9.5c.3 2.3 2.2 4.2 4.5 4.5l1-1.2 2 .9c-.3 1-1.2 1.6-2.2 1.5-3.3-.3-6-3-6.3-6.3-.1-1 .5-1.9 1.5-2.2l.9 2z" />
    </>
  ),
  phone: PATHS.phone,
  mail: (
    <>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="M3.5 6.5L12 13l8.5-6.5" />
    </>
  ),
  map: PATHS.pin,
  clock: PATHS.clock,
} satisfies Record<string, React.ReactNode>

export type ContactIconName = keyof typeof CONTACT_PATHS

export function ContactIcon({ name }: { name: ContactIconName }) {
  return (
    <svg
      aria-hidden="true"
      className="contact__icon"
      fill="none"
      height="22"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width="22"
    >
      {CONTACT_PATHS[name]}
    </svg>
  )
}
