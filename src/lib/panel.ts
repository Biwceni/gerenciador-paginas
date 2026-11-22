// Telas do painel do leigo (fase 3), com endereços em português.
export const PANEL_PATHS = {
  dashboard: '',
  pages: '/paginas',
  newPage: '/paginas/nova',
  brand: '/sua-marca',
  photos: '/fotos',
  menu: '/menu-e-rodape',
  footer: '/menu-e-rodape',
  settings: '/configuracoes',
  start: '/comecar',
  messages: '/mensagens',
  forms: '/formularios',
  advanced: '/avancado',
  // Endereço padrão do Payload (`admin.routes.account`), com a tela nossa.
  account: '/account',
} as const

export type PanelPath = keyof typeof PANEL_PATHS

export function panelHref(adminRoute: string, path: PanelPath): string {
  return `${adminRoute.replace(/\/$/, '')}${PANEL_PATHS[path]}` || '/'
}

/**
 * Telas padrão do Payload que a tela Avançado mostra. O resto já tem tela nossa. O filtro é aqui, e
 * não com `admin.hidden` nas coleções, porque isso fecharia também as telas e gavetas que as nossas
 * telas usam por baixo.
 */
export const ADVANCED_SCREENS = [
  {
    slug: 'users',
    title: 'Usuários',
    text: 'Lista completa das contas e o tipo de acesso de cada uma. Para convidar, use Configurações, em “Pessoas com acesso”.',
  },
  {
    slug: 'media',
    title: 'Fotos (coleção)',
    text: 'Dados técnicos de cada foto: nome do arquivo, tamanho em pixels e peso.',
  },
] as const

/**
 * Status de uma página como o leigo entende. O rascunho mais recente diz se há mudança salva e não
 * publicada; a versão publicada diz se a página está no ar.
 */
export type PageStatus = 'live' | 'changed' | 'draft'

export function pageStatus(
  latestStatus: 'draft' | 'published' | null | undefined,
  live: boolean,
): PageStatus {
  if (!live) return 'draft'
  return latestStatus === 'draft' ? 'changed' : 'live'
}

export const PAGE_STATUS_LABEL: Record<PageStatus, string> = {
  live: 'No ar',
  changed: 'Alterações não publicadas',
  draft: 'Rascunho',
}

/** "há 5 min", "há 3 h", "há 2 dias": quanto tempo faz desde a data. */
export function timeAgo(date: Date | string, now: number = Date.now()): string {
  const seconds = (now - new Date(date).getTime()) / 1000
  if (seconds < 60) return 'agora mesmo'
  if (seconds < 3600) return `há ${Math.round(seconds / 60)} min`
  if (seconds < 86400) return `há ${Math.round(seconds / 3600)} h`
  const days = Math.round(seconds / 86400)
  return days === 1 ? 'há 1 dia' : `há ${days} dias`
}

/** "Bom dia", "Boa tarde" ou "Boa noite", no horário de Brasília. */
export function greeting(date: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('pt-BR', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'America/Sao_Paulo',
    }).format(date),
  )
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

type Person = { email?: string | null; name?: string | null; role?: string | null }

/** Nome que aparece no pé do menu: o nome da conta ou, sem ele, o começo do e-mail. */
export function personName(person: Person): string {
  return person.name?.trim() || person.email?.split('@')[0] || 'Você'
}

/**
 * "Fábio Ormeni" → "FO"; "Fábio" → "F"; "érica" → "E". Aparece no lugar da foto da conta: sempre
 * sem acento e em maiúscula.
 */
export function personInitials(person: Person): string {
  const words = personName(person)
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
  const letters = words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : words[0][0]
  return letters.toUpperCase()
}

export const ROLE_LABEL: Record<string, string> = {
  admin: 'administrador',
  editor: 'editor',
}

/** "Fábio · administrador". */
export function personLabel(person: Person): string {
  const role = person.role ? ROLE_LABEL[person.role] : null
  return role ? `${personName(person)} · ${role}` : personName(person)
}

type ListedPage = { id: number; title: string; home: boolean }

/**
 * Ordem da lista de páginas: a página inicial no topo, depois as do menu na ordem do menu e, por
 * fim, as que não estão no menu, em ordem alfabética.
 */
export function sortPagesForList<T extends ListedPage>(pages: T[], menuOrder: number[]): T[] {
  const rank = (page: T) => {
    if (page.home) return -1
    const index = menuOrder.indexOf(page.id)
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER
  }
  return [...pages].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.title ?? '').localeCompare(b.title ?? '', 'pt-BR', { sensitivity: 'base' }),
  )
}

