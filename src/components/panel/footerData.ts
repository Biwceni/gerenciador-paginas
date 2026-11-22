import type { Footer } from '@/payload-types'

type FooterColumnRow = NonNullable<Footer['columns']>[number]
/** Coluna de links própria do rodapé (M1), como o Payload guarda. */
export type FooterColumnData = {
  id: string
  title: string
  links: {
    id: string
    label: string
    link: NonNullable<FooterColumnRow['links']>[number]['link']
  }[]
}

/** O rodapé como a tela Menu e rodapé mexe nele (com a chamada do fim, R6). */
export type FooterData = {
  text: string
  showMenu: boolean
  showContact: boolean
  showSocial: boolean
  showHours: boolean
  showBackToTop: boolean
  cta: { show: boolean; title: string }
  columns: FooterColumnData[]
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
    columns: (footer.columns ?? []).map((column, index) => ({
      id: column.id ?? `coluna-${index}`,
      title: column.title ?? '',
      links: (column.links ?? []).map((item, linkIndex) => ({
        id: item.id ?? `link-${index}-${linkIndex}`,
        label: item.label ?? '',
        link: item.link,
      })),
    })),
  }
}
