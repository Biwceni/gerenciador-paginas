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
