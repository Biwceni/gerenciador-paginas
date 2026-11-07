import { siteIconResponse } from '@/lib/siteIcon'

// Ícone de quem salva o site na tela inicial do celular.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return siteIconResponse(size.width)
}
