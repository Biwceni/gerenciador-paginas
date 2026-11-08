import React from 'react'

// Marca do produto (redesign v3, entrega 5): duas folhas sobrepostas, a da frente com linhas de
// texto, no anil do painel (claro ou escuro). Aparece no menu lateral, nas telas de entrar e no
// topo das telas padrão do Payload. O favicon do /admin é o mesmo desenho (`productFavicon`).
export function Icon() {
  return (
    <svg
      aria-hidden="true"
      className="gp-icon"
      fill="none"
      height="32"
      viewBox="0 0 34 34"
      width="32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="24"
        opacity=".28"
        rx="4"
        style={{ fill: 'var(--gp-accent)' }}
        width="20"
        x="3"
        y="7"
      />
      <rect height="26" rx="4" style={{ fill: 'var(--gp-accent)' }} width="22" x="9" y="3" />
      <path
        d="M14 12h12M14 17h12M14 22h7"
        strokeLinecap="round"
        strokeWidth="2.2"
        style={{ stroke: 'var(--gp-accent-ink)' }}
      />
    </svg>
  )
}
