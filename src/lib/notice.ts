/**
 * Aviso no alto do site (extra do A2): uma frase curta em todas as páginas, acima do topo, com um
 * dia opcional para sair do ar. O dia vale até o fim dele no horário de Brasília.
 */
export const NOTICE_MAX = 90

/** Fim do dia escolhido (23:59:59 em Brasília), em milissegundos; sem dia, nunca vence. */
export function noticeEnd(until: string | null | undefined): number | null {
  if (!until) return null
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(until)?.[1]
  if (!day) return null
  const end = Date.parse(`${day}T23:59:59.999-03:00`)
  return Number.isNaN(end) ? null : end
}

/** O texto do aviso, quando há texto e o dia não passou. */
export function activeNotice(
  notice: { text?: string | null; until?: string | null } | null | undefined,
  now = Date.now(),
): { text: string; end: number | null } | null {
  const text = notice?.text?.replace(/\s+/g, ' ').trim()
  if (!text) return null
  const end = noticeEnd(notice?.until)
  if (end !== null && now > end) return null
  return { text, end }
}
