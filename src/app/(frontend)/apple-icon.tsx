import { siteIconResponse } from '@/lib/siteIcon'

// Ícone de quem salva o site na tela inicial do celular.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
// Renovado ao publicar (`revalidatePath`); uma vez por dia também, por segurança.
export const revalidate = 86400

export default function AppleIcon() {
  return siteIconResponse(size.width)
}
