import React from 'react'

// Marca do produto (páginas empilhadas), na paleta verde do painel (#0f6b55). Aparece no menu
// lateral, nas telas de entrar e no topo das telas padrão do Payload.
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
      <rect fill="#0f6b55" height="32" rx="9" width="32" />
      <rect fill="#9fd8c2" height="17" rx="2.5" width="13" x="12" y="6" />
      <rect fill="#ffffff" height="17" rx="2.5" width="13" x="7" y="9" />
      <path
        d="M10 15h7M10 18.5h7M10 22h4"
        stroke="#0f6b55"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}
