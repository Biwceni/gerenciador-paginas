import React from 'react'

import type { FeatureIconName } from '../schema'

// Ícones dos Destaques (marcador "Ícone"): desenhados em linha, na cor principal do site, com o
// traço de 1,8 px do resto do site (C3).

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
  // Confeitaria e serviços (entrega 4).
  cake: (
    <>
      <path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" />
      <path d="M4 15c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0M12 11V8M12 4.5c-.8 1-.8 2 0 2.5.8-.5.8-1.5 0-2.5z" />
    </>
  ),
  cupcake: (
    <>
      <path d="M6 12l1.5 8h9L18 12" />
      <path d="M5 12a3 3 0 0 1 1.5-5.6A5.5 5.5 0 0 1 17.5 6.4 3 3 0 0 1 19 12zM10 12l.5 8M14 12l-.5 8" />
    </>
  ),
  paw: (
    <>
      <path d="M12 12c-3 0-5.5 3.2-5.5 5.3 0 1.6 1.3 2.7 2.8 2.7 1.1 0 1.7-.6 2.7-.6s1.6.6 2.7.6c1.5 0 2.8-1.1 2.8-2.7C17.5 15.2 15 12 12 12z" />
      <circle cx="5.5" cy="10" r="1.8" />
      <circle cx="9.5" cy="5.8" r="1.8" />
      <circle cx="14.5" cy="5.8" r="1.8" />
      <circle cx="18.5" cy="10" r="1.8" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.2 8.2L20 19M8.2 15.8L20 5" />
    </>
  ),
  gift: (
    <>
      <rect height="5" rx="1" width="18" x="3" y="8" />
      <path d="M5 13v7h14v-7M12 8v12M12 8c-1-3-4.5-4.5-5.5-2.5S9 8 12 8zM12 8c1-3 4.5-4.5 5.5-2.5S15 8 12 8z" />
    </>
  ),
  truck: (
    <>
      <path d="M2 6h11v10H2zM13 9h4.5l3.5 3.5V16h-8z" />
      <circle cx="6.5" cy="17.5" r="2" />
      <circle cx="17" cy="17.5" r="2" />
    </>
  ),

  // Biblioteca para qualquer ramo (C3).
  chat: (
    <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
  ),
  mail: (
    <>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="M3.5 6.5L12 13l8.5-6.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M15.5 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.2a6.5 6.5 0 0 1 4 5.8" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14L7 22l5-3 5 3-1.5-8" />
    </>
  ),
  lock: (
    <>
      <rect height="10" rx="2" width="14" x="5" y="11" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  sparkle: (
    <path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  ),
  bulb: (
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.1h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
  ),
  camera: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h2.5L9 4h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2l2.4 11h10.8L21 7H6.2" />
      <circle cx="9" cy="19.5" r="1.5" />
      <circle cx="17" cy="19.5" r="1.5" />
    </>
  ),
  store: (
    <path d="M4 12v8h16v-8M3 9l2-5h14l2 5M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 20v-5h4v5" />
  ),
  box: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </>
  ),
  cash: (
    <>
      <rect height="12" rx="2" width="20" x="2" y="6" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M5 3h2M13 3h2M6 3v6a4 4 0 0 0 8 0V3M10 13v2a5 5 0 0 0 10 0v-2" />
      <circle cx="20" cy="11" r="2" />
    </>
  ),
  pill: <path d="M11.7 18.7a4.5 4.5 0 0 1-6.4-6.4l7-7a4.5 4.5 0 0 1 6.4 6.4zM8.8 8.8l6.4 6.4" />,
  syringe: <path d="M14 4l6 6M17 7l-9 9-3 1 1-3 9-9M9.5 11.5l3 3M3 21l3-3M18 2l4 4" />,
  thermometer: <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 9v8" />,
  pulse: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  baby: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 11h.01M15 11h.01M9.5 15c1.5 1.2 3.5 1.2 5 0M12 3c-1 1.5-.5 3 1 3.5" />
    </>
  ),
  plus: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  drop: <path d="M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z" />,
  flower: (
    <path d="M12 21v-8M12 13c-4 0-6-3-6-8 2 0 4 1 6 3 2-2 4-3 6-3 0 5-2 8-6 8zM12 18c-2-1.8-4.5-2-7-1M12 18c2-1.8 4.5-2 7-1" />
  ),
  mirror: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M12 15v6M9 21h6M9.5 7a3 3 0 0 1 2.5-1.5" />
    </>
  ),
  car: (
    <>
      <path d="M5 17H3v-5l2-5h14l2 5v5h-2M3 12h18M9.5 17h5" />
      <circle cx="7.5" cy="17" r="2" />
      <circle cx="16.5" cy="17" r="2" />
    </>
  ),
  bike: (
    <>
      <circle cx="5.5" cy="16" r="3.5" />
      <circle cx="18.5" cy="16" r="3.5" />
      <path d="M5.5 16L9 9h7l2.5 7M12 16L9 9M16 9l-4 7M7.5 6H11" />
    </>
  ),
  fuel: (
    <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3" />
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3L20 3M16 7l3 3M18 5l2 2" />
    </>
  ),
  gauge: (
    <>
      <path d="M3.5 18a9.5 9.5 0 1 1 17 0" />
      <path d="M12 15l4-5" />
      <circle cx="12" cy="15" r="1.5" />
    </>
  ),
  plane: (
    <path d="M10 4.5L12 3l2 1.5v6l7 4v2l-7-2v4l2 1.5V21l-4-1-4 1v-1.5l2-1.5v-4l-7 2v-2l7-4z" />
  ),
  building: (
    <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M3 21h18M8 7h4M8 11h4M8 15h4" />
  ),
  bed: (
    <>
      <path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-8v6" />
      <circle cx="6.5" cy="11.5" r="1.8" />
    </>
  ),
  ruler: <path d="M3 16.5L16.5 3 21 7.5 7.5 21zM6 13.5l2 2M9 10.5l1.5 1.5M12 7.5l2 2" />,
  paint: (
    <>
      <rect height="6" rx="1.5" width="15" x="3" y="3" />
      <path d="M18 6h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-8v3" />
      <rect height="7" rx="1" width="3" x="10.5" y="14" />
    </>
  ),
  tree: <path d="M12 22v-6M12 2L6 10h3l-4 6h14l-4-6h3z" />,
  laptop: (
    <>
      <rect height="11" rx="1.5" width="16" x="4" y="4" />
      <path d="M2 19h20" />
    </>
  ),
  mobile: (
    <>
      <rect height="20" rx="2" width="10" x="7" y="2" />
      <path d="M11 18h2" />
    </>
  ),
  wifi: <path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" />,
  chart: <path d="M3 3v18h18M7 16v-4M11 16V8M15 16v-6M19 16V5" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </>
  ),
  headset: (
    <path d="M4 15v-3a8 8 0 0 1 16 0v3M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1zM20 19a3 3 0 0 1-3 3h-3" />
  ),
  gamepad: (
    <>
      <path d="M6 7h12a4 4 0 0 1 4 4v2.5a3.5 3.5 0 0 1-6.3 2.1L14.5 14h-5l-1.2 1.6A3.5 3.5 0 0 1 2 13.5V11a4 4 0 0 1 4-4z" />
      <path d="M7 9.5v3M5.5 11h3M15.5 10h.01M18 12h.01" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4zM12 3v4.5M16 10.4l4.3-1.6M14.5 15.1l2.6 4M9.5 15.1l-2.6 4M8 10.4L3.7 8.8" />
    </>
  ),
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5v4h-5z" />
  ),
  dumbbell: <path d="M5 7h3v10H5zM16 7h3v10h-3zM2.5 10v4M21.5 10v4M8 12h8" />,
  ticket: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" />
      <path d="M14 5v2M14 11v2M14 17v2" />
    </>
  ),
  book: <path d="M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h14v-4M8 7h8" />,
  cap: <path d="M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" />,
  pencil: <path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" />,
  file: <path d="M6 3h8l5 5v13H6zM14 3v5h5M9 13h6M9 17h6" />,
  cutlery: (
    <path d="M6 3v8a2 2 0 0 0 2 2v8M10 3v8a2 2 0 0 1-2 2M8 3v6M17 21V3c-2 1.5-3 4-3 7v4h3" />
  ),
  pizza: (
    <>
      <path d="M12 3c3.5 0 6.8 1.3 9 3.5L12 21 3 6.5C5.2 4.3 8.5 3 12 3z" />
      <path d="M4.8 9.4c2-1.4 4.5-2.2 7.2-2.2s5.2.8 7.2 2.2" />
      <circle cx="10" cy="12" r="1" />
      <circle cx="14" cy="14" r="1" />
    </>
  ),
  wine: <path d="M7 3h10l-.5 5a4.5 4.5 0 0 1-9 0zM12 12.5V20M8 21h8M7.3 7h9.4" />,
  burger: (
    <path d="M4 11a8 6 0 0 1 16 0zM3 14h18M4 17h16v.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
  ),
  icecream: <path d="M7.5 11l4.5 10 4.5-10M6 11a6 6 0 0 1 12 0z" />,
  apple: (
    <path d="M12 7c-2-1.5-7-1.5-7 4.5C5 16 8 21 10 21c1 0 1.2-.5 2-.5s1 .5 2 .5c2 0 5-5 5-9.5 0-6-5-6-7-4.5zM12 7c0-2 1-3.5 3-4" />
  ),
}

