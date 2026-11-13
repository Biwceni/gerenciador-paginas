import type { PuckPageData } from '@/puck/schema'

/**
 * Cópia do que está na tela, guardada no aparelho quando não deu para salvar (sem internet, erro,
 * sessão encerrada, conflito) ou quando a pessoa sai com mudança pendente. Ao abrir a página de
 * novo, o editor oferece recuperar. O salvamento continua sendo da página inteira ou nada: a cópia
 * só existe para nada se perder.
 */
export type LocalCopy = { data: PuckPageData; at: string }

const key = (pageId: number) => `gp-editor-copia-${pageId}`

export function readLocalCopy(pageId: number): LocalCopy | null {
  try {
    const raw = window.localStorage.getItem(key(pageId))
    if (!raw) return null
    const copy = JSON.parse(raw) as Partial<LocalCopy>
    return copy.data && Array.isArray(copy.data.content) && typeof copy.at === 'string'
      ? (copy as LocalCopy)
      : null
  } catch {
    return null
  }
}

export function writeLocalCopy(pageId: number, data: PuckPageData) {
  try {
    window.localStorage.setItem(
      key(pageId),
      JSON.stringify({ data, at: new Date().toISOString() } satisfies LocalCopy),
    )
  } catch {
    // Sem espaço ou sem permissão: o aviso de não salvo continua na tela.
  }
}

export function clearLocalCopy(pageId: number) {
  try {
    window.localStorage.removeItem(key(pageId))
  } catch {
    // Nada a fazer.
  }
}
