import React from 'react'

import { PRODUCT_NAME } from '../../lib/site'
import { Icon } from './Icon'

// Aparece na tela de entrar e de recuperar a senha.
export function Logo() {
  return (
    <div className="gp-logo">
      <Icon />
      <span className="gp-logo__name">{PRODUCT_NAME}</span>
    </div>
  )
}
