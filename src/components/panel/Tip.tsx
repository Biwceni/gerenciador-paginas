import React from 'react'

import { PanelIcon } from './PanelIcon'

/** A caixa de dica do painel e do editor: ícone de interrogação, fundo verde suave e texto. */
export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="gp-tip">
      <PanelIcon name="help" size={18} />
      <span>{children}</span>
    </p>
  )
}
