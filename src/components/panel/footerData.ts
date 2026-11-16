import type { Footer } from '@/payload-types'

/** O rodapé como a tela Menu e rodapé mexe nele (com a chamada do fim, R6). */
export type FooterData = {
  text: string
  showMenu: boolean
  showContact: boolean
  showSocial: boolean
  showHours: boolean
  showBackToTop: boolean
  cta: { show: boolean; title: string }
}

/** O rodapé salvo, com o padrão (ligado) no que ainda não existe. */
export function toFooterData(footer: Partial<Footer>): FooterData {
  return {
    text: footer.text ?? '',
    showMenu: footer.showMenu !== false,
    showContact: footer.showContact !== false,
    showSocial: footer.showSocial !== false,
    showHours: footer.showHours !== false,
    showBackToTop: footer.showBackToTop !== false,
    cta: { show: footer.cta?.show !== false, title: footer.cta?.title ?? '' },
  }
}
