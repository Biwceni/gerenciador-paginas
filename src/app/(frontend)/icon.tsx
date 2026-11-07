import { siteIconResponse } from '@/lib/siteIcon'

// Ícone da aba do navegador, a partir do logo das configurações (ou das iniciais do nome).
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return siteIconResponse(size.width)
}
