// Endereço do editor visual, dentro do painel: /admin/editor/<id da página>.
export const EDITOR_VIEW_PATH = '/editor/:id' as const

// Salvamento pelo editor: vai junto, neste cabeçalho, a data da versão em que a pessoa estava
// trabalhando. O servidor recusa se a página já tiver mudado (`rejectStaleSave`).
export const PAGE_VERSION_HEADER = 'x-versao-da-pagina'

/** A versão mais recente da página é mais nova que a versão em que a pessoa estava trabalhando? */
export function isStaleVersion(base: string, latest: string | null | undefined): boolean {
  const baseTime = new Date(base).getTime()
  const latestTime = new Date(latest ?? '').getTime()
  return baseTime < latestTime
}

export function editorPath(adminRoute: string, pageId: number | string): string {
  return `${adminRoute.replace(/\/$/, '')}/editor/${pageId}`
}
