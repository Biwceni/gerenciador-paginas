// Endereço do editor visual, dentro do painel: /admin/editor/<id da página>.
export const EDITOR_VIEW_PATH = '/editor/:id' as const

export function editorPath(adminRoute: string, pageId: number | string): string {
  return `${adminRoute.replace(/\/$/, '')}/editor/${pageId}`
}
