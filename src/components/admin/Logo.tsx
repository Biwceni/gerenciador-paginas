import React from 'react'

import { PRODUCT_NAME } from '../../lib/site'
import { Icon } from './Icon'

// Marca com o nome do produto (logo das telas padrão do Payload que ainda sobram).
export function Logo() {
  return (
    <div className="gp-logo">
      <Icon />
      <span className="gp-logo__name">{PRODUCT_NAME}</span>
    </div>
  )
}
