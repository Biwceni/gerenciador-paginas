import type { PanelIconName } from '../components/panel/PanelIcon'

// F1: o Começar pergunta o que o site precisa mostrar, no lugar do ramo. Cada escolha vira uma
// página do site (com a seção principal dela) e um atalho na página inicial. As respostas ficam
// guardadas nas Configurações (`start.shows`) e servem para o resto do painel (modelos da Nova
// página, F3) não precisar adivinhar o ramo.

export const SITE_SHOWS = [
  {
    value: 'products',
    label: 'Produtos',
    text: 'Fotos, preço e botão de pedir. Serve também para imóveis, veículos e outros itens com ficha.',
    icon: 'bag',
    page: { title: 'Produtos', slug: 'produtos' },
  },
  {
    value: 'services',
    label: 'Serviços',
    text: 'O que você faz, com preço ou “sob consulta”.',
    icon: 'briefcase',
    page: { title: 'Serviços', slug: 'servicos' },
  },
  {
    value: 'units',
    label: 'Unidades',
    text: 'Endereço, telefone, horário e mapa de cada lugar onde você atende.',
    icon: 'pin',
    page: { title: 'Unidades', slug: 'unidades' },
  },
  {
    value: 'agenda',
    label: 'Agenda',
    text: 'Eventos, turmas, jogos e datas, com os próximos primeiro.',
    icon: 'calendar',
    page: { title: 'Agenda', slug: 'agenda' },
  },
  {
    value: 'team',
    label: 'Equipe',
    text: 'Quem atende, com foto e cargo.',
    icon: 'users',
    page: { title: 'Equipe', slug: 'equipe' },
  },
  {
    value: 'files',
    label: 'Envie um arquivo',
    text: 'Quem visita manda receita, foto ou documento por um formulário.',
    icon: 'upload',
    page: { title: 'Envie um arquivo', slug: 'envie-um-arquivo' },
  },
  {
    value: 'contact',
    label: 'Contato',
    text: 'WhatsApp, e-mail, endereço e um formulário de mensagem.',
    icon: 'mail',
    page: { title: 'Contato', slug: 'contato' },
  },
] as const satisfies readonly {
  value: string
  label: string
  text: string
  icon: PanelIconName
  page: { title: string; slug: string }
}[]

export type SiteShow = (typeof SITE_SHOWS)[number]['value']

export const SITE_SHOW_VALUES = SITE_SHOWS.map((show) => show.value) as SiteShow[]

/** Só as escolhas que existem, sem repetir, na ordem da tela (a ordem das páginas e do menu). */
export function cleanShows(value: unknown): SiteShow[] {
  const list = Array.isArray(value) ? value : []
  return SITE_SHOW_VALUES.filter((show) => list.includes(show))
}

/** Os títulos das páginas que o Começar cria: Início e uma por escolha, na ordem da tela. */
export function showPageTitles(shows: readonly SiteShow[]): string[] {
  return ['Início', ...cleanShows(shows).map((show) => showInfo(show).page.title)]
}

export function showInfo(show: SiteShow) {
  return SITE_SHOWS.find((item) => item.value === show)!
}
