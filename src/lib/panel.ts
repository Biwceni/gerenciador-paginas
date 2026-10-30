// Telas do painel do leigo (fase 3), com endereços em português.
export const PANEL_PATHS = {
  dashboard: '',
  pages: '/paginas',
  newPage: '/paginas/nova',
  photos: '/fotos',
  menu: '/menu-e-rodape',
  footer: '/menu-e-rodape',
  settings: '/configuracoes',
  start: '/comecar',
  // Telas do plugin de formulários (padrão do Payload).
  messages: '/collections/form-submissions',
  forms: '/collections/forms',
} as const

export type PanelPath = keyof typeof PANEL_PATHS

export function panelHref(adminRoute: string, path: PanelPath): string {
  return `${adminRoute.replace(/\/$/, '')}${PANEL_PATHS[path]}` || '/'
}

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

/** "Fábio Ormeni" → "FO"; "ana" → "AN". Aparece no lugar da foto da conta. */
export function personInitials(person: Person): string {
  const words = personName(person)
    .split(/[\s._-]+/)
    .filter(Boolean)
  const letters =
    words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : words[0].slice(0, 2)
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
    (a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }),
  )
}

/** Filtro das páginas que podem ser destino de link: as arquivadas ficam de fora. */
export const NOT_ARCHIVED = { archived: { not_equals: true } } as const