/** Temas da biblioteca de ícones, na ordem dos botões do editor (C3). */
export const ICON_THEMES = [
  ['geral', 'Geral'],
  ['comercio', 'Comércio'],
  ['saude', 'Saúde'],
  ['beleza', 'Beleza'],
  ['veiculos', 'Veículos'],
  ['casa', 'Casa'],
  ['tecnologia', 'Tecnologia'],
  ['esporte', 'Esporte'],
  ['educacao', 'Educação'],
  ['comida', 'Comida'],
] as const

export type IconTheme = (typeof ICON_THEMES)[number][0]

type IconInfo = { label: string; themes: IconTheme[]; words: string }

/**
 * Nome de cada ícone no editor, os temas em que aparece e outras palavras para a busca ("vacina"
 * acha a seringa). Nada de um negócio só: cada ícone serve a vários ramos.
 */
export const ICON_INFO: Record<FeatureIconName, IconInfo> = {
  tooth: { label: 'Dente', themes: ['saude'], words: 'dentista odonto boca' },
  smile: { label: 'Sorriso', themes: ['saude', 'beleza'], words: 'feliz cliente satisfeito' },
  clock: { label: 'Relógio', themes: ['geral'], words: 'horário hora tempo rápido' },
  calendar: { label: 'Calendário', themes: ['geral'], words: 'agenda data marcar evento' },
  card: { label: 'Cartão', themes: ['comercio'], words: 'pagamento crédito débito' },
  shield: {
    label: 'Escudo',
    themes: ['geral', 'saude'],
    words: 'proteção segurança garantia seguro',
  },
  heart: { label: 'Coração', themes: ['geral', 'saude'], words: 'amor cuidado saúde favorito' },
  star: { label: 'Estrela', themes: ['geral'], words: 'qualidade avaliação destaque' },
  phone: { label: 'Telefone', themes: ['geral'], words: 'ligar contato' },
  pin: { label: 'Local', themes: ['geral'], words: 'endereço mapa onde unidade' },
  leaf: {
    label: 'Folha',
    themes: ['comida', 'casa'],
    words: 'natural orgânico planta ecológico vegano',
  },
  check: { label: 'Certo', themes: ['geral'], words: 'feito ok incluso confirmado' },
  cup: { label: 'Xícara', themes: ['comida'], words: 'café chá bebida' },
  tool: {
    label: 'Ferramenta',
    themes: ['casa', 'veiculos'],
    words: 'conserto manutenção reparo oficina',
  },
  bag: { label: 'Sacola', themes: ['comercio'], words: 'compra loja' },
  home: { label: 'Casa', themes: ['casa'], words: 'lar imóvel residência' },
  cake: { label: 'Bolo', themes: ['comida'], words: 'doce festa aniversário confeitaria' },
  cupcake: { label: 'Cupcake', themes: ['comida'], words: 'doce confeitaria bolinho' },
  paw: { label: 'Pata', themes: ['geral'], words: 'pet animal cachorro gato veterinário' },
  scissors: { label: 'Tesoura', themes: ['beleza'], words: 'corte cabelo barbearia salão costura' },
  gift: { label: 'Presente', themes: ['comercio'], words: 'brinde surpresa' },
  truck: { label: 'Entrega', themes: ['comercio'], words: 'frete envio caminhão' },
  chat: { label: 'Atendimento', themes: ['geral'], words: 'conversa mensagem whatsapp suporte' },
  mail: { label: 'E-mail', themes: ['geral'], words: 'carta mensagem contato' },
  user: { label: 'Pessoa', themes: ['geral'], words: 'cliente perfil profissional' },
  users: { label: 'Equipe', themes: ['geral'], words: 'pessoas time família grupo' },
  award: {
    label: 'Prêmio',
    themes: ['geral', 'esporte'],
    words: 'medalha certificado reconhecido',
  },
  lock: {
    label: 'Cadeado',
    themes: ['geral', 'tecnologia'],
    words: 'segurança privacidade sigilo',
  },
  globe: { label: 'Mundo', themes: ['geral', 'tecnologia'], words: 'internet online global site' },
  bolt: { label: 'Raio', themes: ['geral', 'casa'], words: 'rápido energia elétrica' },
  target: { label: 'Alvo', themes: ['geral'], words: 'objetivo meta foco' },
  sparkle: { label: 'Brilho', themes: ['geral', 'beleza'], words: 'novidade limpeza qualidade' },
  bulb: { label: 'Ideia', themes: ['geral', 'educacao'], words: 'lâmpada criatividade' },
  camera: { label: 'Câmera', themes: ['geral'], words: 'foto fotografia' },
  music: { label: 'Música', themes: ['geral'], words: 'som show aula' },
  cart: { label: 'Carrinho', themes: ['comercio'], words: 'compra mercado' },
  store: { label: 'Loja', themes: ['comercio'], words: 'unidade comércio ponto' },
  box: { label: 'Caixa', themes: ['comercio'], words: 'pacote estoque produto' },
  cash: { label: 'Dinheiro', themes: ['comercio'], words: 'pagamento pix preço economia' },
  tag: { label: 'Etiqueta', themes: ['comercio'], words: 'preço desconto promoção oferta' },
  stethoscope: { label: 'Consulta', themes: ['saude'], words: 'médico estetoscópio clínica' },
  pill: { label: 'Remédio', themes: ['saude'], words: 'medicamento farmácia cápsula' },
  syringe: { label: 'Vacina', themes: ['saude'], words: 'seringa injeção aplicação' },
  thermometer: { label: 'Febre', themes: ['saude'], words: 'termômetro temperatura' },
  pulse: { label: 'Exames', themes: ['saude', 'esporte'], words: 'batimento coração check-up' },
  baby: { label: 'Bebê', themes: ['saude'], words: 'criança infantil maternidade' },
  plus: { label: 'Cruz', themes: ['saude'], words: 'saúde farmácia pronto-socorro' },
  eye: { label: 'Olho', themes: ['saude', 'beleza'], words: 'visão óculos oftalmologia ver' },
  drop: { label: 'Gota', themes: ['beleza', 'casa'], words: 'água hidratação limpeza óleo' },
  flower: { label: 'Flor', themes: ['beleza', 'casa'], words: 'jardim floricultura natural' },
  mirror: { label: 'Espelho', themes: ['beleza'], words: 'estética maquiagem salão' },
  car: { label: 'Carro', themes: ['veiculos'], words: 'automóvel veículo concessionária' },
  bike: { label: 'Bicicleta', themes: ['veiculos', 'esporte'], words: 'bike pedal ciclismo' },
  fuel: { label: 'Combustível', themes: ['veiculos'], words: 'posto gasolina abastecer' },
  key: { label: 'Chave', themes: ['veiculos', 'casa'], words: 'aluguel imóvel entrega acesso' },
  gauge: { label: 'Velocímetro', themes: ['veiculos'], words: 'desempenho rapidez potência' },
  plane: { label: 'Avião', themes: ['veiculos'], words: 'viagem turismo voo' },
  building: {
    label: 'Prédio',
    themes: ['casa'],
    words: 'apartamento empresa escritório condomínio',
  },
  bed: { label: 'Cama', themes: ['casa'], words: 'quarto dormitório hotel' },
  ruler: { label: 'Régua', themes: ['casa', 'educacao'], words: 'medida área metragem projeto' },
  paint: { label: 'Pintura', themes: ['casa'], words: 'rolo reforma parede' },
  tree: { label: 'Árvore', themes: ['casa'], words: 'jardim natureza verde' },
  laptop: { label: 'Notebook', themes: ['tecnologia'], words: 'computador sistema online' },
  mobile: { label: 'Celular', themes: ['tecnologia'], words: 'aplicativo app smartphone' },
  wifi: { label: 'Wi-Fi', themes: ['tecnologia'], words: 'internet conexão rede' },
  chart: { label: 'Gráfico', themes: ['tecnologia'], words: 'resultado relatório crescimento' },
  gear: { label: 'Engrenagem', themes: ['tecnologia'], words: 'configuração sistema automação' },
  headset: { label: 'Suporte', themes: ['tecnologia'], words: 'fone atendimento ajuda' },
  gamepad: { label: 'Controle', themes: ['tecnologia'], words: 'jogo game videogame' },
  ball: { label: 'Bola', themes: ['esporte'], words: 'futebol jogo time' },
  trophy: { label: 'Troféu', themes: ['esporte'], words: 'campeão vitória título' },
  dumbbell: { label: 'Treino', themes: ['esporte'], words: 'academia peso halter' },
  ticket: { label: 'Ingresso', themes: ['esporte'], words: 'bilhete evento show sócio' },
  book: { label: 'Livro', themes: ['educacao'], words: 'curso estudo leitura' },
  cap: { label: 'Formatura', themes: ['educacao'], words: 'escola faculdade diploma' },
  pencil: { label: 'Lápis', themes: ['educacao'], words: 'escrever aula desenho' },
  file: {
    label: 'Documento',
    themes: ['educacao', 'geral'],
    words: 'papel contrato arquivo receita',
  },
  cutlery: {
    label: 'Talheres',
    themes: ['comida'],
    words: 'restaurante refeição almoço garfo faca',
  },
  pizza: { label: 'Pizza', themes: ['comida'], words: 'pizzaria lanche' },
  wine: { label: 'Taça', themes: ['comida'], words: 'vinho bebida bar' },
  burger: { label: 'Lanche', themes: ['comida'], words: 'hambúrguer sanduíche' },
  icecream: { label: 'Sorvete', themes: ['comida'], words: 'doce gelato sobremesa' },
  apple: { label: 'Fruta', themes: ['comida', 'saude'], words: 'maçã alimentação nutrição' },
}

/** Nomes que aparecem na escolha do ícone, no editor. */
export const FEATURE_ICON_LABELS = Object.fromEntries(
  Object.entries(ICON_INFO).map(([name, info]) => [name, info.label]),
) as Record<FeatureIconName, string>

/** Letras sem acento e em minúsculas, para a busca achar "saude" em "Saúde". */
export const plainText = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Ícones de um tema que batem com a busca (nome, tema ou outras palavras). */
export function findIcons(query: string, theme: IconTheme | 'todos' = 'todos'): FeatureIconName[] {
  const words = plainText(query).split(/\s+/).filter(Boolean)
  const themeLabel = Object.fromEntries(ICON_THEMES) as Record<IconTheme, string>
  return (Object.keys(ICON_INFO) as FeatureIconName[]).filter((name) => {
    const info = ICON_INFO[name]
    if (theme !== 'todos' && !info.themes.includes(theme)) return false
    const haystack = plainText(
      [info.label, info.words, ...info.themes.map((item) => themeLabel[item])].join(' '),
    )
    return words.every((word) => haystack.includes(word))
  })
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
      strokeWidth="1.8"
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
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="22"
    >
      {CONTACT_PATHS[name]}
    </svg>
  )
}
