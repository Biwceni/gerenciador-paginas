import React from 'react'

/**
 * Ícones das redes no rodapé (R4), no mesmo traço dos ícones de contato: desenhos simples, na cor
 * do texto do rodapé, para qualquer personalidade e ramo.
 */
const PATHS: Record<string, React.ReactNode> = {
  instagram: (
    <>
      <rect height="16" rx="4.5" width="16" x="4" y="4" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.6" cy="7.4" fill="currentColor" r="0.6" stroke="none" />
    </>
  ),
  facebook: (
    <path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4a20 20 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.3H8.9v3h2.6V21" />
  ),
  youtube: (
    <>
      <rect height="13" rx="4" width="19" x="2.5" y="5.5" />
      <path d="M10.2 9.2v5.6l4.8-2.8z" />
    </>
  ),
  tiktok: <path d="M14 3.5v11.2a3.3 3.3 0 1 1-3.3-3.3M14 3.5c.4 2.4 2 4 4.6 4.3" />,
  linkedin: (
    <>
      <rect height="16" rx="3" width="16" x="4" y="4" />
      <path d="M8.3 10.5v5.5M8.3 7.8v.1M11.6 16v-5.5M11.6 13c0-1.6 1-2.6 2.2-2.6s2 .8 2 2.4V16" />
    </>
  ),
}

export const SOCIAL_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
}

export function SocialIcon({ name }: { name: string }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width="20"
    >
      {PATHS[name]}
    </svg>
  )
}