/** O que falta para o site ficar pronto de verdade, como o cartão do painel precisa. */
export type FinishInput = {
  tagline: string | null | undefined
  whatsapp: string | null | undefined
  email: string | null | undefined
  /** Páginas que ainda têm texto de exemplo, a primeira é a que o botão abre. */
  examplePages: { id: number; title: string }[]
  /** Quantas páginas usam foto de exemplo. */
  examplePhotoPages: number
  /** Onde o menu e o rodapé ainda têm texto de exemplo ("Rodapé › Frase"), A7. */
  chromeExamples?: string[]
  /** Páginas com foto pequena demais para onde está (borrada no computador). */
  smallPhotoPages?: { id: number; title: string }[]
  home: { id: number; live: boolean } | null
}

export type FinishStep = {
  key: 'tagline' | 'contact' | 'texts' | 'chrome' | 'photos' | 'sharp' | 'home'
  done: boolean
  title: string
  detail?: string
  action: string
  /** Para onde o botão leva: uma tela do painel ou o editor de uma página. */
  target: { screen: PanelPath } | { page: number }
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * Os passos do cartão "Para o site ficar pronto" (segue o `vDashboard` do protótipo): 5 sempre e, com
 * fotos pequenas nas páginas, mais um para trocá-las (redesign v3, entrega 3).
 */
/**
 * Nomes numa frase curta (L1): "Início", "Início e Sobre", "Início, Sobre e Contato", "Início,
 * Sobre e mais 5". Com muitos
 * nomes, o parágrafo inteiro com todos eles cansava a leitura.
 */
export function nameList(names: string[], max = 2): string {
  // "e mais 1" ocupa o mesmo espaço que o nome: com um a mais, vai o nome.
  if (names.length <= max + 1) {
    return names.length > 1
      ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`
      : (names[0] ?? '')
  }
  return `${names.slice(0, max).join(', ')} e mais ${names.length - max}`
}

export function finishSteps(input: FinishInput): FinishStep[] {
  const { examplePages, examplePhotoPages, home } = input
  const smallPages = input.smallPhotoPages ?? []
  const chrome = input.chromeExamples ?? []
  const hasTagline = Boolean(input.tagline?.trim())
  const hasContact = Boolean(input.whatsapp?.trim() || input.email?.trim())
  return [
    {
      key: 'tagline',
      done: hasTagline,
      title: hasTagline ? 'Frase do seu negócio escrita' : 'Escreva a frase do seu negócio',
      detail: 'Ela aparece no Google e no título da página inicial.',
      action: 'Escrever',
      target: { screen: 'settings' },
    },
    {
      key: 'contact',
      done: hasContact,
      title: hasContact ? 'Contato preenchido' : 'Preencha o WhatsApp ou o e-mail',
      detail: 'É por aí que os visitantes falam com você.',
      action: 'Preencher',
      target: { screen: 'settings' },
    },
    {
      key: 'texts',
      done: examplePages.length === 0,
      title: examplePages.length
        ? `Troque os textos de exemplo (${plural(examplePages.length, 'página', 'páginas')})`
        : 'Textos de exemplo trocados',
      detail: examplePages.length
        ? `Ainda com texto de exemplo: ${nameList(examplePages.map((page) => page.title))}.`
        : undefined,
      action: 'Editar',
      target: examplePages[0] ? { page: examplePages[0].id } : { screen: 'pages' },
    },
    // A7: o menu e o rodapé também (antes o texto do modelo ficava lá sem ninguém avisar).
    ...(chrome.length
      ? [
          {
            key: 'chrome',
            done: false,
            title: 'Troque o texto de exemplo do rodapé',
            detail: `Ainda do modelo: ${nameList(
              chrome.map((place) => place.replace(/^Rodapé › /, '').toLowerCase()),
            )} do rodapé.`,
            action: 'Trocar',
            target: { screen: 'menu' },
          } satisfies FinishStep,
        ]
      : []),
    {
      key: 'photos',
      done: examplePhotoPages === 0,
      title: examplePhotoPages
        ? `Coloque suas fotos (${plural(examplePhotoPages, 'página usa', 'páginas usam')} fotos do modelo)`
        : 'Fotos suas no lugar das de exemplo',
      detail: 'Envie as fotos em Fotos e troque nas páginas.',
      action: 'Enviar fotos',
      target: { screen: 'photos' },
    },
    ...(smallPages.length
      ? [
          {
            key: 'sharp',
            done: false,
            title: `Troque as fotos pequenas (${plural(smallPages.length, 'página', 'páginas')})`,
            detail: `Ficam borradas no computador em: ${nameList(smallPages.map((page) => page.title))}. Use fotos com pelo menos 1.600 px.`,
            action: 'Trocar',
            target: { page: smallPages[0].id },
          } satisfies FinishStep,
        ]
      : []),
    {
      key: 'home',
      done: Boolean(home?.live),
      title: home?.live ? 'Site no ar' : 'Publique a página inicial para o site entrar no ar',
      detail: 'Até lá, quem abre o endereço vê um aviso de "em construção".',
      action: 'Abrir',
      target: home ? { page: home.id } : { screen: 'pages' },
    },
  ]
}

/** Filtro das páginas que podem ser destino de link: as arquivadas ficam de fora. */
export const NOT_ARCHIVED = { archived: { not_equals: true } } as const
