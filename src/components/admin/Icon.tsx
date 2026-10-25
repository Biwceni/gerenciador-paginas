import React from 'react'

// Ícone provisório (páginas empilhadas), usado no menu do painel.
export function Icon() {
  return (
    <svg
      aria-hidden="true"
      className="gp-icon"
      fill="none"
      height="32"
      viewBox="0 0 32 32"
      width="32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#1d4ed8" height="22" rx="3" width="18" x="9" y="3" />
      <rect fill="#93c5fd" height="22" rx="3" width="18" x="5" y="7" />
      <path d="M9 14h10M9 18h10M9 22h6" stroke="#1e3a8a" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}
